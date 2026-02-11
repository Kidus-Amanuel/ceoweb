import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import {
  Search,
  Phone,
  Video,
  MoreVertical,
  User,
  Users,
  Bot,
} from "lucide-react";

export function ChatHeader() {
  const { activeConversationId, conversations } = useChatStore();

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  );

  if (!activeConversationId || !activeConversation) {
    return (
      <div className="h-16 border-b border-border bg-card flex items-center px-6">
        <p className="text-sm text-muted-foreground">
          No conversation selected
        </p>
      </div>
    );
  }

  const isAI = activeConversation.type === "ai";
  const isGroup = activeConversation.type === "group";

  return (
    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
      {/* Left Side - Conversation Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {isGroup ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ring-1 ring-border">
              <Users className="h-5 w-5 text-primary" />
            </div>
          ) : isAI ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 ring-1 ring-border shadow-md">
              <Bot className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-600 ring-1 ring-border shadow-md">
              <span className="text-sm font-semibold text-white">
                {activeConversation.participants[0]?.name?.charAt(0) || "U"}
              </span>
            </div>
          )}

          {/* Online Status Indicator */}
          {!isGroup &&
            !isAI &&
            activeConversation.participants[0]?.status === "online" && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500 shadow-sm" />
            )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm md:text-base text-foreground truncate">
            {activeConversation.name ||
              activeConversation.participants.map((p) => p.name).join(", ")}
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {isAI ? (
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                AI Assistant · Active
              </span>
            ) : isGroup ? (
              `${activeConversation.participants.length} members`
            ) : (
              activeConversation.participants[0]?.status || "offline"
            )}
          </p>
        </div>
      </div>

      {/* Right Side - Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          className="h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition-colors group"
          title="Search in conversation"
        >
          <Search className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        {!isAI && (
          <>
            <button
              className="h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition-colors group"
              title="Voice call"
            >
              <Phone className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <button
              className="h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition-colors group"
              title="Video call"
            >
              <Video className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </>
        )}

        <button
          className="h-9 w-9 rounded-lg hover:bg-accent flex items-center justify-center transition-colors group"
          title="More options"
        >
          <MoreVertical className="h-4.5 w-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    </div>
  );
}
