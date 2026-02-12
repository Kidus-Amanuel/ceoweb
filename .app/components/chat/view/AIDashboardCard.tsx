"use client";

import { Sparkles } from "lucide-react";

export function AIDashboardCard() {
  return (
    <div className="bg-gradient-to-br from-primary to-blue-700 p-5 m-5 rounded-[24px] shadow-xl shadow-primary/20 relative overflow-hidden text-white group shrink-0">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
        <Sparkles className="w-24 h-24" />
      </div>
      <div className="relative z-10 space-y-2">
        <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60">
          Strategic Engine
        </span>
        <h3 className="text-sm font-black tracking-tight leading-tight">
          Insight Summary{" "}
          <span className="underline decoration-blue-300 decoration-2">
            Generated
          </span>
        </h3>
        <div className="flex items-center gap-4 pt-1 opacity-90">
          <div className="space-y-0.5">
            <p className="text-[7px] font-black uppercase tracking-widest">
              Efficiency
            </p>
            <p className="text-sm font-black">+14.2%</p>
          </div>
          <div className="w-[1px] h-6 bg-white/20" />
          <div className="space-y-0.5">
            <p className="text-[7px] font-black uppercase tracking-widest">
              Growth
            </p>
            <p className="text-sm font-black">Strong</p>
          </div>
        </div>
      </div>
    </div>
  );
}
