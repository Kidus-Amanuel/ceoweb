"use client";

import { useEffect, useRef, useMemo } from "react";
import { useChatStore } from "@/store/chat-store";
import { MessageBubble } from "./MessageBubble";
import { Bot, MessageCircle } from "lucide-react";
import { format, isSameDay } from "date-fns";

export function MessageList() {
  const { activeConversationId, messages, conversations } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );

  const conversationMessages = useMemo(() => {
    return activeConversationId ? messages[activeConversationId] || [] : [];
  }, [activeConversationId, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // Empty state - no conversation selected
  if (!activeConversationId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background/30">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <MessageCircle className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Select a conversation
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose a conversation from the sidebar to start messaging, or
              create a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - conversation selected but no messages
  if (conversationMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/30 px-4">
        <div className="text-center space-y-4 max-w-md">
          {activeConversation?.type === "ai" ? (
            <>
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600  flex items-center justify-center shadow-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {activeConversation.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your AI assistant is ready to help. Ask anything!
                </p>
              </div>
              {/* Suggested prompts */}
              <div className="flex flex-wrap gap-2 justify-center mt-6">
                <button className="px-3 py-1.5 text-xs rounded-full bg-accent hover:bg-accent/80 transition-colors">
                  Analyze sales data
                </button>
                <button className="px-3 py-1.5 text-xs rounded-full bg-accent hover:bg-accent/80 transition-colors">
                  Generate report
                </button>
                <button className="px-3 py-1.5 text-xs rounded-full bg-accent hover:bg-accent/80 transition-colors">
                  Schedule meeting
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {activeConversation?.name?.charAt(0) ||
                    activeConversation?.participants[0]?.name?.charAt(0)}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {activeConversation?.name ||
                    activeConversation?.participants
                      .map((p) => p.name)
                      .join(", ")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Render messages with date separators

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 bg-background/30 scroll-smooth"
    >
      <div className="max-w-4xl mx-auto space-y-2">
        {conversationMessages.map((message, index) => {
          const messageDate = new Date(message.createdAt);
          const prevMessage =
            index > 0 ? conversationMessages[index - 1] : null;
          const showDateSeparator =
            !prevMessage ||
            !isSameDay(new Date(prevMessage.createdAt), messageDate);
          const showAvatar =
            !prevMessage || prevMessage.senderId !== message.senderId;

          const isMe = message.senderId === "me";
          const sender = activeConversation?.participants.find(
            (p) => p.id === message.senderId,
          );

          return (
            <div key={message.id}>
              {/* Date Separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center my-6">
                  <div className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {format(messageDate, "MMMM d, yyyy")}
                  </div>
                </div>
              )}

              {/* Message */}
              <MessageBubble
                message={message}
                isMe={isMe}
                sender={sender}
                showAvatar={showAvatar}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
