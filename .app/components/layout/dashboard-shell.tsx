"use client";

import { useState } from "react";
// import { SidebarNav } from "./sidebar-nav";
// import { DashboardHeader } from "./dashboard-header";
// import { ChatbarNav } from "@/components/layout/chatbar-nav";
import { cn } from "@/lib/utils";
import { Sparkles, Minimize2, Maximize2 } from "lucide-react";

type ChatSize = "closed" | "compact" | "full";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [chatSize, setChatSize] = useState<ChatSize>("closed");

  const getChatWidth = () => {
    switch (chatSize) {
      case "compact":
        return "w-[400px]";
      case "full":
        return "w-[600px]";
      default:
        return "w-0";
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block h-full shrink-0">
        {/* <SidebarNav
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        /> */}
      </div>

      {/* Sidebar - Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden",
          isMobileSidebarOpen ? "block" : "hidden",
        )}
      >
        <div className="fixed inset-y-0 left-0 w-[260px] shadow-xl animate-in slide-in-from-left duration-300">
          {/* <SidebarNav
            isCollapsed={false}
            onToggle={() => setIsMobileSidebarOpen(false)}
          /> */}
        </div>
        <div
          className="absolute inset-0"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area - Middle Column */}
      <div className="flex flex-1 flex-col min-w-0 bg-background transition-all duration-300 ease-in-out relative">
        {/* <DashboardHeader
            onMobileMenuToggle={() => setIsMobileSidebarOpen(true)}
            onChatToggle={() =>
                setChatSize(chatSize === "closed" ? "compact" : "closed")
            }
            /> */}

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 bg-background/50">
          <div className="mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>

        {/* Floating Chat Toggle Button (Visible when chat is closed) */}
        {chatSize === "closed" && (
          <button
            onClick={() => setChatSize("compact")}
            className="absolute bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95 animate-in zoom-in spin-in-12 duration-300"
            aria-label="Open Chat"
          >
            <Sparkles className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Chat Panel - Right Sidebar with Size Controls */}
      <div
        className={cn(
          "relative shrink-0 h-full border-l border-border bg-card shadow-sm transition-all duration-300 ease-in-out",
          getChatWidth(),
          chatSize === "closed" && "opacity-0 overflow-hidden",
        )}
      >
        {/* Chat Size Controls */}
        {chatSize !== "closed" && (
          <div className="absolute top-2 right-2 z-50 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-border shadow-sm">
            <button
              onClick={() => setChatSize("compact")}
              className={cn(
                "h-7 w-7 rounded flex items-center justify-center transition-colors",
                chatSize === "compact"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
              title="Compact view"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setChatSize("full")}
              className={cn(
                "h-7 w-7 rounded flex items-center justify-center transition-colors",
                chatSize === "full"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
              title="Full view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Chat Container */}
        {/* <ChatbarNav
          isOpen={chatSize !== "closed"}
          onClose={() => setChatSize("closed")}
          className="h-full w-full"
        /> */}
      </div>
    </div>
  );
}
