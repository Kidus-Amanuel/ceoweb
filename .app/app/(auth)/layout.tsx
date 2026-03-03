"use client";

import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/shared/data-display/language-switcher";
import { ShieldCheck, Zap, BarChart3, Globe, Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-screen bg-[#F7F7F7] text-foreground overflow-hidden font-sans">
      {/* Global Language Switcher - Floating Top Right */}
      <div className="absolute top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-1000 delay-300">
        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-xl shadow-black/5 border border-white/50 ring-1 ring-black/5">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Visual Side - Hidden on Mobile */}
      <div className="relative hidden w-1/2 flex-col bg-black p-8 lg:flex overflow-hidden">
        {/* Animated Background Mesh - Subtle and Premium */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/10" />
          <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[100px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3 text-2xl font-bold text-white">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
            <span className="text-black font-bold text-[10px]">CEO</span>
          </div>
          <span className="tracking-tight">CEO AI</span>
        </div>

        <div className="relative z-10 mt-40 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3 text-blue-400" />
            {t("auth.empowering_modern")}
          </div>
          <blockquote className="space-y-3">
            <p className="text-3xl font-semibold leading-tight text-white/90">
              {t("auth.next_evolution")}
            </p>
            <footer className="text-base text-white/50 font-medium">
              {t("auth.join_global")}
            </footer>
          </blockquote>

          <div className="mt-8 grid grid-cols-2 gap-y-4 gap-x-8 border-t border-white/10 pt-8">
            <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-xs">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Zap className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-medium">{t("auth.real_time_fleet")}</span>
            </div>
            <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-xs">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-medium">{t("auth.predictive_ai")}</span>
            </div>
            <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-xs">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <Globe className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-medium">{t("auth.global_crm")}</span>
            </div>
            <div className="flex items-center gap-3 text-white/70 hover:text-white transition-colors text-xs">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="font-medium">{t("auth.secure_access")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex w-full flex-col justify-center p-6 lg:w-1/2 lg:p-8 xl:p-12">
        <div className="mx-auto w-full max-w-[400px]">
          {/* Mobile Logo */}
          <div className="mb-6 flex items-center gap-3 text-xl font-bold lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shadow-lg shadow-black/20">
              <span className="text-white font-bold text-[10px]">CEO</span>
            </div>
            CEO AI
          </div>

          <div className="bg-white/50 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none p-0 rounded-2xl">
            {children}
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 pt-6 border-t border-border/50 text-center text-[10px] text-muted-foreground uppercase tracking-widest opacity-60">
            {t("common.copyright")}
          </div>
        </div>
      </div>
    </div>
  );
}
