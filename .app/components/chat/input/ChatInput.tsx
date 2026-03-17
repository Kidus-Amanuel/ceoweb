"use client";

import { Paperclip, Database, Smile, Mic, Send } from "lucide-react";
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
      <div className="relative group bg-background border border-border/20 focus-within:border-primary/40 focus-within:shadow-sm focus-within:shadow-primary/10 rounded-2xl p-1 transition-all">
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
          className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium py-3 px-4 resize-none min-h-[52px] max-h-[150px] placeholder:text-muted-foreground/50 leading-relaxed"
          rows={1}
        />
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1">
            <button className="p-2 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Voice chat">
              <Mic className="w-4 h-4" />
            </button>
            {/* <button className="p-2 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Attach file">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="p-2 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Add data">
              <Database className="w-4 h-4" />
            </button>
            <button className="p-2 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="Add emoji">
              <Smile className="w-4 h-4" />
            </button> */}
          </div>
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/95 active:scale-95 transition-all flex items-center gap-2"
          >
            {value.trim() ? <Send className="w-4 h-4" /> : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
