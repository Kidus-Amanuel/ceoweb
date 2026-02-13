"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
} from "lucide-react";
import { useLayoutStore } from "@/store/layout-store";
import { useAuthStore } from "@/store/authStore";
import { useNavigation } from "@/hooks/use-navigation";
import { useCompanies } from "@/hooks/use-companies";
import { useUser } from "@/app/context/UserContext";
import { NavItem, NavSubItem } from "@/lib/constants/nav-config";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav() {
  const {
    leftSidebarOpen,
    leftSidebarWidth,
    toggleLeftSidebar,
    setLeftSidebarWidth,
    currentModule,
    setCurrentModule,
  } = useLayoutStore();

  const { logout } = useUser();
  const { user } = useAuthStore();
  const navItems = useNavigation();
  const { availableCompanies, selectedCompany, setSelectedCompany } =
    useCompanies();
  const pathname = usePathname();
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = startWidth + delta;
      if (newWidth >= 200 && newWidth <= 400) {
        setLeftSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const isSuperAdmin = user?.userType === "super_admin";

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
                className="font-bold text-sm truncate tracking-tight"
              >
                CEO PORTAL
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Company Switcher */}
      <div className="px-3 py-2 relative">
        <button
          onClick={() =>
            leftSidebarOpen && setShowCompanyDropdown(!showCompanyDropdown)
          }
          className={cn(
            "flex items-center gap-2 w-full p-2 rounded-xl border border-transparent hover:bg-white/50 hover:border-border/50 transition-all shadow-sm group",
            !leftSidebarOpen && "justify-center",
            showCompanyDropdown && "bg-white/50 border-border/50",
          )}
        >
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <AnimatePresence>
            {leftSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-xs font-semibold truncate w-full text-left">
                    {selectedCompany?.name || "Select Company"}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {selectedCompany?.type || "Enterprise"}
                  </span>
                </div>
                {isSuperAdmin && (
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 text-muted-foreground ml-auto shrink-0 transition-transform",
                      showCompanyDropdown && "rotate-180",
                    )}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showCompanyDropdown && leftSidebarOpen && isSuperAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-3 right-3 top-full mt-1 bg-white border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-xl"
            >
              <div className="p-1.5 space-y-0.5">
                {availableCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setSelectedCompany(company.id);
                      setShowCompanyDropdown(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full p-2 rounded-lg text-xs transition-colors",
                      selectedCompany?.id === company.id
                        ? "bg-primary/5 text-primary font-medium"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Building2 className="w-3 h-3" />
                    <div className="flex flex-col items-start">
                      <span>{company.name}</span>
                      <span className="text-[9px] opacity-70">
                        {company.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search & Action Box */}
      <div className="px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <button
            className={cn(
              "flex items-center gap-2 flex-1 p-2.5 rounded-xl bg-background/50 border border-border/50 hover:bg-background hover:border-primary/30 transition-all text-muted-foreground shadow-sm",
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

          {/* Add Button for Super Admin */}
          {leftSidebarOpen && isSuperAdmin && (
            <Link
              href="/onboarding"
              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center shrink-0"
              title="Add New Company"
            >
              <Plus className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item: NavItem) => {
          const Icon = item.icon;
          const isActive =
            currentModule === item.id || pathname.startsWith(item.href);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedItems.includes(item.id);

          return (
            <div key={item.id} className="space-y-1">
              <div
                className={cn(
                  "flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-all relative group cursor-pointer",
                  isActive
                    ? "bg-background text-primary shadow-sm border border-border/80"
                    : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                  !leftSidebarOpen && "justify-center px-2",
                )}
                onClick={() => {
                  if (hasSubItems && leftSidebarOpen) {
                    toggleExpand(item.id);
                  } else {
                    setCurrentModule(item.id as any);
                  }
                }}
              >
                <Link
                  href={hasSubItems ? "#" : item.href}
                  className="flex items-center gap-3 flex-1 min-w-0"
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
                </Link>

                {leftSidebarOpen && hasSubItems && (
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      isExpanded && "rotate-180",
                    )}
                  />
                )}

                {isActive && leftSidebarOpen && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"
                  />
                )}
              </div>

              {/* Sub Items */}
              <AnimatePresence>
                {leftSidebarOpen && hasSubItems && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-9 space-y-1"
                  >
                    {item.subItems?.map((sub: NavSubItem) => (
                      <Link
                        key={sub.id}
                        href={sub.href}
                        className={cn(
                          "block py-2 px-3 text-xs rounded-lg transition-colors",
                          pathname === sub.href
                            ? "text-primary font-semibold bg-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                        )}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-border/50">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl hover:bg-background/80 transition-colors cursor-pointer relative group",
            !leftSidebarOpen && "justify-center",
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 shadow-md">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <AnimatePresence>
            {leftSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-bold truncate leading-none mb-1">
                  {user?.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest font-medium">
                  {user?.userType === "super_admin"
                    ? "Super Admin"
                    : "Company User"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {leftSidebarOpen && (
            <button
              onClick={() => logout()}
              className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100"
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
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-border rounded-r-lg shadow-sm flex items-center justify-center hover:bg-secondary transition-colors z-20 group"
      >
        {leftSidebarOpen ? (
          <ChevronLeft className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
        )}
      </button>
    </motion.aside>
  );
}
