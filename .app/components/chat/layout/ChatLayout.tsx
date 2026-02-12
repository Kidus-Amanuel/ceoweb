"use client";

import { useState } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatHeader } from "./ChatHeader";
import { ChatMessages } from "../view/ChatMessages";
import { ChatInput } from "../input/ChatInput";
import { AIDashboardCard } from "../view/AIDashboardCard";
import { useChatStore } from "@/store/chat-store";
import { useLayoutStore } from "@/store/layout-store";
import { PhoneCall, Video } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function ChatLayout() {
  const [activeTab, setActiveTab] = useState<"chat" | "ai" | "calls">("chat");
  const [inputValue, setInputValue] = useState("");
  const { activeConversationId, conversations, messages, sendMessage } =
    useChatStore();
  const { rightSidebarWidth, toggleRightSidebar } = useLayoutStore();

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations.find((c) => c.type === "ai");
  const currentMessages = messages[activeConv?.id || ""] || [];

  const handleSend = () => {
    if (!inputValue.trim() || !activeConv) return;
    sendMessage(activeConv.id, inputValue);
    setInputValue("");
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <ChatSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

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
                    Comms Hub
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 max-w-[180px] mx-auto leading-normal mb-8 uppercase tracking-widest font-bold">
                    Secure Strategy sessions only
                  </p>
                  <button className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Start Session
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
                        ? "Ask the Strategic AI..."
                        : `Message ${activeConv?.name || "Chat"}...`
                    }
                    actionLabel={activeTab === "ai" ? "Analyze" : "Send"}
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
