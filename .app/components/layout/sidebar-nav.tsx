"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Truck,
  Users,
  Package,
  Settings,
  ChevronDown,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  LogOut,
} from "lucide-react";
import { useLayoutStore } from "@/store/layout-store";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import Link from "next/link";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Truck,
  Users,
  Package,
  Settings,
  UserCircle,
};

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    href: "/dashboard",
  },
  {
    id: "fleet",
    label: "Fleet Management",
    icon: "Truck",
    badge: 6,
    href: "/fleet",
  },
  { id: "crm", label: "CRM", icon: "Users", href: "/crm" },
  {
    id: "inventory",
    label: "Inventory",
    icon: "Package",
    badge: 3,
    href: "/inventory",
  },
  { id: "hrm", label: "HRM", icon: "UserCircle", href: "/hrm" },
  { id: "settings", label: "Settings", icon: "Settings", href: "/settings" },
];

export function SidebarNav() {
  const {
    leftSidebarOpen,
    leftSidebarWidth,
    toggleLeftSidebar,
    setLeftSidebarWidth,
    currentModule,
    setCurrentModule,
  } = useLayoutStore();

  const { user, signOut } = useAuthStore();
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = startWidth + delta;
      setLeftSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <motion.aside
      className={cn(
        "relative flex flex-col bg-muted/20 border-r border-border/50 h-screen shrink-0 z-30 backdrop-blur-xl",
        isResizing && "select-none",
      )}
      initial={false}
      animate={{ width: leftSidebarOpen ? leftSidebarWidth : 70 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
    >
      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-primary/20 transition-colors"
        onMouseDown={handleResizeStart}
      />

      {/* Header - Company Logo */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-xs">
              CEO
            </span>
          </div>
          <AnimatePresence>
            {leftSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-semibold text-sm truncate"
              >
                CEO AI
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Company Switcher */}
      <div className="px-3 py-2">
        <button
          onClick={() =>
            leftSidebarOpen && setShowCompanyDropdown(!showCompanyDropdown)
          }
          className={cn(
            "flex items-center gap-2 w-full p-2 rounded-md hover:bg-white/50 transition-colors",
            !leftSidebarOpen && "justify-center",
          )}
        >
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <AnimatePresence>
            {leftSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <span className="text-sm truncate">Main Enterprise</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <button
          className={cn(
            "flex items-center gap-2 w-full p-2.5 rounded-xl bg-background/50 border border-border/50 hover:bg-background hover:border-primary/30 transition-all text-muted-foreground shadow-sm",
            !leftSidebarOpen && "justify-center",
          )}
        >
          <Search className="w-4 h-4 shrink-0 text-muted-foreground/60" />
          <AnimatePresence>
            {leftSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 flex-1"
              >
                <span className="text-sm">Search</span>
                <kbd className="ml-auto text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border">
                  ⌘K
                </kbd>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = currentModule === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setCurrentModule(item.id as any)}
              className={cn(
                "flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-all relative group",
                isActive
                  ? "bg-background text-primary shadow-sm border border-border/80"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                !leftSidebarOpen && "justify-center px-2",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive && "text-primary",
                )}
              />
              <AnimatePresence>
                {leftSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {leftSidebarOpen && item.badge && (
                <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
              {isActive && leftSidebarOpen && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"
                />
              )}
              {!leftSidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-border/50">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl hover:bg-background/80 transition-colors cursor-pointer",
            !leftSidebarOpen && "justify-center",
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 shadow-md">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <AnimatePresence>
            {leftSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-semibold truncate leading-none mb-1">
                  {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">
                  Admin
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {leftSidebarOpen && (
            <button
              onClick={() => signOut()}
              className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggleLeftSidebar}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-border rounded-r-lg shadow-sm flex items-center justify-center hover:bg-secondary transition-colors z-20"
      >
        {leftSidebarOpen ? (
          <ChevronLeft className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
    </motion.aside>
  );
}
