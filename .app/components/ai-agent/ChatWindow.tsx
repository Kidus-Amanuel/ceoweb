"use client";

import React, { useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { Message } from "@/types/chat";
import { AIMarkupRenderer } from "@/components/chat/view/AIMarkupRenderer";

interface ChatWindowProps {
  conversationId: string;
}

const handleButtonClick = (action: string) => {
  console.log("Button clicked with action:", action);
  // TODO: Implement button actions
  alert(`Button action: ${action}`);
};

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const messages = useChatStore((s) => s.messages[conversationId] || []);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [input, setInput] = useState("");

  const addMessage = useChatStore((s) => s.addMessage);
  const appendToMessage = useChatStore((s) => s.appendToMessage);

  const handleAutofill = (text: string) => {
    setInput(text);
  };

  // track streaming message ids so we can show a typing/loading indicator
  const [streamingIds, setStreamingIds] = useState<Record<string, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // create a trace id for this exchange (visible in client + server logs)
    const traceId = `trace-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // prepare history including current message (before sending to ensure consistency)
    const history = [
      ...messages.map((m) => ({
        role: m.senderId === "ai" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: text },
    ];

    // add user message
    sendMessage(conversationId, text);
    setInput("");

    // create placeholder AI message with unique id
    const aiId = `ai-msg-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const aiMessage: Message = {
      id: aiId,
      senderId: "ai",
      content: "",
      createdAt: new Date().toISOString(),
      type: "text",
    };
    addMessage(conversationId, aiMessage);
    // mark as streaming so UI can show typing indicator
    setStreamingIds((s) => ({ ...s, [aiId]: true }));

    try {
      console.debug(
        "[ChatWindow] invoking /api/ai/agent with history length",
        history.length,
        "traceId",
        traceId,
      );
      const res = await fetch("/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, traceId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(
          "[ChatWindow] /api/ai/agent returned non-ok",
          res.status,
          text,
        );
        appendToMessage(
          conversationId,
          aiId,
          ` [error: ${res.status}] ${text}`,
        );
        setStreamingIds((s) => {
          const copy = { ...s };
          delete copy[aiId];
          return copy;
        });
        return;
      }

      const data = await res.json();
      if (data.content) {
        appendToMessage(conversationId, aiId, data.content);
      } else {
        appendToMessage(conversationId, aiId, "No response received");
      }

      setStreamingIds((s) => {
        const copy = { ...s };
        delete copy[aiId];
        return copy;
      });
    } catch (err) {
      appendToMessage(conversationId, aiId, " [error fetching response]");
      console.error("AI stream error", err);
      setStreamingIds((s) => {
        const copy = { ...s };
        delete copy[aiId];
        return copy;
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((m: Message) => (
          <div key={m.id} className="mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    m.senderId === "ai"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {m.senderId === "ai" ? "AI" : "ME"}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {m.senderId === "ai" ? "CEO Assistant" : "You"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  {m.senderId === "ai" ? (
                    <AIMarkupRenderer
                      content={m.content}
                      onAutofill={handleAutofill}
                    />
                  ) : (
                    m.content
                  )}
                  {m.senderId === "ai" && streamingIds[m.id] ? (
                    <div className="inline-flex items-center ml-2 mt-2">
                      <span className="text-gray-500 mr-1">Thinking</span>
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce mr-1"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce mr-1"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-r-lg hover:bg-blue-600 transition-colors font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
