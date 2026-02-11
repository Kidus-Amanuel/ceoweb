import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Message, Conversation, ChatState, MessageType } from "@/types/chat";

// Mock data (replace with API calls in the future)
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "dm-1",
    type: "dm",
    participants: [
      {
        id: "u2",
        name: "Alice Marketing",
        status: "online",
        avatar: "/avatars/alice.png",
      },
    ],
    unreadCount: 2,
    lastMessage: {
      id: "m1",
      senderId: "u2",
      content: "Can you review the Q3 report?",
      createdAt: new Date().toISOString(),
      type: "text",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "g-1",
    type: "group",
    name: "Product Launch Team",
    participants: [
      { id: "u2", name: "Alice", status: "online" },
      { id: "u3", name: "Bob Dev", status: "busy" },
    ],
    unreadCount: 0,
    lastMessage: {
      id: "m2",
      senderId: "u3",
      content: "Deployment scheduled for Friday.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      type: "text",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ai-1",
    type: "ai",
    name: "CEO Assistant",
    participants: [{ id: "ai", name: "AI Agent", status: "online" }],
    unreadCount: 0,
    lastMessage: {
      id: "m3",
      senderId: "ai",
      content: "I've analyzed the sales data for you.",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      type: "text",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "dm-1": [
    {
      id: "m0",
      senderId: "me",
      content: "Hey Alice, how's the report coming along?",
      createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      type: "text",
      readBy: ["u2"],
    },
    {
      id: "m1",
      senderId: "u2",
      content: "Almost done. Just finalizing the charts.",
      createdAt: new Date(Date.now() - 40000).toISOString(),
      type: "text",
    },
    {
      id: "m2",
      senderId: "u2",
      content: "Can you review the Q3 report?",
      createdAt: new Date().toISOString(),
      type: "text",
    },
  ],
  "ai-1": [
    {
      id: "ai-m1",
      senderId: "ai",
      content: "Hello! How can I assist you with your business today?",
      createdAt: new Date(Date.now() - 100000).toISOString(),
      type: "text",
    },
  ],
};

interface ChatActions {
  setActiveConversation: (id: string | null) => void;
  sendMessage: (
    conversationId: string,
    content: string,
    type?: "text" | "file" | "audio",
  ) => void;
  markAsRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  setSearchQuery: (query: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatState & ChatActions>()(
  devtools(
    persist(
      (set, get) => ({
        conversations: MOCK_CONVERSATIONS,
        activeConversationId: null,
        messages: MOCK_MESSAGES,
        typingUsers: {},
        searchQuery: "",

        setActiveConversation: (id) => set({ activeConversationId: id }),

        sendMessage: (
          conversationId,
          content,
          type: "text" | "image" | "file" | "audio" = "text",
        ) => {
          const newMessage: Message = {
            id: `msg-${Date.now()}`,
            senderId: "me", // Current user
            content,
            createdAt: new Date().toISOString(),
            type: type as MessageType,
            readBy: [],
          };

          set((state) => {
            const currentMessages = state.messages[conversationId] || [];

            // Update last message in conversation list
            const updatedConversations = state.conversations
              .map((conv) => {
                if (conv.id === conversationId) {
                  return {
                    ...conv,
                    lastMessage: newMessage,
                    updatedAt: new Date().toISOString(),
                  };
                }
                return conv;
              })
              .sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime(),
              );

            return {
              messages: {
                ...state.messages,
                [conversationId]: [...currentMessages, newMessage],
              },
              conversations: updatedConversations,
            };
          });

          // Simulate AI response for AI chat
          const conversation = get().conversations.find(
            (c) => c.id === conversationId,
          );
          if (conversation?.type === "ai") {
            setTimeout(() => {
              const aiMessage: Message = {
                id: `ai-msg-${Date.now()}`,
                senderId: "ai",
                content:
                  "This is a simulated AI response. I'm processing your request.",
                createdAt: new Date().toISOString(),
                type: "text",
              };

              set((state) => ({
                messages: {
                  ...state.messages,
                  [conversationId]: [
                    ...(state.messages[conversationId] || []),
                    aiMessage,
                  ],
                },
              }));
            }, 1000);
          }
        },

        markAsRead: (conversationId) => {
          set((state) => ({
            conversations: state.conversations.map((conv) =>
              conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
            ),
          }));
        },

        togglePin: (conversationId) => {
          set((state) => ({
            conversations: state.conversations.map((conv) =>
              conv.id === conversationId
                ? { ...conv, isPinned: !conv.isPinned }
                : conv,
            ),
          }));
        },

        deleteConversation: (conversationId) => {
          set((state) => ({
            conversations: state.conversations.filter(
              (c) => c.id !== conversationId,
            ),
            activeConversationId:
              state.activeConversationId === conversationId
                ? null
                : state.activeConversationId,
          }));
        },

        setSearchQuery: (query) => set({ searchQuery: query }),

        setTyping: (conversationId, isTyping) => {
          set((state) => {
            const currentTypers = state.typingUsers[conversationId] || [];
            return {
              typingUsers: {
                ...state.typingUsers,
                [conversationId]: isTyping ? ["User"] : [],
              },
            };
          });
        },
        // Should integrate with backend searching
      }),
      {
        name: "chat-storage",
        partialize: (state) => ({
          // Only persist UI state, not messages potentially?
          // For now, persist conversations to keep the demo state.
          conversations: state.conversations,
        }),
      },
    ),
  ),
);
