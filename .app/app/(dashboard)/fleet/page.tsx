"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Truck,
  Users,
  Wrench,
  Fuel,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  ShieldAlert,
  Car,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  CalendarClock,
  Map,
  RefreshCw,
  Gauge,
  Route,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/shared/ui/badge/Badge";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FleetStats {
  vehicles: {
    total: number;
    active: number;
    maintenance: number;
    retired: number;
    online: number; // live from Traccar
    assigned: number; // have a current driver
  };
  drivers: {
    total: number;
    active: number;
    without_vehicle: number;
  };
  maintenance: {
    total_records: number;
    overdue: number;
    due_soon: number; // next 7 days
    total_cost_30d: number;
    emergency_count: number;
  };
  fuel: {
    total_cost_30d: number;
    total_litres_30d: number;
    logs_30d: number;
  };
  trips: {
    active: number; // no end_time
    completed_30d: number;
    total_distance_30d: number;
  };
}

interface VehicleRow {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  license_plate: string;
  status: "active" | "maintenance" | "retired";
  assigned_driver_id: string | null;
  last_known_lat: number | null;
  last_known_lng: number | null;
  last_location_at: string | null;
  ignition_status: boolean;
  is_active: boolean;
  traccar_status: string | null;
  driver_name?: string;
}

interface MaintenanceAlert {
  id: string;
  vehicle_number: string;
  vehicle_make: string;
  vehicle_model: string;
  license_plate: string;
  type: string;
  description: string;
  next_due_date: string;
  days_overdue: number;
}

interface RecentActivity {
  id: string;
  kind: "maintenance" | "fuel" | "trip" | "driver";
  label: string;
  sub: string;
  time: string;
  icon: "wrench" | "fuel" | "route" | "user";
}

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 px-0.5">
      {children}
    </h2>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FleetOverviewPage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [vRes, dRes, mRes, fRes] = await Promise.all([
        fetch("/api/fleet/vehicles"),
        fetch("/api/fleet/drivers"),
        fetch("/api/fleet/maintenance"),
        fetch("/api/fleet/fuel-logs").catch(() => ({ ok: false })),
      ]);

      const [vData, dData, mData, fData] = await Promise.all([
        vRes.ok ? (vRes as Response).json() : [],
        dRes.ok ? (dRes as Response).json() : [],
        mRes.ok ? (mRes as Response).json() : [],
        (fRes as any).ok ? (fRes as Response).json() : [],
      ]);

      setVehicles(vData || []);
      setDrivers(dData || []);
      setMaintenance(mData || []);
      setFuelLogs(fData || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("[Fleet Overview] load failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    // Auto-refresh every 60s for live GPS
    const interval = setInterval(() => loadAll(true), 60_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  // ── Derived stats ───────────────────────────────────────────────────────────

  const now = new Date();
  const cutoff30d = new Date(now.getTime() - 30 * 86_400_000);

  const stats: FleetStats = {
    vehicles: {
      total: vehicles.length,
      active: vehicles.filter((v) => v.status === "active").length,
      maintenance: vehicles.filter((v) => v.status === "maintenance").length,
      retired: vehicles.filter((v) => v.status === "retired").length,
      online: vehicles.filter(
        (v) => v.is_active || v.traccar_status?.trim() === "online",
      ).length,
      assigned: vehicles.filter((v) => v.assigned_driver_id).length,
    },
    drivers: {
      total: Array.from(new Set(drivers.map((d) => d.driver_id))).length,
      active: drivers.filter((d) => !d.end_date || new Date(d.end_date) >= now)
        .length,
      without_vehicle: drivers.filter(
        (d) => (!d.end_date || new Date(d.end_date) >= now) && !d.vehicle_id,
      ).length,
    },
    maintenance: {
      total_records: maintenance.length,
      overdue: maintenance.filter(
        (m) => m.next_due_date && new Date(m.next_due_date) < now,
      ).length,
      due_soon: maintenance.filter((m) => {
        if (!m.next_due_date) return false;
        const d = new Date(m.next_due_date);
        const diff = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
        return diff >= 0 && diff <= 7;
      }).length,
      total_cost_30d: maintenance
        .filter(
          (m) =>
            m.maintenance_date && new Date(m.maintenance_date) >= cutoff30d,
        )
        .reduce((s, m) => s + (m.cost ?? 0), 0),
      emergency_count: maintenance.filter((m) => m.type === "emergency").length,
    },
    fuel: {
      total_cost_30d: fuelLogs
        .filter((f) => f.fuel_date && new Date(f.fuel_date) >= cutoff30d)
        .reduce((s, f) => s + (f.total_cost ?? 0), 0),
      total_litres_30d: fuelLogs
        .filter((f) => f.fuel_date && new Date(f.fuel_date) >= cutoff30d)
        .reduce((s, f) => s + (f.quantity ?? 0), 0),
      logs_30d: fuelLogs.filter(
        (f) => f.fuel_date && new Date(f.fuel_date) >= cutoff30d,
      ).length,
    },
    trips: {
      active: 0,
      completed_30d: 0,
      total_distance_30d: 0,
    },
  };

  // Maintenance alerts (overdue + due soon)
  const maintenanceAlerts: MaintenanceAlert[] = maintenance
    .filter((m) => m.next_due_date)
    .map((m) => ({
      id: m.id,
      vehicle_number: m.vehicle_number || "",
      vehicle_make: m.vehicle_label?.split(" ")[0] || "",
      vehicle_model: m.vehicle_label?.split(" ").slice(1).join(" ") || "",
      license_plate: m.vehicle_plate || "",
      type: m.type || "routine",
      description: m.description,
      next_due_date: m.next_due_date,
      days_overdue: Math.ceil(
        (now.getTime() - new Date(m.next_due_date).getTime()) / 86_400_000,
      ),
    }))
    .filter((a) => a.days_overdue >= -7)
    .sort((a, b) => b.days_overdue - a.days_overdue)
    .slice(0, 6);

  // Recent maintenance activity (last 5)
  const recentMaintenance = [...maintenance]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  // Recent fuel logs (last 5)
  const recentFuel = [...fuelLogs]
    .sort(
      (a, b) =>
        new Date(b.created_at || b.fuel_date).getTime() -
        new Date(a.created_at || a.fuel_date).getTime(),
    )
    .slice(0, 5);

  // Vehicles with GPS online
  const onlineVehicles = vehicles.filter(
    (v) => v.is_active || v.traccar_status?.trim() === "online",
  );

  // Status breakdown for bar
  const statusPct = (n: number) =>
    vehicles.length ? Math.round((n / vehicles.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
        <Truck className="w-10 h-10 animate-pulse" />
        <p className="text-[11px] font-black uppercase tracking-widest">
          Loading Fleet Overview…
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
            Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes
            every 60s
          </p>
        </div>
        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
        >
          <RefreshCw
            className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Vehicles"
          value={stats.vehicles.total}
          sub={`${stats.vehicles.active} active · ${stats.vehicles.maintenance} in service`}
          icon={Truck}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="GPS Online"
          value={stats.vehicles.online}
          sub={`of ${stats.vehicles.total} vehicles tracked`}
          icon={Wifi}
          accent="bg-emerald-50 text-emerald-600"
          trend={stats.vehicles.online > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Active Drivers"
          value={stats.drivers.active}
          sub={`${stats.drivers.without_vehicle} without vehicle`}
          icon={Users}
          accent="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Maintenance Cost"
          value={fmtCurrency(stats.maintenance.total_cost_30d)}
          sub="last 30 days"
          icon={Wrench}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* ── Second row KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Overdue Maintenance"
          value={stats.maintenance.overdue}
          sub={`${stats.maintenance.due_soon} due this week`}
          icon={AlertTriangle}
          accent={
            stats.maintenance.overdue > 0
              ? "bg-rose-50 text-rose-600"
              : "bg-slate-100 text-slate-500"
          }
          trend={stats.maintenance.overdue > 0 ? "down" : "neutral"}
        />
        <StatCard
          label="Fuel Spend (30d)"
          value={fmtCurrency(stats.fuel.total_cost_30d)}
          sub={`${stats.fuel.total_litres_30d.toFixed(0)}L · ${stats.fuel.logs_30d} fill-ups`}
          icon={Fuel}
          accent="bg-sky-50 text-sky-600"
        />
        <StatCard
          label="Vehicles Assigned"
          value={stats.vehicles.assigned}
          sub={`${stats.vehicles.total - stats.vehicles.assigned} unassigned`}
          icon={Car}
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Emergency Alerts"
          value={stats.maintenance.emergency_count}
          sub="emergency maintenance records"
          icon={ShieldAlert}
          accent={
            stats.maintenance.emergency_count > 0
              ? "bg-rose-50 text-rose-600"
              : "bg-slate-100 text-slate-500"
          }
          trend={stats.maintenance.emergency_count > 0 ? "down" : "neutral"}
        />
      </div>

      {/* ── Fleet Health Bar ── */}
      <div className="bg-white rounded-3xl border border-border/60 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-black text-slate-700">
              Fleet Health Overview
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Status breakdown across {stats.vehicles.total} registered vehicles
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {stats.vehicles.active} Active
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {stats.vehicles.maintenance} In Service
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              {stats.vehicles.retired} Retired
            </span>
          </div>
        </div>
        {/* Stacked bar */}
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
          {stats.vehicles.active > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${statusPct(stats.vehicles.active)}%` }}
              title={`Active: ${stats.vehicles.active}`}
            />
          )}
          {stats.vehicles.maintenance > 0 && (
            <div
              className="bg-amber-400 h-full transition-all"
              style={{ width: `${statusPct(stats.vehicles.maintenance)}%` }}
              title={`In Service: ${stats.vehicles.maintenance}`}
            />
          )}
          {stats.vehicles.retired > 0 && (
            <div
              className="bg-slate-300 h-full transition-all"
              style={{ width: `${statusPct(stats.vehicles.retired)}%` }}
              title={`Retired: ${stats.vehicles.retired}`}
            />
          )}
          {stats.vehicles.total === 0 && (
            <div className="bg-slate-100 h-full w-full rounded-full" />
          )}
        </div>
      </div>

      {/* ── Main 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Live GPS Panel */}
        <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <Navigation className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">
                  Live GPS Tracking
                </p>
                <p className="text-[10px] text-slate-400">
                  {onlineVehicles.length} of {vehicles.length} vehicles online
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
            {vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <WifiOff className="w-8 h-8 mb-2" />
                <p className="text-[11px] font-bold">No vehicles registered</p>
              </div>
            ) : (
              vehicles.map((v) => {
                const online =
                  v.is_active || v.traccar_status?.trim() === "online";
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Status dot */}
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        online
                          ? "bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                          : "bg-slate-300",
                      )}
                    />
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                        v.status === "maintenance"
                          ? "bg-amber-50"
                          : online
                            ? "bg-blue-50"
                            : "bg-slate-100",
                      )}
                    >
                      <Truck
                        className={cn(
                          "w-4 h-4",
                          v.status === "maintenance"
                            ? "text-amber-500"
                            : online
                              ? "text-blue-500"
                              : "text-slate-400",
                        )}
                      />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-bold text-slate-700 truncate">
                          {v.make} {v.model}
                        </p>
                        <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">
                          {v.license_plate || v.vehicle_number}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {v.last_known_lat
                          ? `${Number(v.last_known_lat).toFixed(4)}, ${Number(v.last_known_lng).toFixed(4)}`
                          : "No GPS signal"}
                        {v.last_location_at && (
                          <span className="ml-1 text-slate-300">
                            · {timeAgo(v.last_location_at)}
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Right badges */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge
                        variant={online ? "success" : "default"}
                        className="text-[8px] px-1.5 py-0"
                      >
                        {online ? "Online" : "Offline"}
                      </Badge>
                      {v.ignition_status && (
                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          Running
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Maintenance Alerts */}
        <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-50 rounded-lg">
                <Wrench className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">
                  Maintenance Alerts
                </p>
                <p className="text-[10px] text-slate-400">
                  Overdue & due within 7 days
                </p>
              </div>
            </div>
            {stats.maintenance.overdue > 0 && (
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                {stats.maintenance.overdue} overdue
              </span>
            )}
          </div>
          <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
            {maintenanceAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
                <p className="text-[11px] font-bold text-emerald-500">
                  All maintenance up to date!
                </p>
              </div>
            ) : (
              maintenanceAlerts.map((a) => {
                const overdue = a.days_overdue > 0;
                const dueSoon = !overdue && a.days_overdue >= -7;
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                        overdue ? "bg-rose-50" : "bg-amber-50",
                      )}
                    >
                      {overdue ? (
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-700 truncate">
                        {a.vehicle_make} {a.vehicle_model}
                        <span className="font-mono font-normal text-slate-400 ml-1 text-[10px]">
                          {a.license_plate}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {a.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full",
                            overdue
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {overdue
                            ? `${a.days_overdue}d overdue`
                            : `Due ${fmtDate(a.next_due_date)}`}
                        </span>
                        <span className="text-[9px] text-slate-400 capitalize">
                          {a.type}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom 2-col: Recent Activity + Drivers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Maintenance Events */}
        <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">
                  Recent Maintenance
                </p>
                <p className="text-[10px] text-slate-400">
                  Latest service records
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {recentMaintenance.length === 0 ? (
              <div className="py-12 text-center text-slate-300">
                <Wrench className="w-7 h-7 mx-auto mb-2" />
                <p className="text-[11px] font-bold">No maintenance records</p>
              </div>
            ) : (
              recentMaintenance.map((m) => {
                const typeColors: Record<string, string> = {
                  routine: "bg-blue-50 text-blue-600",
                  repair: "bg-amber-50 text-amber-600",
                  inspection: "bg-emerald-50 text-emerald-600",
                  emergency: "bg-rose-50 text-rose-600",
                };
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                        typeColors[m.type] || "bg-slate-100 text-slate-500",
                      )}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-700 truncate">
                        {m.vehicle_label || m.vehicle_number}
                        <span className="font-mono font-normal text-slate-400 ml-1 text-[10px]">
                          {m.vehicle_plate}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {m.description}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                      {m.cost != null && (
                        <span className="text-[10px] font-bold text-slate-700 font-mono">
                          {fmtCurrency(m.cost)}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400">
                        {fmtDate(m.maintenance_date)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Drivers Panel */}
        <div className="bg-white rounded-3xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-50 rounded-lg">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">
                  Active Driver Roster
                </p>
                <p className="text-[10px] text-slate-400">
                  Current assignments · {stats.drivers.active} active
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border/30 max-h-[380px] overflow-y-auto">
            {drivers.length === 0 ? (
              <div className="py-12 text-center text-slate-300">
                <Users className="w-7 h-7 mx-auto mb-2" />
                <p className="text-[11px] font-bold">No drivers registered</p>
              </div>
            ) : (
              drivers
                .filter((d) => !d.end_date || new Date(d.end_date) >= now)
                .map((d) => {
                  const initials = (d.driver_name || "?")
                    .split(" ")
                    .map((n: string) => n[0] || "")
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const vehicleLinked = !!d.vehicle_id;
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-700 leading-tight">
                          {d.driver_name}
                        </p>
                        {d.driver_title && (
                          <p className="text-[9px] text-slate-400">
                            {d.driver_title}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {vehicleLinked ? (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            <Car className="w-2.5 h-2.5" />
                            {d.vehicle_label || d.vehicle_plate || "Vehicle"}
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">
                            No vehicle
                          </span>
                        )}
                        <span className="text-[8px] text-slate-400">
                          since {fmtDate(d.start_date)}
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* ── Fuel Logs Summary ── */}
      {fuelLogs.length > 0 && (
        <div className="bg-white rounded-3xl border border-border/60 shadow-sm">
          <div className="px-5 pt-5 pb-3 border-b border-border/40 flex items-center gap-2">
            <div className="p-1.5 bg-sky-50 rounded-lg">
              <Fuel className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-700">
                Recent Fuel Logs
              </p>
              <p className="text-[10px] text-slate-400">
                Last 30 days · {fmtCurrency(stats.fuel.total_cost_30d)} total
                spend
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/30">
            {recentFuel.map((f) => (
              <div key={f.id} className="px-4 py-3 flex flex-col gap-0.5">
                <p className="text-[11px] font-bold text-slate-700 truncate">
                  {f.vehicle_label || f.vehicle_number || "Vehicle"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {f.quantity?.toFixed(1)}L · {fmtDate(f.fuel_date)}
                </p>
                {f.total_cost != null && (
                  <p className="text-[11px] font-black text-sky-600 font-mono">
                    {fmtCurrency(f.total_cost)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overdue warning banner ── */}
      {stats.maintenance.overdue > 0 && (
        <div className="flex items-start gap-3 px-5 py-4 bg-rose-50 border border-rose-200 rounded-3xl">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-rose-700">
              {stats.maintenance.overdue} vehicle
              {stats.maintenance.overdue > 1 ? "s have" : " has"} overdue
              maintenance
            </p>
            <p className="text-[11px] text-rose-500 mt-0.5">
              Navigate to <strong>Maintenance</strong> to review and schedule
              service appointments immediately.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
