export type MessageType = "text" | "image" | "file" | "audio" | "system";
export type ChatType = "dm" | "group" | "ai" | "channel";

export interface User {
  id: string;
  name: string;
  avatar?: string;
  status: "online" | "offline" | "busy" | "away";
}

export interface Attachment {
  id: string;
  type: "image" | "file" | "audio";
  url: string;
  name: string;
  size?: string;
  duration?: number; // for audio
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string; // ISO string
  type: MessageType;
  attachments?: Attachment[];
  reactions?: Record<string, string[]>; // emoji -> userIds
  replyToId?: string;
  readBy?: string[];
}

export interface Conversation {
  id: string;
  type: ChatType;
  name?: string; // for groups/channels
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  typingUsers: Record<string, string[]>; // conversationId -> userNames
  searchQuery: string;
}
