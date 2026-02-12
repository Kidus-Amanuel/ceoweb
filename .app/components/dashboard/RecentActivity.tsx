"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Car,
  Package,
  ShieldCheck,
  UserPlus,
  Wrench,
  Clock,
} from "lucide-react";

const ACTIVITIES = [
  {
    user: "Sarah J.",
    action: "Updated Vehicle ABC-123",
    time: "10 mins ago",
    type: "vehicle",
    icon: Car,
    color: "bg-blue-500",
  },
  {
    user: "John S.",
    action: "Reported Low Stock: Laptop Pro",
    time: "25 mins ago",
    type: "inventory",
    icon: Package,
    color: "bg-amber-500",
  },
  {
    user: "System",
    action: "Daily Backup Completed",
    time: "1 hour ago",
    type: "system",
    icon: ShieldCheck,
    color: "bg-emerald-500",
  },
  {
    user: "Mike C.",
    action: "New Driver Onboarded",
    time: "3 hours ago",
    type: "hr",
    icon: UserPlus,
    color: "bg-purple-500",
  },
  {
    user: "Sarah J.",
    action: "Maintenance Scheduled",
    time: "5 hours ago",
    type: "vehicle",
    icon: Wrench,
    color: "bg-blue-500",
  },
];

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card border border-border/50 rounded-2xl shadow-sm p-6 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
        <div className="p-2 bg-muted/50 rounded-lg">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-6 flex-1">
        {ACTIVITIES.map((activity, i) => (
          <div key={i} className="flex gap-4 group relative">
            {/* Timeline Line */}
            {i !== ACTIVITIES.length - 1 && (
              <div className="absolute top-10 left-[19px] w-[2px] h-[calc(100%-20px)] bg-gradient-to-b from-border/50 to-transparent" />
            )}

            <div className="relative">
              <div
                className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6",
                  activity.color,
                )}
              >
                <activity.icon className="w-5 h-5 pointer-events-none" />
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground truncate">
                  {activity.user}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex-shrink-0">
                  {activity.time}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed group-hover:text-foreground transition-colors">
                {activity.action}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-8 py-3 text-xs font-bold text-primary bg-primary/5 rounded-xl hover:bg-primary/10 transition-all active:scale-95 border border-primary/10">
        View All System Activity
      </button>
    </motion.div>
  );
}
