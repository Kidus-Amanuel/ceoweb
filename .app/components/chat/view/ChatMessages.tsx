"use client";

import { useRef, useEffect } from "react";
import { MessageItem } from "./MessageItem";

interface ChatMessagesProps {
  messages: any[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
      {messages.map((msg, i) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isLast={i === messages.length - 1}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
