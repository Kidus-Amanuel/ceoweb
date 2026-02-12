"use client";

import {
  TrendingUp,
  Users,
  Package,
  Car,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STATS = [
  {
    title: "Sales Trend",
    value: "$245,890",
    change: "+12.5%",
    trend: "up",
    description: "vs last month",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    title: "User Engagement",
    value: "87.2%",
    change: "+3.6%",
    trend: "up",
    description: "active participation",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    title: "Inventory Turnover",
    value: "45 Days",
    change: "-13.5%",
    trend: "down",
    description: "average turnover",
    icon: Package,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    title: "Vehicle Utilization",
    value: "92.4%",
    change: "+4.7%",
    trend: "up",
    description: "fleet utilization",
    icon: Car,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

export function StatsGrid() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6"
    >
      {STATS.map((stat) => (
        <motion.div
          key={stat.title}
          variants={item}
          className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group relative overflow-hidden"
        >
          {/* Subtle background glow on hover */}
          <div
            className={cn(
              "absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full",
              stat.bg,
            )}
          />

          <div className="flex items-start justify-between relative z-10">
            <div
              className={cn(
                "p-2 rounded-lg transition-transform group-hover:scale-110 duration-300",
                stat.bg,
              )}
            >
              <stat.icon className={cn("h-4 w-4 md:h-5 md:w-5", stat.color)} />
            </div>
            <button className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 relative z-10">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              {stat.title}
            </p>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mt-0.5 group-hover:text-primary transition-colors truncate">
              {stat.value}
            </h3>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 relative z-10">
            <div
              className={cn(
                "flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
                stat.trend === "up"
                  ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                  : "text-rose-600 bg-rose-50 border-rose-100",
              )}
            >
              {stat.trend === "up" ? (
                <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
              )}
              {stat.change}
            </div>
            <span className="text-[9px] text-muted-foreground font-medium truncate">
              {stat.description}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
