"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLayoutStore } from "@/store/layout-store";
import { cn } from "@/lib/utils";
import { ChatLayout } from "@/components/chat/layout/ChatLayout";

export function ChatbarNav() {
  const { rightSidebarOpen, rightSidebarWidth, setRightSidebarWidth } =
    useLayoutStore();

  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      setRightSidebarWidth(startWidth + delta);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  if (!rightSidebarOpen) return null;

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: rightSidebarWidth, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className={cn(
        "relative flex bg-background border-l border-border/50 h-screen shrink-0 z-40 shadow-2xl overflow-hidden",
        isResizing && "select-none",
      )}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-50 hover:bg-primary/20 transition-all pointer-events-auto"
        onMouseDown={handleResizeStart}
      />

      <div className="flex-1 min-w-0">
        <ChatLayout />
      </div>
    </motion.aside>
  );
}
