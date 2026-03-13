"use client";

import { useState, useEffect, useRef } from "react";
import { Message } from "@/types/chat";
// import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "../view/ChatMessages";
import { ChatInput } from "../input/ChatInput";
import { AIDashboardCard } from "../view/AIDashboardCard";
import { useChatStore } from "@/store/chat-store";
import { useLayoutStore } from "@/store/layout-store";
import { PhoneCall, Video } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { useTranslation } from "react-i18next";

export function ChatLayout() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"chat" | "ai" | "calls">("chat");
  const [inputValue, setInputValue] = useState("");
  const {
    activeConversationId,
    conversations,
    messages,
    sendMessage,
    addMessage,
    appendToMessage,
  } = useChatStore();
  const { rightSidebarWidth, toggleRightSidebar } = useLayoutStore();

  // Create stable random seed and timestamp on mount
  const randomSeedRef = useRef<string | null>(null);
  const mountTimeRef = useRef<number | null>(null);
  useEffect(() => {
    randomSeedRef.current = Math.random().toString(36).substr(2, 9);
    mountTimeRef.current = Date.now();
  }, []);

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations.find((c) => c.type === "ai");
  const currentMessages = messages[activeConv?.id || ""] || [];

  const handleSend = async () => {
    if (!inputValue.trim() || !activeConv) return;

    // For AI conversations, we need to call the AI agent API
    if (activeTab === "ai" || activeConv.type === "ai") {
      // Add user message to chat store
      sendMessage(activeConv.id, inputValue);
      setInputValue("");

      // Create trace id for debugging
      const traceId = `trace-${randomSeedRef.current}-${mountTimeRef.current}`;

      // Create placeholder AI message
      const aiId = `ai-msg-${randomSeedRef.current}-${mountTimeRef.current}`;
      const aiMessage: Message = {
        id: aiId,
        senderId: "ai",
        content: "",
        createdAt: new Date().toISOString(),
        type: "text",
      };

      // Add placeholder message to chat
      addMessage(activeConv.id, aiMessage);

      try {
        // Prepare history for API - include the new user message
        const history = [
          ...currentMessages.map((m) => ({
            role: m.senderId === "ai" ? "assistant" : "user",
            content: m.content,
          })),
          {
            role: "user",
            content: inputValue,
          },
        ];

        console.debug(
          "[ChatLayout] invoking /api/ai/agent with history length",
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
            "[ChatLayout] /api/ai/agent returned non-ok",
            res.status,
            text,
          );
          appendToMessage(
            activeConv.id,
            aiId,
            ` [error: ${res.status}] ${text}`,
          );
          return;
        }

        const data = await res.json();
        if (data.content) {
          appendToMessage(activeConv.id, aiId, data.content);
        } else {
          appendToMessage(activeConv.id, aiId, "No response received");
        }
      } catch (err) {
        appendToMessage(activeConv.id, aiId, " [error fetching response]");
        console.error("AI stream error", err);
      }
    } else {
      // For regular conversations, use existing behavior
      sendMessage(activeConv.id, inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* <ChatSidebar activeTab={activeTab} setActiveTab={setActiveTab} /> */}

      <div className="flex-1 flex flex-col min-w-0 bg-background/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (activeConversationId || "none")}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <ChatHeader
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onToggleSidebar={toggleRightSidebar}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === "calls" ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/10">
                  <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-primary/10 to-blue-500/5 flex items-center justify-center relative mb-8 group cursor-pointer shadow-inner">
                    <PhoneCall className="w-10 h-10 text-primary relative z-10 transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-x-[-40%] inset-y-[-40%] bg-primary/5 rounded-full animate-ping opacity-10 pointer-events-none" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight mb-2">
                    {t("chat.comms_hub")}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 max-w-[180px] mx-auto leading-normal mb-8 uppercase tracking-widest font-bold">
                    {t("chat.secure_strategy")}
                  </p>
                  <button className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    {t("chat.start_session")}
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden bg-background">
                  {activeTab === "ai" && <AIDashboardCard />}

                  <ChatMessages messages={currentMessages} />

                  <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    placeholder={
                      activeTab === "ai"
                        ? t("chat.ask_ai")
                        : t("chat.message_placeholder", {
                            name: activeConv?.name || t("chat.chat_fallback"),
                          })
                    }
                    actionLabel={
                      activeTab === "ai" ? t("chat.analyze") : t("chat.send")
                    }
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
