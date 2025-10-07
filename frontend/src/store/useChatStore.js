// useChatStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
// Encryption is handled by the backend

export const useChatStore = create(
  persist(
    (set, get) => ({
      messages: [],
      users: [],
      selectedUser: null,
      isUsersLoading: false,
      isMessagesLoading: false,
      _hasHydrated: false, // Track hydration

      sendMessage: async (messageData) => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        try {
          // Optimistically update the UI
          const tempId = Date.now();
          const newMessage = {
            ...messageData,
            _id: tempId,
            senderId: useAuthStore.getState().authUser._id,
            receiverId: selectedUser._id,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ messages: [...state.messages, newMessage] }));

          await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to send message.");
          // Revert optimistic update on failure if desired
          set((state) => ({ messages: state.messages.filter(msg => msg._id !== tempId) }));
        }
      },

      getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
          const res = await axiosInstance.get(`/messages/${userId}`);
          // Messages are already decrypted by the backend
          set({ messages: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to fetch messages.");
        } finally {
          set({ isMessagesLoading: false });
        }
      },

      getUsers: async () => {
        set({ isUsersLoading: true });
        try {
          const res = await axiosInstance.get("/messages/users");
          set({ users: res.data });
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to fetch users.");
        } finally {
          set({ isUsersLoading: false });
        }
      },

      subscribeToMessages: () => {
        const { selectedUser } = get();
        if (!selectedUser) return;

        const socket = useAuthStore.getState().socket;

        socket.on("newMessage", (newMessage) => {
          if (!newMessage.senderId || !newMessage.receiverId) return;

          const myId = useAuthStore.getState().authUser._id;
          const isForSelectedChat =
            (newMessage.senderId === selectedUser._id && newMessage.receiverId === myId) ||
            (newMessage.receiverId === selectedUser._id && newMessage.senderId === myId);

          if (!isForSelectedChat) return;

          // Check if message already exists to prevent duplicates
          const existingMessages = get().messages;
          const messageExists = existingMessages.some(msg => 
            msg._id === newMessage._id || 
            (msg.senderId === newMessage.senderId && 
             msg.receiverId === newMessage.receiverId && 
             msg.text === newMessage.text && 
             Math.abs(new Date(msg.createdAt) - new Date(newMessage.createdAt)) < 1000) // Within 1 second
          );

          if (!messageExists) {
            // Messages from socket are already decrypted by the backend
            set({
              messages: [...existingMessages, newMessage],
            });
          }
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