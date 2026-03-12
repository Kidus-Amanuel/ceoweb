"use client";

import { Notification } from "@/types/notifications";
import { NotificationItem } from "./NotificationItem";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Check, CheckCircle2, Inbox, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/ui/button"; // verify existence or use standard button

interface NotificationDropdownProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export function NotificationDropdown({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationDropdownProps) {
  return (
    <div className="flex flex-col h-[480px] w-[400px] overflow-hidden bg-background/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl p-0 animate-in fade-in zoom-in duration-200 origin-top-right">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold tracking-tight">Notifications</h3>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold",
              notifications.filter((n) => !n.is_read).length > 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {notifications.filter((n) => !n.is_read).length} New
          </span>
        </div>

        <button
          onClick={onMarkAllAsRead}
          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-2 py-1 hover:bg-muted/50 rounded-lg"
        >
          <CheckCircle2 className="w-3 h-3" />
          Mark all as read
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[2px] flex items-center justify-center">
            <RefreshCcw className="w-6 h-6 animate-spin text-primary opacity-50" />
          </div>
        )}

        {notifications.length > 0 ? (
          <div className="overflow-y-auto h-full scroll-smooth scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 pr-1">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onClose={onClose}
              />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 opacity-40">
            <div className="w-16 h-16 rounded-3xl bg-muted/40 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-center">
              No notifications yet
            </p>
            <p className="text-xs text-center mt-1">
              We&apos;ll let you know when something important happens.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-border/40 bg-muted/10">
        <button
          onClick={onClose}
          className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all rounded-xl border border-transparent hover:border-border/50"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
