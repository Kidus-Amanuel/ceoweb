"use client";

import { ChatLayout } from "@/components/chat/layout/ChatLayout";

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden">
      <ChatLayout />
    </div>
  );
}
