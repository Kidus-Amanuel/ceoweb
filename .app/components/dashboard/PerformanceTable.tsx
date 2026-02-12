"use client";

import {
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const PERFORMANCE_METRICS = [
  {
    name: "Sales Revenue",
    current: "$245,890",
    previous: "$218,450",
    change: "+12.5%",
    trend: "up",
    target: "$250,000",
  },
  {
    name: "Inventory Turnover",
    current: "45 days",
    previous: "52 days",
    change: "-13.5%",
    trend: "up",
    target: "40 days",
  },
  {
    name: "Employee Productivity",
    current: "87%",
    previous: "84%",
    change: "+3.6%",
    trend: "up",
    target: "90%",
  },
  {
    name: "Vehicle Maintenance",
    current: "$2,450",
    previous: "$2,100",
    change: "+16.7%",
    trend: "down",
    target: "$2,000",
  },
  {
    name: "Customer Satisfaction",
    current: "4.5/5",
    previous: "4.3/5",
    change: "+4.7%",
    trend: "up",
    target: "4.7/5",
  },
];

export function PerformanceTable() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full"
    >
      <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/5">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Performance Metrics
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Real-time operational efficiency tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-border rounded-xl hover:bg-muted transition-all active:scale-95 shadow-sm">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
              <th className="px-6 py-4 border-b border-border/50">
                Metric Name
              </th>
              <th className="px-6 py-4 border-b border-border/50 text-right">
                Current Value
              </th>
              <th className="px-6 py-4 border-b border-border/50 text-right">
                Previous
              </th>
              <th className="px-6 py-4 border-b border-border/50 text-center">
                Trend Chart
              </th>
              <th className="px-6 py-4 border-b border-border/50 text-right">
                Target
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {PERFORMANCE_METRICS.map((metric, index) => (
              <tr
                key={metric.name}
                className="hover:bg-primary/[0.02] transition-colors group"
              >
                <td className="px-6 py-4 font-bold text-foreground max-w-[200px] truncate">
                  {metric.name}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono font-semibold">
                    {metric.current}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-muted-foreground font-medium">
                  {metric.previous}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span
                      className={cn(
                        "flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px]",
                        metric.trend === "up"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-rose-50 text-rose-600 border border-rose-100",
                      )}
                    >
                      {metric.trend === "up" ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {metric.change}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono font-medium text-muted-foreground">
                      {metric.target}
                    </span>
                    <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-1000"
                        style={{ width: `${80 + index * 3}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border/50 bg-muted/5">
        <button className="text-xs font-bold text-primary hover:underline hover:underline-offset-4 w-full text-center py-2 transition-all">
          View Detailed Analytics Report
        </button>
      </div>
    </motion.div>
  );
}
