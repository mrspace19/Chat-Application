import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { decryptMessage, encryptMessage } from "../lib/encryption";

export const useChatStore = create(
  persist(
    (set, get) => ({
      messages: [],
      users: [],
      selectedUser: null,
      isUsersLoading: false,
      isMessagesLoading: false,
      _hasHydrated: false, // Track hydration

      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set({ users: res.data });
        } catch (error) {
          toast.error(error.response.data.message);
        } finally {
          set({ isUsersLoading: false });
        }
      },

      getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          const decryptedMessages = res.data.map((msg) => ({
            ...msg,
            text: decryptMessage(msg.text),
          }));
          set({ messages: decryptedMessages });
        } catch (error) {
          toast.error(error.response.data.message);
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        try {
          const encryptedText = encryptMessage(messageData.text);
          const res = await axiosInstance.post(`/messages/send`, {
            ...messageData,
            text: encryptedText,
            receiverId: selectedUser._id,
          });
          const decryptedMessage = {
            ...res.data,
            text: messageData.text,
          };
          set({ messages: [...messages, decryptedMessage] });
        } catch (error) {
          toast.error(error.response.data.message);
        }
      },

      subscribeToMessages: () => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        const socket = useAuthStore.getState().socket;

        socket.on("newMessage", (newMessage) => {
          if (!newMessage.senderId || !newMessage.receiverId) return;

          const myId = useAuthStore.getState().authUser._id;
          const isForMe =
            newMessage.senderId === selectedUser._id ||
            newMessage.receiverId === selectedUser._id;

          if (!isForMe) return;

          const decryptedMessage = {
            ...newMessage,
            text: newMessage.text ? decryptMessage(newMessage.text) : "",
          };

          set({
            messages: [...get().messages, decryptedMessage],
          });
        });
      },

      unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        socket.off("newMessage");
      },

      setSelectedUser: (selectedUser) => set({ selectedUser }),
    }),
    {
      name: "chat-store",
      partialize: (state) => ({ selectedUser: state.selectedUser }),
      onRehydrateStorage: () => (state) => {
        state._hasHydrated = true; 
      },
    }
  )
);
