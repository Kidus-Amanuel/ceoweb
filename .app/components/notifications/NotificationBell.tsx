"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover/Popover";
import { NotificationDropdown } from "./NotificationDropdown";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group relative p-2.5 rounded-2xl transition-all duration-300 border border-border/50",
            isOpen
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground",
          )}
        >
          <Bell
            className={cn(
              "w-5 h-5 transition-transform duration-300",
              isOpen ? "scale-110" : "group-hover:rotate-12",
            )}
          />

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full border-2 border-background shadow-[0_0_12px_rgba(var(--primary),0.6)] z-10"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary/40 rounded-full animate-ping pointer-events-none" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={12}
        alignOffset={-4}
        className="z-50 p-0 border-none bg-transparent shadow-none outline-none w-[400px]"
      >
        <NotificationDropdown
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
