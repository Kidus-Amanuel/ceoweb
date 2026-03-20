"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Users,
  Briefcase,
  Clock,
  BadgeDollarSign,
  TrendingUp,
  TrendingDown,
  Bell,
  Palmtree,
  RefreshCw,
  UserCheck,
  UserPlus,
  Building2,
  AlertTriangle,
  History,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { useCompanies } from "@/hooks/use-companies";
import {
  useEmployees,
  usePayrollRuns,
  useLeaves,
  useDepartments,
} from "@/hooks/use-hr";
import { useNotifications } from "@/hooks/useNotifications";
import { useRouter } from "next/navigation";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  accent: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white rounded-3xl border border-border/60 p-5 flex items-center gap-4 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.12)] transition-all hover:scale-[1.015]">
      <div className={`p-3.5 rounded-2xl flex-shrink-0 ${accent}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-slate-800 leading-tight tabular-nums">
            {value}
          </p>
          {trend === "up" && (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          )}
          {trend === "down" && (
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          )}
        </div>
        {sub && (
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HRPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  const {
    data: employeesRes,
    isLoading: loadingEmployees,
    refetch: refetchEmployees,
  } = useEmployees(companyId);
  const {
    data: payrollRunsRes,
    isLoading: loadingPayroll,
    refetch: refetchPayroll,
  } = usePayrollRuns(companyId);
  const {
    data: leavesRes,
    isLoading: loadingLeaves,
    refetch: refetchLeaves,
  } = useLeaves(companyId);
  const { data: departmentsRes, refetch: refetchDepartments } =
    useDepartments(companyId);
  const { notifications } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchEmployees(),
      refetchPayroll(),
      refetchLeaves(),
      refetchDepartments(),
    ]);
    setLastRefresh(new Date());
    setRefreshing(false);
  }, [refetchEmployees, refetchPayroll, refetchLeaves, refetchDepartments]);

  // Safely extract data arrays
  const employees = employeesRes?.data || [];
  const payrollRuns = Array.isArray(payrollRunsRes) ? payrollRunsRes : [];
  const leaves = leavesRes?.data || [];
  const departments = Array.isArray(departmentsRes) ? departmentsRes : [];

  // ── Derived stats ───────────────────────────────────────────────────────────

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(
    (e: any) => e.status !== "terminated" && e.status !== "on_leave",
  ).length;
  const onLeaveCount = employees.filter(
    (e: any) => e.status === "on_leave",
  ).length;
  const terminatedCount = employees.filter(
    (e: any) => e.status === "terminated",
  ).length;

  const activeLeaves = leaves.filter(
    (l: any) => l.status === "approved" || l.status === "pending",
  );

  const monthlyPayroll = payrollRuns.reduce(
    (sum: number, run: any) => sum + (Number(run.total_cost) || 0),
    0,
  );

  const newHires = [...employees]
    .sort(
      (a: any, b: any) =>
        new Date(b.hire_date || b.created_at || 0).getTime() -
        new Date(a.hire_date || a.created_at || 0).getTime(),
    )
    .slice(0, 5);

  const recentHrNotifications = notifications
    .filter((n) => n.category === "hr")
    .slice(0, 5);
  const unreadCount = notifications.filter(
    (n) => n.category === "hr" && !n.is_read,
  ).length;

  const statusPct = (n: number) =>
    totalEmployees ? Math.round((n / totalEmployees) * 100) : 0;

  if (loadingEmployees || loadingPayroll || loadingLeaves) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
        <Users className="w-10 h-10 animate-pulse" />
        <p className="text-[11px] font-black uppercase tracking-widest">
          {t("hr.loading_hr_data", "Loading Core HR Data...")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Refresh bar ── */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <p className="text-[10px] text-slate-400 font-medium">
            {t("hr.last_updated", "Last updated")}{" "}
            {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
        >
          <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} />
          {refreshing
            ? t("hr.refreshing", "Refreshing...")
            : t("hr.refresh", "Refresh")}
        </button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={t("hr.stat_total_employees", "Total Employees")}
          value={totalEmployees}
          sub={t(
            "hr.stat_total_employees_sub",
            `${activeEmployees} Active | ${onLeaveCount} On Leave`,
          )}
          icon={Users}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          label={t("hr.stat_monthly_payroll", "Monthly Payroll")}
          value={fmtCurrency(monthlyPayroll)}
          sub={t("hr.stat_monthly_payroll_sub", "Total YTD disbursed")}
          icon={BadgeDollarSign}
          accent="bg-emerald-50 text-emerald-600"
          trend={monthlyPayroll > 0 ? "up" : "neutral"}
        />
        <StatCard
          label={t("hr.stat_departments", "Active Departments")}
          value={departments.length}
          sub={t("hr.stat_departments_sub", "Across the organization")}
          icon={Building2}
          accent="bg-violet-50 text-violet-600"
        />
        <StatCard
          label={t("hr.stat_leaves", "Active Leaves")}
          value={activeLeaves.length}
          sub={t("hr.stat_leaves_sub", "Approved & Pending requests")}
          icon={Palmtree}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* ── Workforce Health Bar ── */}
      <div className="bg-white rounded-3xl border border-border/60 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-black text-slate-700">
              {t("hr.workforce_status_title", "Workforce Status")}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {t(
                "hr.workforce_status_sub",
                `Distribution of ${totalEmployees} registered employees`,
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {activeEmployees} {t("hr.status_active", "Active")}
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {onLeaveCount} {t("hr.status_on_leave", "On Leave")}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              {terminatedCount} {t("hr.status_terminated", "Terminated")}
            </span>
          </div>
        </div>
        {/* Stacked bar */}
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
          {activeEmployees > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${statusPct(activeEmployees)}%` }}
              title={`Active: ${activeEmployees}`}
            />
          )}
          {onLeaveCount > 0 && (
            <div
              className="bg-amber-400 h-full transition-all"
              style={{ width: `${statusPct(onLeaveCount)}%` }}
              title={`On Leave: ${onLeaveCount}`}
            />
          )}
          {terminatedCount > 0 && (
            <div
              className="bg-slate-300 h-full transition-all"
              style={{ width: `${statusPct(terminatedCount)}%` }}
              title={`Terminated: ${terminatedCount}`}
            />
          )}
          {totalEmployees === 0 && (
            <div className="bg-slate-100 h-full w-full rounded-full" />
          )}
        </div>
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Recent Onboards */}
        <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">
                  {t("hr.recent_onboards_title", "Recent Onboards")}
                </p>
                <p className="text-[10px] text-slate-400">
                  {t("hr.recent_onboards_sub", "Latest talent additions")}
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
            {newHires.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <UserPlus className="w-8 h-8 mb-2" />
                <p className="text-[11px] font-bold">
                  {t("hr.no_recent_hires", "No recent hires found")}
                </p>
              </div>
            ) : (
              newHires.map((hire) => (
                <div
                  key={hire.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors cursor-pointer"
                  onClick={() => router.push("/hr/employees")}
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-[11px]">
                    {hire.first_name ? hire.first_name.charAt(0) : "N"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-bold text-slate-700 truncate">
                        {hire.first_name} {hire.last_name}
                      </p>
                      <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">
                        {hire.employee_code || "N/A"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {hire.department?.name || "General"} ·{" "}
                      {hire.position?.title || "Staff"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 text-[9px] text-slate-400 font-medium">
                    {fmtDate(
                      hire.hire_date ||
                        hire.created_at ||
                        new Date().toISOString(),
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: System & Leave Alerts */}
        <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 rounded-lg">
                <Bell className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">
                  {t("hr.notifications_title", "HR System Alerts")}
                </p>
                <p className="text-[10px] text-slate-400">
                  {t(
                    "hr.notifications_sub",
                    "Leave requests and performance updates",
                  )}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                {t("hr.unread_count", "{{count}} unread", {
                  count: unreadCount,
                })}
              </span>
            )}
          </div>
          <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
            {recentHrNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
                <p className="text-[11px] font-bold text-emerald-500">
                  {t("hr.all_caught_up", "All caught up!")}
                </p>
              </div>
            ) : (
              recentHrNotifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors cursor-pointer"
                  onClick={() => router.push("/hr/leave")}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                      !n.is_read ? "bg-orange-50" : "bg-slate-50",
                    )}
                  >
                    {!n.is_read ? (
                      <Activity className="w-4 h-4 text-orange-500" />
                    ) : (
                      <History className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-[12px] truncate",
                        !n.is_read
                          ? "font-bold text-slate-800"
                          : "font-semibold text-slate-700",
                      )}
                    >
                      {n.title}
                      {!n.is_read && (
                        <span className="inline-block w-1.5 h-1.5 bg-orange-500 rounded-full ml-2 animate-pulse" />
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-medium text-slate-400">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
