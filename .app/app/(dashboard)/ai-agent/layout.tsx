import React from "react";
import ChatSidebar from "@/components/ai-agent/ChatSidebar";

export const metadata = {
  title: "AI Agent",
};

export default function AIAgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <aside className="w-64 border-r p-4">
        <ChatSidebar />
      </aside>
      <main className="flex-1 p-4 overflow-auto">{children}</main>
    </div>
  );
}
