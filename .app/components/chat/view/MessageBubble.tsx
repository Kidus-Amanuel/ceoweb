import { cn } from "@/lib/utils";
import { Message, User } from "@/types/chat";
import { format, isToday, isYesterday } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  sender?: User;
  showAvatar?: boolean;
}

export function MessageBubble({
  message,
  isMe,
  sender,
  showAvatar = true,
}: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  return (
    <div
      className={cn(
        "flex w-full gap-2.5 group",
        isMe ? "justify-end" : "justify-start",
      )}
    >
      {/* Sender Avatar */}
      {!isMe && showAvatar && (
        <div className="flex-shrink-0 mt-auto mb-1">
          {sender?.avatar ? (
            <img
              src={sender.avatar}
              alt={sender.name || "User avatar"}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center ring-1 ring-border">
              <span className="text-xs font-semibold text-white">
                {sender?.name?.charAt(0) || "U"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Spacer when avatar is hidden */}
      {!isMe && !showAvatar && <div className="w-8 flex-shrink-0" />}

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[75%] sm:max-w-[65%]",
          isMe ? "items-end" : "items-start",
        )}
      >
        {/* Sender Name (for received messages) */}
        {!isMe && showAvatar && (
          <span className="text-xs font-medium text-muted-foreground mb-1 px-1">
            {sender?.name}
          </span>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 shadow-sm transition-all",
            isMe
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-muted text-foreground rounded-tl-md",
          )}
        >
          {/* Text Content */}
          {message.type === "text" && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* TODO: Add support for images, files, audio */}

          {/* Timestamp (on hover for desktop) */}
          <div
            className={cn(
              "absolute -bottom-5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity",
              isMe ? "right-0" : "left-0",
            )}
          >
            {formatTime(new Date(message.createdAt))}
          </div>
        </div>

        {/* Read Receipts (for sent messages) */}
        {isMe && (
          <div className="flex items-center gap-1 mt-1 px-1">
            {message.readBy && message.readBy.length > 0 ? (
              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <Check className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatTime(new Date(message.createdAt))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
