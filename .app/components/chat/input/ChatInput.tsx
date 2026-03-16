"use client";

import { Paperclip, Database, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  placeholder?: string;
  actionLabel?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  placeholder = "Type a message...",
  actionLabel = "Send",
}: ChatInputProps) {
  return (
    <div className="p-4 bg-background border-t border-border/10">
      <div className="relative group bg-muted/30 border border-transparent focus-within:border-primary/20 focus-within:bg-background rounded-2xl p-1 transition-all">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:ring-0 text-[12px] font-medium py-2 px-3 resize-none min-h-[44px] max-h-[120px] placeholder:text-muted-foreground/30 leading-tight"
          rows={1}
        />
        <div className="flex items-center justify-between px-2 pb-1.5">
          <div className="flex items-center gap-0.5">
            {/* <button className="p-1.5 text-muted-foreground/30 hover:text-primary rounded-lg transition-all">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 text-muted-foreground/30 hover:text-primary rounded-lg transition-all">
              <Database className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 text-muted-foreground/30 hover:text-primary rounded-lg transition-all">
              <Smile className="w-3.5 h-3.5" />
            </button> */}
          </div>
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="px-4 py-2 bg-primary text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-primary/20 disabled:grayscale disabled:opacity-20 hover:scale-105 active:scale-95 transition-all"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
