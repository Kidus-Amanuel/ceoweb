"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Sparkles, Activity, Settings2 } from "lucide-react";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export function ChatSidebar({ activeTab, setActiveTab }: ChatSidebarProps) {
  const { conversations, activeConversationId, setActiveConversation } =
    useChatStore();

  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    return conversations.filter(
      (conv) =>
        (conv.name || conv.participants[0]?.name)
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        conv.lastMessage?.content
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );
  }, [conversations, searchTerm]);

  return (
    <div className="w-[180px] flex flex-col bg-muted/10 border-r border-border/20 shrink-0 backdrop-blur-md h-full">
      {/* Top Search & Actions */}
      <div className="p-3 space-y-2 border-b border-border/10 bg-background/50">
        <div className="flex items-center gap-1.5 justify-between">
          <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
            Messages
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("ai")}
              className={cn(
                "p-1 rounded-md transition-all active:scale-90",
                activeTab === "ai"
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground/40 hover:bg-muted",
              )}
              title="CEO AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 hover:bg-muted rounded-md text-primary transition-all active:scale-90">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="relative group">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted/40 border-none rounded-lg py-1.5 pl-7 pr-2 text-[10px] focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/30 transition-all"
          />
        </div>
      </div>

      {/* Scrollable Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
        {filteredConversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => {
              setActiveConversation(conv.id);
              setActiveTab("chat");
            }}
            className={cn(
              "flex items-center gap-2.5 w-full p-2 rounded-xl transition-all group relative",
              activeConversationId === conv.id && activeTab === "chat"
                ? "bg-white shadow-md shadow-black/[0.02] ring-1 ring-border/30"
                : "hover:bg-muted/40",
            )}
          >
            <div className="relative shrink-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shadow-sm transition-transform",
                  activeConversationId === conv.id
                    ? "bg-primary text-white"
                    : "bg-muted/80 text-primary/40",
                )}
              >
                {conv.name?.charAt(0) || conv.participants[0]?.name.charAt(0)}
              </div>
              {conv.participants[0]?.status === "online" && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11px] font-bold truncate transition-colors",
                    activeConversationId === conv.id
                      ? "text-primary"
                      : "text-foreground/80 group-hover:text-primary",
                  )}
                >
                  {conv.name || conv.participants[0]?.name}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="w-3.5 h-3.5 bg-primary text-[7px] text-white flex items-center justify-center rounded-full font-black">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[9px] text-muted-foreground/50 truncate leading-none mt-0.5">
                {conv.lastMessage?.content}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Mini Utility Bar */}
      <div className="p-3 flex items-center justify-around border-t border-border/10 bg-background/30">
        <button className="p-1.5 text-muted-foreground/30 hover:text-primary transition-all">
          <Activity className="w-3.5 h-3.5" />
        </button>
        <button className="p-1.5 text-muted-foreground/30 hover:text-primary transition-all">
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
