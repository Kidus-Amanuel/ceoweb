"use client";

import { useChatStore } from "@/store/chat-store";
import { PhoneCall, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onToggleSidebar?: () => void;
}

export function ChatHeader({
  activeTab,
  setActiveTab,
  onToggleSidebar,
}: ChatHeaderProps) {
  const { activeConversationId, conversations } = useChatStore();

  const activeConv =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations.find((c) => c.type === "ai");

  return (
    <div className="h-14 flex items-center justify-between px-5 bg-background shadow-xs border-b border-border/10">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black text-xs shadow-inner">
          {activeTab === "ai" ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            activeConv?.name?.charAt(0) ||
            activeConv?.participants[0]?.name.charAt(0) ||
            "?"
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-black tracking-tight leading-none mb-1 truncate">
            {activeTab === "ai"
              ? "CEO Strategic AI"
              : activeConv?.name || activeConv?.participants[0]?.name || "Chat"}
          </h4>
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[8px] font-black uppercase tracking-widest truncate">
              Encrypted Hub
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Call Switch */}
        <button
          onClick={() => setActiveTab("calls")}
          className={cn(
            "p-2.5 rounded-xl transition-all border shadow-sm",
            activeTab === "calls"
              ? "bg-primary text-white border-primary shadow-primary/20 scale-105"
              : activeTab === "ai"
                ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                : "bg-background border-border/20 text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20",
          )}
          title={
            activeTab === "ai" ? "Start AI Strategic Call" : "Communication Hub"
          }
        >
          <PhoneCall className="w-4 h-4" />
        </button>

        {onToggleSidebar && (
          <>
            <div className="h-6 w-[1px] bg-border/40 mx-1.5" />
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground/50 hover:text-foreground border border-border/10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
