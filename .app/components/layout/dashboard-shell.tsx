"use client";

import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";
import { DashboardHeader } from "./dashboard-header";
import { ChatbarNav } from "./chatbar-nav";
import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/store/layout-store";
import { Bot, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    leftSidebarOpen,
    leftSidebarWidth,
    rightSidebarOpen,
    rightSidebarWidth,
    toggleRightSidebar,
  } = useLayoutStore();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative font-sans text-foreground">
      {/* Sidebar - Desktop (Left) */}
      <SidebarNav />

      {/* Sidebar - Mobile Overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] z-50 lg:hidden shadow-2xl"
            >
              <SidebarNav />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area - Middle Column */}
      <div className="flex flex-1 flex-col min-w-0 bg-background transition-all duration-300 ease-in-out relative border-r border-border/40">
        <DashboardHeader
          onMobileMenuToggle={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/20 custom-scrollbar">
          <div className="mx-auto w-full p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-5">
              <DashboardBreadcrumbs />
            </div>
            {children}
          </div>
        </main>

        {/* Floating AI Toggle (Visible when Right Sidebar is closed) */}
        <AnimatePresence>
          {!rightSidebarOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={toggleRightSidebar}
              className="fixed right-6 bottom-6 z-40 bg-black text-white p-4 rounded-2xl shadow-2xl shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white/10 group"
            >
              <div className="relative">
                <Bot className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              </div>
              <span className="text-sm font-bold tracking-tight">CEO AI</span>
              <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-12 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Right Sidebar (AI Assistant) */}
      <ChatbarNav />
    </div>
  );
}
