"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import { Button } from "@/components/shared/ui/button/Button";
import {
  Wrench,
  Search,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ShieldAlert,
  Calendar,
  Car,
  DollarSign,
  User,
  Gauge,
  FileText,
  RefreshCw,
  CalendarClock,
  TrendingDown,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type MaintenanceType = "routine" | "repair" | "inspection" | "emergency";

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  vehicle_label: string;
  vehicle_plate: string;
  vehicle_number: string;
  maintenance_date: string;
  type: MaintenanceType | null;
  description: string;
  cost: number | null;
  odometer_reading: number | null;
  performed_by: string | null;
  next_due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "routine", label: "Routine" },
  { value: "repair", label: "Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "emergency", label: "Emergency" },
] as const;

const TYPE_CONFIG: Record<
  MaintenanceType,
  { label: string; color: string; icon: React.ReactNode; badge: string }
> = {
  routine: {
    label: "Routine",
    color: "text-blue-600 bg-blue-50",
    icon: <Wrench className="w-3 h-3" />,
    badge: "default",
  },
  repair: {
    label: "Repair",
    color: "text-amber-600 bg-amber-50",
    icon: <AlertTriangle className="w-3 h-3" />,
    badge: "warning",
  },
  inspection: {
    label: "Inspection",
    color: "text-emerald-600 bg-emerald-50",
    icon: <CheckCircle2 className="w-3 h-3" />,
    badge: "success",
  },
  emergency: {
    label: "Emergency",
    color: "text-rose-600 bg-rose-50",
    icon: <ShieldAlert className="w-3 h-3" />,
    badge: "destructive",
  },
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4 shadow-sm min-w-0">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate">
          {label}
        </p>
        <p className="text-xl font-black text-slate-800 leading-tight tabular-nums">
          {value}
        </p>
        {sub && (
          <p className="text-[10px] text-slate-400 font-medium truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Due-date indicator ────────────────────────────────────────────────────────

function DueDateCell({ date }: { date: string | null }) {
  if (!date)
    return <span className="text-slate-300 text-[10px] italic">—</span>;

  const due = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);

  let cls = "text-slate-500";
  let label = "";
  if (diffDays < 0) {
    cls = "text-rose-600 font-bold";
    label = ` (${Math.abs(diffDays)}d overdue)`;
  } else if (diffDays <= 7) {
    cls = "text-amber-600 font-semibold";
    label = ` (in ${diffDays}d)`;
  }

  return (
    <div className={`flex items-center gap-1 text-[11px] ${cls}`}>
      <CalendarClock className="w-3 h-3 flex-shrink-0" />
      {due.toLocaleDateString()}
      {label && <span className="text-[9px]">{label}</span>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const [data, setData] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | MaintenanceType>("all");
  const [vehicleOptions, setVehicleOptions] = useState<
    { label: string; value: string }[]
  >([]);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [maintRes, vehRes] = await Promise.all([
        fetch("/api/fleet/maintenance"),
        fetch("/api/fleet/vehicles"),
      ]);

      const [maintData, vehList] = await Promise.all([
        maintRes.ok ? maintRes.json() : [],
        vehRes.ok ? vehRes.json() : [],
      ]);

      setData(maintData || []);
      setVehicleOptions(
        (vehList || []).map((v: any) => ({
          label: `${v.make ?? ""} ${v.model ?? ""} ${
            v.license_plate ? "· " + v.license_plate : ""
          }`.trim(),
          value: v.id,
        }))
      );
    } catch (err) {
      console.error("[Maintenance Page] Load failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const totalCost = data.reduce((s, r) => s + (r.cost ?? 0), 0);
    const overdue = data.filter(
      (r) => r.next_due_date && new Date(r.next_due_date) < now
    ).length;
    const dueSoon = data.filter((r) => {
      if (!r.next_due_date) return false;
      const d = new Date(r.next_due_date);
      const diff = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
      return diff >= 0 && diff <= 7;
    }).length;
    const emergencies = data.filter((r) => r.type === "emergency").length;
    return { total: data.length, totalCost, overdue, dueSoon, emergencies };
  }, [data]);

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    return data.filter((r) => {
      const q = searchTerm.toLowerCase();
      const haystack = [
        r.description,
        r.vehicle_label,
        r.vehicle_plate,
        r.performed_by,
        r.notes,
        r.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [data, searchTerm, typeFilter]);

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      // Vehicle
      {
        header: "Vehicle",
        accessorKey: "vehicle_id",
        meta: {
          type: "select" as const,
          options: vehicleOptions,
        },
        cell: ({ row }: any) => {
          const { vehicle_label, vehicle_plate } = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-100 rounded-lg flex-shrink-0">
                <Car className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-700 leading-tight">
                  {vehicle_label || "—"}
                </p>
                {vehicle_plate && (
                  <p className="text-[9px] font-mono text-slate-400">
                    {vehicle_plate}
                  </p>
                )}
              </div>
            </div>
          );
        },
      },
      // Type
      {
        header: "Type",
        accessorKey: "type",
        meta: {
          type: "select" as const,
          options: TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
        },
        cell: ({ row }: any) => {
          const t = row.original.type as MaintenanceType | null;
          if (!t)
            return <span className="text-slate-300 text-[10px] italic">—</span>;
          const cfg = TYPE_CONFIG[t];
          return (
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${cfg.color}`}
            >
              {cfg.icon}
              {cfg.label}
            </div>
          );
        },
      },
      // Description
      {
        header: "Description",
        accessorKey: "description",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <div className="flex items-start gap-1.5 max-w-[240px]">
            <FileText className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
            <span className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
              {row.original.description || "—"}
            </span>
          </div>
        ),
      },
      // Date
      {
        header: "Date",
        accessorKey: "maintenance_date",
        meta: { type: "date" as const },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
            {row.original.maintenance_date
              ? new Date(row.original.maintenance_date).toLocaleDateString()
              : "—"}
          </div>
        ),
      },
      // Cost
      {
        header: "Cost",
        accessorKey: "cost",
        meta: { type: "number" as const },
        cell: ({ row }: any) => {
          const cost = row.original.cost;
          if (cost === null || cost === undefined)
            return <span className="text-slate-300 text-[10px] italic">—</span>;
          return (
            <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-700">
              <DollarSign className="w-3 h-3 text-emerald-500" />
              {Number(cost).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          );
        },
      },
      // Odometer
      {
        header: "Odometer",
        accessorKey: "odometer_reading",
        meta: { type: "number" as const },
        cell: ({ row }: any) => {
          const odometer = row.original.odometer_reading;
          if (odometer === null || odometer === undefined)
            return <span className="text-slate-300 text-[10px] italic">—</span>;
          return (
            <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono">
              <Gauge className="w-3 h-3 text-slate-400 flex-shrink-0" />
              {Number(odometer).toLocaleString()} km
            </div>
          );
        },
      },
      // Performed By
      {
        header: "Performed By",
        accessorKey: "performed_by",
        meta: { type: "text" as const },
        cell: ({ row }: any) => {
          const by = row.original.performed_by;
          if (!by)
            return <span className="text-slate-300 text-[10px] italic">—</span>;
          return (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
              {by}
            </div>
          );
        },
      },
      // Next Due Date
      {
        header: "Next Due",
        accessorKey: "next_due_date",
        meta: { type: "date" as const },
        cell: ({ row }: any) => (
          <DueDateCell date={row.original.next_due_date} />
        ),
      },
      // Notes
      {
        header: "Notes",
        accessorKey: "notes",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="text-[10px] text-slate-400 line-clamp-1 max-w-[160px] block">
            {row.original.notes || (
              <span className="italic text-slate-200">—</span>
            )}
          </span>
        ),
      },
    ],
    [vehicleOptions]
  );

  // ── CRUD Handlers ──────────────────────────────────────────────────────────

  const handleAdd = async (newItem: any) => {
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: newItem.vehicle_id || null,
          maintenance_date:
            newItem.maintenance_date ||
            new Date().toISOString().split("T")[0],
          type: newItem.type || "routine",
          description: newItem.description || "",
          cost: newItem.cost || null,
          odometer_reading: newItem.odometer_reading || null,
          performed_by: newItem.performed_by || null,
          next_due_date: newItem.next_due_date || null,
          notes: newItem.notes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create record");
      }
      await loadAll(true);
    } catch (err) {
      console.error("[Maintenance] Add error:", err);
      throw err;
    }
  };

  const handleUpdate = async (id: string, updatedFields: any) => {
    // Optimistic update
    const previous = [...data];
    setData((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updatedFields } : r))
    );
    try {
      const res = await fetch("/api/fleet/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedFields }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      await loadAll(true);
    } catch (err) {
      setData(previous);
      console.error("[Maintenance] Update error:", err);
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/fleet/maintenance?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      setData((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("[Maintenance] Delete error:", err);
      throw err;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
    

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Records"
          value={stats.total}
          icon={<ClipboardList className="w-5 h-5 text-slate-600" />}
          accent="bg-slate-100"
        />
        <StatCard
          label="Total Spent"
          value={`$${stats.totalCost.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          icon={<TrendingDown className="w-5 h-5 text-emerald-600" />}
          accent="bg-emerald-50"
        />
        <StatCard
          label="Due Soon"
          value={stats.dueSoon}
          sub="within 7 days"
          icon={<CalendarClock className="w-5 h-5 text-amber-600" />}
          accent="bg-amber-50"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          sub="past next due date"
          icon={<ShieldAlert className="w-5 h-5 text-rose-600" />}
          accent="bg-rose-50"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row items-center gap-2 px-1">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search description, vehicle, technician…"
            className="pl-9 h-8 text-[11px] bg-slate-50/60 border-slate-200/60 rounded-xl focus:bg-white transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-0.5 bg-slate-100/30 p-0.5 rounded-xl border border-slate-200/40">
          <Button
            variant={typeFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className={`h-7 px-3 text-[9px] font-black uppercase rounded-lg ${
              typeFilter === "all" ? "bg-white shadow-sm" : ""
            }`}
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          {(["routine", "inspection", "repair", "emergency"] as const).map(
            (t) => {
              const cfg = TYPE_CONFIG[t];
              return (
                <Button
                  key={t}
                  variant={typeFilter === t ? "secondary" : "ghost"}
                  size="sm"
                  className={`h-7 px-2.5 text-[9px] font-black uppercase rounded-lg gap-1 ${
                    typeFilter === t ? "bg-white shadow-sm" : ""
                  }`}
                  onClick={() => setTypeFilter(t)}
                >
                  {cfg.icon}
                  {cfg.label}
                </Button>
              );
            }
          )}
        </div>

        {/* Record count */}
        <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
          {filteredData.length} of {data.length} records
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm min-h-[560px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Wrench className="w-8 h-8 animate-pulse" />
            <p className="text-[11px] font-black uppercase tracking-widest">
              Loading maintenance records…
            </p>
          </div>
        ) : (
          <EditableTable
            title="Maintenance Records"
            description="Click any row to edit inline. Use the + button to log a new service event."
            data={filteredData}
            columns={columns}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* ── Overdue Banner ── */}
      {!loading && stats.overdue > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <p className="text-[11px] font-bold">
            {stats.overdue} vehicle
            {stats.overdue > 1 ? "s have" : " has"} overdue maintenance. Review
            the <span className="underline">Next Due</span> column and schedule
            service immediately.
          </p>
        </div>
      )}
    </div>
  );
}
