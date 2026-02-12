"use client";

import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { PerformanceTable } from "@/components/dashboard/PerformanceTable";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { motion } from "framer-motion";

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header Info - Contextual Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, Admin
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Here is your strategic overview for ABC PLC today.
        </p>
      </motion.div>

      {/* Stats Cards Section */}
      <StatsGrid />

      {/* Main Grid: Data Visualization & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Detailed Performance Data - Takes up 2 columns on Large screens */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <PerformanceTable />
        </div>

        {/* Real-time Activity Stream - Takes up 1 column on Large screens */}
        <div className="order-1 lg:order-2">
          <RecentActivity />
        </div>
      </div>

      {/* Footer Info / Tip */}
      <div className="pt-8 border-t border-border/40 text-center">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40">
          Powered by CEO Strategic Intelligence Agency
        </p>
      </div>
    </div>
  );
}
