"use client";

import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "../view/MessageList";
import { ChatInput } from "../input/ChatInput";

export function ChatContainer() {
  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - Conversation List */}
      <ChatSidebar />

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <ChatHeader />
        <MessageList />
        <ChatInput />
      </div>
    </div>
  );
}
