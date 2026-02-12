"use client";

import { useLayoutStore } from "@/store/layout-store";
import { Search, Bell, Command, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  onMobileMenuToggle?: () => void;
}

export function DashboardHeader({ onMobileMenuToggle }: DashboardHeaderProps) {
  const { currentModule } = useLayoutStore();

  const moduleTitles: Record<string, string> = {
    dashboard: "Executive Overview",
    fleet: "Fleet Operations",
    crm: "Customer Intelligence",
    inventory: "Global Inventory",
    hrm: "Human Capital",
    settings: "System Configuration",
  };

  return (
    <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">
            {moduleTitles[currentModule] || "Dashboard"}
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-60">
            CEO Strategic Engine v1.0
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar - Minimalist */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border/40 rounded-xl text-muted-foreground hover:border-border/80 transition-all cursor-text group">
          <Search className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />
          <span className="text-[11px] font-medium pr-8">
            Search intelligence...
          </span>
          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-background border border-border/60 rounded text-[9px] font-bold shadow-sm">
            <Command className="w-2 h-2" />
            <span>K</span>
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-muted/50 rounded-xl transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full border-2 border-background" />
        </button>
      </div>
    </header>
  );
}
