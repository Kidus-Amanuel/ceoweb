"use client";

import { useEffect, useRef, useState } from "react";
import { useLayoutStore } from "@/store/layout-store";
import { Bell, Command, Menu } from "lucide-react";
import { GlobalSearchInput } from "@/components/layout/global-search-input";
import { usePathname } from "next/navigation";

import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/shared/data-display/language-switcher";

interface DashboardHeaderProps {
  onMobileMenuToggle?: () => void;
}

export function DashboardHeader({ onMobileMenuToggle }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const { selectedCompanyId } = useLayoutStore();
  const pathname = usePathname();
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const moduleTitle = pathname.startsWith("/crm")
    ? t("navigation.customer_intelligence")
    : pathname.startsWith("/fleet")
      ? t("navigation.fleet_operations")
      : pathname.startsWith("/inventory")
        ? t("navigation.global_inventory")
        : pathname.startsWith("/hr")
          ? t("navigation.human_capital")
          : pathname.startsWith("/finance")
            ? t("navigation.financial_operations")
            : pathname.startsWith("/admin")
              ? t("navigation.platform_administration")
              : pathname.startsWith("/settings")
                ? t("navigation.system_configuration")
                : t("navigation.executive_overview");

  return (
    <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 hover:bg-muted/50 rounded-lg transition-colors border border-border/50"
        >
          <Menu className="w-5 h-5 text-blue-500" />
        </button>
        <div>
          <h2 className="text-base font-bold text-foreground tracking-tight">
            {moduleTitle}
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-60">
            {t("header.strategic_engine")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar - Minimalist */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-[#BEC9DD] rounded-xl hover:border-[#AAB9D3] transition-all group min-w-[280px]">
          <GlobalSearchInput
            inputRef={searchRef}
            value={headerSearchQuery}
            onChange={setHeaderSearchQuery}
            companyId={selectedCompanyId}
            placeholder={t("common.search_placeholder")}
            className="w-full"
            inputClassName="h-7 text-xs"
            iconClassName="w-3.5 h-3.5"
          />
          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-background border border-[#BEC9DD] rounded text-[9px] font-bold shadow-sm shrink-0">
            <Command className="w-2 h-2" />
            <span>K</span>
          </div>
        </div>

        <LanguageSwitcher />

        {/* Notifications */}
        <button className="relative p-2 hover:bg-muted/50 rounded-xl transition-colors text-muted-foreground hover:text-foreground border border-border/50">
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full border-2 border-background" />
        </button>
      </div>
    </header>
  );
}
