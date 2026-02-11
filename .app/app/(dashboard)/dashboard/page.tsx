"use client";

import {
  TrendingUp,
  Users,
  Package,
  Car,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Filter,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = [
  {
    title: "Sales Trend",
    value: "$245,890",
    change: "+12.5%",
    trend: "up",
    description: "vs last month",
    icon: TrendingUp,
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    title: "User Engagement",
    value: "87.2%",
    change: "+3.6%",
    trend: "up",
    description: "active participation",
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    title: "Inventory Turnover",
    value: "45 Days",
    change: "-13.5%",
    trend: "down",
    description: "average turnover",
    icon: Package,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    title: "Vehicle Utilization",
    value: "92.4%",
    change: "+4.7%",
    trend: "up",
    description: "fleet utilization",
    icon: Car,
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

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

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {STATS.map((stat) => (
          <div
            key={stat.title}
            className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {stat.value}
              </h3>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md",
                  stat.trend === "up"
                    ? "text-success bg-success/10"
                    : "text-destructive bg-destructive/10",
                )}
              >
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {stat.change}
              </div>
              <span className="text-xs text-muted-foreground">
                {stat.description}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics Table */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-section-title text-foreground">
                Performance Metrics
              </h2>
              <p className="text-sm text-muted-foreground mt-1 text-label">
                Real-time operational efficiency tracking
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-accent transition-colors">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Metric</th>
                  <th className="px-6 py-4">Current</th>
                  <th className="px-6 py-4">Previous</th>
                  <th className="px-6 py-4">Change</th>
                  <th className="px-6 py-4">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERFORMANCE_METRICS.map((metric) => (
                  <tr
                    key={metric.name}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">
                      {metric.name}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {metric.current}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {metric.previous}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "font-semibold",
                          metric.trend === "up"
                            ? "text-success"
                            : "text-destructive",
                        )}
                      >
                        {metric.change}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {metric.target}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity / Right Sidebar Section */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-section-title text-foreground mb-6">
            Recent Activity
          </h2>
          <div className="space-y-6">
            {[
              {
                user: "Sarah J.",
                action: "Updated Vehicle ABC-123",
                time: "10 mins ago",
                type: "vehicle",
              },
              {
                user: "John S.",
                action: "Reported Low Stock: Laptop Pro",
                time: "25 mins ago",
                type: "inventory",
              },
              {
                user: "System",
                action: "Daily Backup Completed",
                time: "1 hour ago",
                type: "system",
              },
              {
                user: "Mike C.",
                action: "New Driver Onboarded",
                time: "3 hours ago",
                type: "hr",
              },
              {
                user: "Sarah J.",
                action: "Maintenance Scheduled",
                time: "5 hours ago",
                type: "vehicle",
              },
            ].map((activity, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground border border-border group-hover:scale-105 transition-transform font-bold">
                    {activity.user.charAt(0)}
                  </div>
                  {i !== 4 && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-full bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {activity.user}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-xs font-semibold text-primary hover:underline transition-all">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
