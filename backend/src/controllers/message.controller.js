// message.controller.js
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import mongoose from "mongoose";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { encrypt, decrypt } from "../lib/encryption.js";

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
    const { userId } = req.params; // Changed to use userId directly from params
    const loggedInUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: loggedInUserId, receiverId: new mongoose.Types.ObjectId(userId) },
        { senderId: new mongoose.Types.ObjectId(userId), receiverId: loggedInUserId },
      ],
    }).sort({ createdAt: 1 });

    // Decrypt messages before sending them to the frontend
    const decryptedMessages = messages.map((msg) => {
      const decryptedText = msg.text ? decrypt(msg.text) : "";
      return {
        ...msg._doc,
        text: decryptedText,
      };
    });

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.userId;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const encryptedText = encrypt(text); // This is where you encrypt the message

    const newMessage = new Message({
      senderId,
      receiverId,
      text: encryptedText,
      image,
    });

    await newMessage.save();
    
    // Decrypt the message for the real-time update
    const decryptedMessage = {
      ...newMessage._doc,
      text: text, // Use the original unencrypted text for the socket event
    };

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('newMessage', decryptedMessage);
    }
    
    // If the sender has their chat open with the receiver, update their chat as well
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId && senderSocketId !== receiverSocketId) {
      io.to(senderSocketId).emit('newMessage', decryptedMessage);
    }

    res.status(201).json(decryptedMessage); // Return the unencrypted message to sender
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};