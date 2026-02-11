"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import {
  Send,
  Paperclip,
  Mic,
  Smile,
  Image as ImageIcon,
  File,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatInput() {
  const { activeConversationId, sendMessage } = useChatStore();
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || !activeConversationId) return;

    sendMessage(activeConversationId, message.trim());
    setMessage("");
    setShowAttachMenu(false);

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording logic
  };

  if (!activeConversationId) return null;

  return (
    <div className="border-t border-border bg-card">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Attachment Menu */}
        {showAttachMenu && (
          <div className="mb-3 flex gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-accent/50 hover:bg-accent transition-colors group">
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="h-4 w-4 text-white" />
              </div>
              <span className="text-foreground">Photo</span>
            </button>
            <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-accent/50 hover:bg-accent transition-colors group">
              <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <File className="h-4 w-4 text-white" />
              </div>
              <span className="text-foreground">File</span>
            </button>
          </div>
        )}

        {/* Input Container */}
        <div className="flex items-end gap-2">
          {/* Attachment Toggle */}
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all",
              showAttachMenu
                ? "bg-primary text-primary-foreground rotate-45"
                : "bg-accent text-foreground hover:bg-accent/80",
            )}
            title={showAttachMenu ? "Close" : "Attach file"}
          >
            <Paperclip className="h-5 w-5" />
          </button>

          {/* Input Area */}
          <div className="flex-1 relative bg-background border border-input rounded-2xl focus-within:border-ring focus-within:ring-1 focus-within:ring-ring transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 pr-20 text-sm focus:outline-none placeholder:text-muted-foreground"
              style={{
                minHeight: "44px",
                maxHeight: "120px",
              }}
            />

            {/* Action Buttons */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {/* Emoji Button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                  showEmojiPicker
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground",
                )}
                title="Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Send/Voice Button */}
          {message.trim() ? (
            <button
              onClick={handleSend}
              className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md hover:shadow-lg"
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleVoiceRecord}
              className={cn(
                "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-md",
                isRecording
                  ? "bg-red-500 text-white animate-pulse scale-110"
                  : "bg-accent text-foreground hover:bg-accent/80",
              )}
              title={isRecording ? "Stop recording" : "Record voice message"}
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Hint Text */}
        {message.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-medium">
              Enter
            </kbd>{" "}
            to send,
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-muted text-foreground font-medium">
              Shift+Enter
            </kbd>{" "}
            for new line
          </p>
        )}
      </div>
    </div>
  );
}
