import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getMessages = async (req, res) => {
   try {
    console.log("🔍 Backend getMessages called:");
    console.log("Requester (req.user._id):", req.user._id);
    console.log("Chatting with (req.params.userId):", req.params.userId);
    
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id },
      ],
    }).sort({ createdAt: 1 });

    // Decrypt messages before sending them to the frontend
    const decryptedMessages = messages.map((msg) => ({
      ...msg._doc,
      text: decrypt(msg.text),
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, receiverId } = req.body;
    const senderId = req.user._id;

    // Encrypt the text before saving it to the database
    const encryptedText = encrypt(text);

    const newMessage = new Message({
      senderId,
      receiverId,
      text: encryptedText,
    });

    await newMessage.save();

    // Decrypt the message to send back to frontend
    const decryptedMessage = {
      ...newMessage._doc,
      text: decrypt(newMessage.text), // 💥 Decrypt here for both sender & receiver
    };

    // Emit the decrypted message to both sender and receiver via WebSockets
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', decryptedMessage);
    }

    io.to(req.user.socketId).emit('newMessage', decryptedMessage);

    res.status(201).json(decryptedMessage);
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
