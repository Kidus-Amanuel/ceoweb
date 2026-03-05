"use client";

import { motion } from "framer-motion";
import { AIMarkupRenderer } from "./AIMarkupRenderer";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  PhoneCall,
  Database,
  ArrowUpRight,
  Circle,
} from "lucide-react";

interface MessageProps {
  message: any;
  isLast?: boolean;
}

export function MessageItem({ message, isLast }: MessageProps) {
  const isMe = message.senderId === "me";
  const isAI = message.senderId === "ai";
  const isERP = message.type === "erp_record";
  const isCall = message.type === "call";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3 group", isMe ? "flex-row-reverse" : "flex-row")}
    >
      {!isMe && (
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105",
            isAI
              ? "bg-gradient-to-tr from-primary to-blue-600 text-white"
              : "bg-muted text-primary/60",
          )}
        >
          {isAI ? (
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <div className="font-black text-[8px] tracking-tighter">CF</div>
          )}
        </div>
      )}
      <div className={cn("max-w-[78%] space-y-1", isMe && "items-end")}>
        {!isMe && !isAI && (
          <span className="text-[8px] font-black text-muted-foreground/40 px-1 uppercase tracking-widest leading-none">
            {message.senderName || "Enterprise User"}
          </span>
        )}

        {isCall ? (
          <div className="flex items-center gap-3 bg-muted/40 border border-border/20 p-3 rounded-2xl shadow-sm hover:ring-2 hover:ring-primary/10 transition-all">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black tracking-tight leading-tight truncate">
                {message.content}
              </p>
              <p className="text-[7px] text-muted-foreground/60 uppercase font-black tracking-widest mt-0.5">
                Relay Complete
              </p>
            </div>
          </div>
        ) : isERP ? (
          <div className="bg-background border border-border/10 rounded-2xl p-4 shadow-xl shadow-black/[0.03] space-y-3 group/card">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 text-primary">
                <Database className="w-3.5 h-3.5" />
                <span className="text-[8px] font-black uppercase tracking-widest">
                  Inventory
                </span>
              </div>
              <ArrowUpRight className="w-3 h-3 text-muted-foreground/30 group-hover/card:text-primary transition-all group-hover/card:rotate-45" />
            </div>
            <p className="text-[12px] font-bold leading-tight text-foreground/90">
              {message.content}
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-muted/30 p-2 rounded-xl border border-border/10 text-center">
                <p className="text-[8px] font-black text-red-500">42 Units</p>
              </div>
              <div className="flex-1 bg-muted/30 p-2 rounded-xl border border-border/10 text-center">
                <p className="text-[8px] font-black">Critical</p>
              </div>
            </div>
            <button className="w-full py-2 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95">
              Order
            </button>
          </div>
        ) : (
           <div
              className={cn(
                "px-3.5 py-2.5 rounded-2xl text-[12px] leading-snug shadow-sm transition-all",
                isMe
                  ? "bg-primary text-white rounded-tr-none font-medium"
                  : isAI
                    ? "bg-muted/30 border border-primary/10 text-foreground rounded-tl-none font-medium"
                    : "bg-background border border-border/20 text-foreground rounded-tl-none font-medium group-hover:border-primary/20",
              )}
            >
              {isAI ? <AIMarkupRenderer content={message.content} /> : message.content}
            </div>
        )}

        <div
          className={cn(
            "flex items-center gap-1.5 px-1.5",
            isMe && "justify-end",
          )}
        >
          <p className="text-[7px] font-black text-muted-foreground/30 uppercase tracking-tighter">
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {isMe && (
            <div className="flex -space-x-1.5 opacity-60 transition-opacity group-hover:opacity-100">
              <Circle className="w-1 h-1 fill-primary text-primary" />
              <Circle className="w-1 h-1 fill-primary text-primary" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
