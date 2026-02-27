"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Users,
  Car,
  Search,
  Calendar,
  Mail,
  AlertCircle,
  Clock,
  BadgeCheck,
} from "lucide-react";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import { Button } from "@/components/shared/ui/button/Button";

interface Assignment {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  start_date: string;
  end_date: string | null;
  notes: string;
  driver_name: string;
  driver_email: string;
  driver_title: string;
  driver_code: string;
  vehicle_label: string | null;
  vehicle_plate: string;
}

export default function DriversPage() {
  const [data, setData] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">("all");

  const [employeeOptions, setEmployeeOptions] = useState<{ label: string; value: string }[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<{ label: string; value: string }[]>([]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [assignRes, empRes, vehRes] = await Promise.all([
        fetch("/api/fleet/drivers"),
        fetch("/api/hr/employees"),
        fetch("/api/fleet/vehicles"),
      ]);

      const [assignments, empList, vehList] = await Promise.all([
        assignRes.ok ? assignRes.json() : [],
        empRes.ok ? empRes.json() : [],
        vehRes.ok ? vehRes.json() : [],
      ]);

      setData(assignments || []);

      setEmployeeOptions(
        (empList || []).map((e: any) => ({
          label: e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim(),
          value: e.id,
        }))
      );

      setVehicleOptions([
        { label: "— No Vehicle —", value: "none" },
        ...(vehList || []).map((v: any) => ({
          label: `${v.make || ""} ${v.model || ""} ${v.license_plate ? "· " + v.license_plate : ""}`.trim(),
          value: v.id,
        })),
      ]);
    } catch (error) {
      console.error("Failed to load driver assignments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const isActive = (a: Assignment) =>
    !a.end_date || new Date(a.end_date) >= new Date();

  const filteredData = useMemo(() => {
    return data.filter((a) => {
      const searchStr =
        `${a.driver_name} ${a.driver_email} ${a.vehicle_label || ""} ${a.vehicle_plate} ${a.notes}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const active = isActive(a);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "ended" && !active);
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: data.length,
      active: data.filter(isActive).length,
      withVehicle: data.filter((a) => a.vehicle_id && isActive(a)).length,
    }),
    [data]
  );

  const columns = useMemo(
    () => [
      {
        header: "Driver",
        accessorKey: "driver_id",
        meta: {
          type: "select" as const,
          options: employeeOptions,
        },
        cell: ({ row }: any) => {
          const initials = row.original.driver_name
            .split(" ")
            .map((n: string) => n[0] || "")
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xs shadow-md flex-shrink-0">
                {initials || "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {row.original.driver_name}
                </p>
                {row.original.driver_email && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Mail className="w-2.5 h-2.5" />
                    {row.original.driver_email}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: "Vehicle",
        accessorKey: "vehicle_id",
        meta: {
          type: "select" as const,
          options: vehicleOptions,
        },
        cell: ({ row }: any) => {
          const { vehicle_label, vehicle_plate } = row.original;
          if (!vehicle_label)
            return (
              <span className="text-slate-300 italic text-[10px] flex items-center gap-1">
                <Car className="w-3 h-3" /> No vehicle
              </span>
            );
          return (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Car className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-700">{vehicle_label}</p>
                {vehicle_plate && (
                  <p className="text-[9px] font-mono text-slate-400">{vehicle_plate}</p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: "Start Date",
        accessorKey: "start_date",
        meta: { type: "date" as const },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <Calendar className="w-3 h-3 text-slate-400" />
            {row.original.start_date
              ? new Date(row.original.start_date).toLocaleDateString()
              : "—"}
          </div>
        ),
      },
      {
        header: "End Date",
        accessorKey: "end_date",
        meta: { type: "date" as const },
        cell: ({ row }: any) => {
          const endDate = row.original.end_date;
          if (!endDate)
            return (
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                <BadgeCheck className="w-3 h-3" /> Active
              </div>
            );
          const past = new Date(endDate) < new Date();
          return (
            <div
              className={`flex items-center gap-1 text-[10px] font-semibold ${
                past ? "text-slate-400" : "text-orange-500"
              }`}
            >
              {!past && <Clock className="w-3 h-3" />}
              {new Date(endDate).toLocaleDateString()}
            </div>
          );
        },
      },
      {
        header: "Notes",
        accessorKey: "notes",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="text-[11px] text-slate-500 truncate max-w-[200px] block">
            {row.original.notes || (
              <span className="text-slate-200 italic">—</span>
            )}
          </span>
        ),
      },
      {
        header: "Status",
        accessorKey: "assignment_status",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          const active = isActive(row.original);
          return (
            <Badge
              variant={active ? "success" : "default"}
              className="text-[9px] px-2"
            >
              {active ? "Active" : "Ended"}
            </Badge>
          );
        },
      },
    ],
    [employeeOptions, vehicleOptions]
  );

  const handleAdd = async (newItem: any) => {
    try {
      const vehicleId = newItem.vehicle_id === "none" || !newItem.vehicle_id ? null : newItem.vehicle_id;
      const res = await fetch("/api/fleet/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: newItem.driver_id,
          vehicle_id: vehicleId,
          start_date: newItem.start_date || new Date().toISOString().split("T")[0],
          end_date: newItem.end_date || null,
          notes: newItem.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add assignment");
      await loadAll();
    } catch (err) {
      console.error("Failed to add assignment:", err);
    }
  };

  const handleUpdate = async (id: string, updatedFields: any) => {
    const previousData = [...data];
    setData((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updatedFields } : a))
    );
    try {
      const res = await fetch("/api/fleet/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedFields }),
      });
      if (!res.ok) throw new Error("Update failed");
      await loadAll();
    } catch {
      setData(previousData);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/fleet/drivers?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setData((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <div className="space-y-1">
      {/* Control Bar */}
      <div className="px-1 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search driver, vehicle..."
              className="pl-8 h-8 border-slate-200/60 rounded-lg bg-slate-50/10 text-[11px] focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-0.5 bg-slate-100/30 p-0.5 rounded-lg border border-slate-200/40">
            {(["all", "active", "ended"] as const).map((f) => (
              <Button
                key={f}
                variant={statusFilter === f ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 px-2.5 text-[9px] font-bold uppercase rounded-md gap-1 ${
                  statusFilter === f ? "bg-white shadow-sm" : ""
                }`}
                onClick={() => setStatusFilter(f)}
              >
                {f === "active" && (
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                )}
                {f}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
          <span>{stats.total} Total</span>
          <span className="text-emerald-500">{stats.active} Active</span>
          <span className="text-blue-500">{stats.withVehicle} With Vehicle</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm min-h-[560px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Users className="w-8 h-8 animate-pulse" />
            <p className="text-[11px] font-black uppercase tracking-widest">
              Loading assignments...
            </p>
          </div>
        ) : (
          <EditableTable
            title="Driver Assignments"
            description="Link employees to vehicles. Use the + button to create a new assignment."
            data={filteredData}
            columns={columns}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
