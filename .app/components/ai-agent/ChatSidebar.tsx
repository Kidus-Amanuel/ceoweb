"use client";

import React from "react";
import Link from "next/link";
import { useChatStore } from "@/store/chat-store";

export default function ChatSidebar() {
  const conversations = useChatStore((s) => s.conversations);
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Conversations</h2>
      <ul className="space-y-1">
        {conversations.map((c) => (
          <li key={c.id}>
            <Link href={`/dashboard/ai-agent/${c.id}`}
              className="block px-2 py-1 rounded hover:bg-gray-100">
              {c.name || c.participants.map((p) => p.name).join(", ")}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
