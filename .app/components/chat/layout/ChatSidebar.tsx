import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import { formatDistanceToNow } from "date-fns";
import { Search, Plus, User, Users, Bot } from "lucide-react";

export function ChatSidebar() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    searchQuery,
    setSearchQuery,
  } = useChatStore();

  const filteredConversations = conversations.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.participants.some((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  return (
    <div className="flex w-full flex-col border-r border-border bg-card h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Messages</h2>
        <button
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          title="New conversation"
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No conversations found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveConversation(conversation.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 transition-colors relative group",
                  activeConversationId === conversation.id
                    ? "bg-accent/50"
                    : "hover:bg-accent/30",
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0 mt-0.5">
                  {conversation.type === "group" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  ) : conversation.type === "ai" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-600">
                      <span className="text-sm font-semibold text-white">
                        {conversation.participants[0]?.name?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}

                  {/* Online Status */}
                  {conversation.type !== "ai" &&
                    conversation.type !== "group" &&
                    conversation.participants[0]?.status === "online" && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  {/* Name and Time */}
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {conversation.name ||
                        conversation.participants.map((p) => p.name).join(", ")}
                    </h3>
                    {conversation.lastMessage && (
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(
                          new Date(conversation.lastMessage.createdAt),
                          { addSuffix: false },
                        )}
                      </span>
                    )}
                  </div>

                  {/* Last Message and Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {conversation.lastMessage?.content ||
                        "Start a conversation"}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                        {conversation.unreadCount > 99
                          ? "99+"
                          : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Active Indicator */}
                {activeConversationId === conversation.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
