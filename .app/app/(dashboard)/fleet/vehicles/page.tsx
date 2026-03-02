"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import {
  EditableTable,
  type VirtualColumn,
} from "@/components/shared/table/EditableTable";
import {
  Truck,
  Plus,
  Map,
  List,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import dynamic from "next/dynamic";
import { useCompanies } from "@/hooks/use-companies";
import {
  getFleetTableViewAction,
  createFleetCustomFieldAction,
  updateFleetCustomFieldAction,
  deleteFleetCustomFieldAction,
} from "@/app/api/fleet/fleet";

// Dynamically import Map to avoid SSR issues with Leaflet
const VehicleMap = dynamic(
  () => import("@/components/fleet/vehicles/VehicleMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] flex items-center justify-center bg-slate-50 text-slate-400">
        Loading Map Environment...
      </div>
    ),
  },
);

export default function VehiclesPage() {
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  const [data, setData] = useState<any[]>([]);
  // drivers: shaped records from driver_assignments (each has driver_id + driver_name)
  const [drivers, setDrivers] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [vRes, dRes, tRes] = await Promise.all([
        fetch("/api/fleet/vehicles"),
        fetch("/api/fleet/drivers"),
        fetch("/api/fleet/vehicle-types"),
      ]);

      const [vehicles, driverList, typeList] = await Promise.all([
        vRes.ok ? vRes.json() : [],
        dRes.ok ? dRes.json() : [],
        tRes.ok ? tRes.json() : [],
      ]);

      setData(vehicles || []);
      setDrivers(driverList || []);
      setVehicleTypes(typeList || []);

      // Load virtual column definitions separately (non-blocking)
      if (companyId) {
        getFleetTableViewAction({
          companyId,
          table: "vehicles",
          page: 1,
          pageSize: 1,
        })
          .then((viewRes) => {
            if (viewRes.success && viewRes.data) {
              setColumnDefs(viewRes.data.columnDefinitions || []);
            }
          })
          .catch((err) => {
            console.error("Failed to load column definitions:", err);
          });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [companyId]);

  // Build unique driver options from driver_assignments.
  // driver_id is the UUID of the employee; driver_name is the display label.
  // Use 'none' as the sentinel for "Unassigned" — never use '' as a Select value.
  const driverOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [
      { label: "— Unassigned —", value: "none" },
    ];
    for (const d of drivers) {
      if (d.driver_id && !seen.has(d.driver_id)) {
        seen.add(d.driver_id);
        opts.push({ label: d.driver_name || d.driver_id, value: d.driver_id });
      }
    }
    return opts;
  }, [drivers]);

  const virtualColumns = useMemo((): VirtualColumn[] => {
    return columnDefs.map((def) => ({
      id: def.id,
      label: def.field_label,
      key: def.field_name,
      type: (def.field_type as any) || "text",
      options: def.field_options
        ? (def.field_options as string[]).map((o) => ({ label: o, value: o }))
        : undefined,
    }));
  }, [columnDefs]);

  const columns = useMemo(
    () => [
      {
        header: "Make",
        accessorKey: "make",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="text-sm font-medium text-slate-700">
            {row.original.make || "-"}
          </span>
        ),
      },
      {
        header: "Model",
        accessorKey: "model",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="text-sm font-medium text-slate-700">
            {row.original.model || "-"}
          </span>
        ),
      },
      {
        header: "Year",
        accessorKey: "year",
        meta: { type: "number" as const },
        cell: ({ row }: any) => (
          <span className="text-sm text-slate-600">
            {row.original.year || "-"}
          </span>
        ),
      },
      {
        header: "Vehicle Type",
        accessorKey: "vehicle_type_id",
        meta: {
          type: "select" as const,
          options: vehicleTypes.map((t) => ({ label: t.name, value: t.id })),
        },
        cell: ({ row }: any) => {
          const typeId = row.original.vehicle_type_id;
          const type = vehicleTypes.find((t) => t.id === typeId);
          return (
            <span className="text-xs font-semibold text-slate-600">
              {type?.name || "-"}
            </span>
          );
        },
      },
      {
        header: "VIN",
        accessorKey: "vin",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="font-mono text-[10px] text-slate-500">
            {row.original.vin || "-"}
          </span>
        ),
      },
      {
        header: "Plate",
        accessorKey: "license_plate",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="font-mono text-xs text-slate-600">
            {row.original.license_plate || "-"}
          </span>
        ),
      },
      {
        header: "Driver",
        accessorKey: "assigned_driver_id",
        meta: {
          type: "select" as const,
          options: driverOptions,
        },
        cell: ({ row }: any) => {
          const driverId = row.original.assigned_driver_id;
          // Find the driver record from driver_assignments that matches this vehicle's assigned driver
          const driverRecord = drivers.find((d) => d.driver_id === driverId);
          if (!driverId || !driverRecord)
            return (
              <span className="text-muted-foreground italic text-xs">
                Unassigned
              </span>
            );
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-[9px] font-black flex-shrink-0">
                {(driverRecord.driver_name || "?")
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 leading-tight">
                  {driverRecord.driver_name}
                </p>
                {driverRecord.driver_title && (
                  <p className="text-[9px] text-slate-400 leading-tight">
                    {driverRecord.driver_title}
                  </p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: "GPS Status",
        accessorKey: "traccar_status",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          // Same logic as VehicleMap: only traccar_status === "online" is truly online
          const isOnline = row.original.traccar_status?.trim() === "online";
          return (
            <Badge
              variant={isOnline ? "success" : "default"}
              className="capitalize text-[10px]"
            >
              {isOnline ? "Online" : "Offline"}
            </Badge>
          );
        },
      },
      {
        header: "GPS ID",
        accessorKey: "gps_id",
        meta: { type: "text" as const },
        cell: ({ row }: any) => {
          const gpsId = row.original.custom_fields?.gps_id || "-";
          return (
            <div className="flex items-center gap-2 font-mono text-[11px] text-blue-600">
              <Map className="w-3 h-3" />
              <span>{gpsId}</span>
            </div>
          );
        },
      },
      {
        header: "Live Position / Seen",
        accessorKey: "last_location_at",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          if (!row.original.last_known_lat)
            return (
              <span className="text-muted-foreground italic text-[10px]">
                No Signal
              </span>
            );
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-1.5 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-mono text-slate-500">
                  {Number(row.original.last_known_lat).toFixed(5)},{" "}
                  {Number(row.original.last_known_lng).toFixed(5)}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 ml-3">
                {row.original.last_location_at
                  ? new Date(row.original.last_location_at).toLocaleString()
                  : "Just now"}
              </span>
            </div>
          );
        },
      },
    ],
    [driverOptions, drivers],
  );

  const filteredData = useMemo(() => {
    return data.filter((v) => {
      const driverRecord = drivers.find(
        (d) => d.driver_id === v.assigned_driver_id,
      );
      const searchStr =
        `${v.make} ${v.model} ${v.license_plate} ${driverRecord?.driver_name || ""} ${v.custom_fields?.gps_id || ""}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

      const isActive = v.is_active || v.traccar_status?.trim() === "online";
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "online" && isActive) ||
        (statusFilter === "offline" && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter, drivers]);

  const handleUpdate = async (id: string, updatedFields: any) => {
    startTransition(async () => {
      try {
        const standardKeys = [
          "vehicle_number",
          "make",
          "model",
          "year",
          "vin",
          "license_plate",
          "assigned_driver_id",
          "status",
          "vehicle_type_id",
        ];
        const updatePayload: any = { id };
        // Start with any virtual column values
        const customData: any = updatedFields.customValues || {};

        // gps_id is a built-in column that maps to custom_fields.gps_id
        if ("gps_id" in updatedFields && updatedFields.gps_id !== undefined) {
          customData.gps_id = updatedFields.gps_id;
        }

        Object.keys(updatedFields).forEach((key) => {
          if (standardKeys.includes(key)) {
            let val = updatedFields[key];
            if (val === "none") val = null;
            if (key === "year" && val !== null) val = parseInt(String(val), 10);
            updatePayload[key] = val;
          }
        });

        const existing = data.find((v) => v.id === id);
        const mergedCustom = {
          ...(existing?.custom_fields || {}),
          ...customData,
        };

        if (Object.keys(mergedCustom).length > 0) {
          updatePayload.custom_fields = mergedCustom;
        }

        const res = await fetch("/api/fleet/vehicles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        const json = await res.json();
        if (!res.ok) console.error("[VehiclesPage] Update failed:", json.error);
        else loadInitialData();
      } catch (err) {
        console.error("[VehiclesPage] Update error:", err);
      }
    });
  };

  const asRecord = (val: any): Record<string, any> => {
    if (!val || typeof val !== "object" || Array.isArray(val)) return {};
    return val as Record<string, any>;
  };

  const handleAdd = async (newItem: any) => {
    startTransition(async () => {
      try {
        const standardKeys = [
          "vehicle_number",
          "make",
          "model",
          "year",
          "vin",
          "license_plate",
          "assigned_driver_id",
          "status",
          "vehicle_type_id",
        ];
        // Start with virtual column values
        const customFields: any = { ...(newItem.customValues || {}) };

        // gps_id is a built-in column that maps to custom_fields.gps_id
        if (newItem.gps_id !== undefined && newItem.gps_id !== "") {
          customFields.gps_id = newItem.gps_id;
        }

        const payload: any = {
          vehicle_number: newItem.vehicle_number || `VEH-${Date.now()}`,
          custom_fields: customFields,
        };

        Object.keys(newItem).forEach((key) => {
          if (standardKeys.includes(key)) {
            let val = newItem[key];
            if (val === "none") val = null;
            if (key === "year" && val !== null) val = parseInt(String(val), 10);
            payload[key] = val;
          }
        });

        const res = await fetch("/api/fleet/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok)
          console.error("[VehiclesPage] Creation failed:", json.error);
        else loadInitialData();
      } catch (err) {
        console.error("[VehiclesPage] Creation error:", err);
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/fleet/vehicles?id=${id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok)
          console.error("[VehiclesPage] Deletion failed:", json.error);
        else setData((prev) => prev.filter((v) => v.id !== id));
      } catch (err) {
        console.error("[VehiclesPage] Deletion error:", err);
      }
    });
  };

  // Column Management
  const handleColumnAdd = async (column: Omit<VirtualColumn, "id">) => {
    if (!companyId) return;
    const res = await createFleetCustomFieldAction({
      companyId,
      entityType: "vehicles",
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType: column.type === "json" ? "text" : (column.type as any),
      fieldOptions:
        column.type === "select" || column.type === "currency"
          ? column.options?.map((o) => String(o.value))
          : undefined,
    });
    if (res.success) {
      loadInitialData();
    } else {
      console.error("[VehiclesPage] Column creation failed:", res.error);
    }
  };

  const handleColumnUpdate = async (
    id: string,
    column: Omit<VirtualColumn, "id">,
  ) => {
    if (!companyId) return;
    const res = await updateFleetCustomFieldAction({
      companyId,
      fieldId: id,
      entityType: "vehicles",
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType: column.type === "json" ? "text" : (column.type as any),
      fieldOptions:
        column.type === "select" || column.type === "currency"
          ? column.options?.map((o) => String(o.value))
          : undefined,
    });
    if (res.success) {
      loadInitialData();
    } else {
      console.error("[VehiclesPage] Column update failed:", res.error);
    }
  };

  const handleColumnDelete = async (id: string) => {
    if (!companyId) return;
    const res = await deleteFleetCustomFieldAction({ companyId, fieldId: id });
    if (res.success) {
      loadInitialData();
    } else {
      console.error("[VehiclesPage] Column deletion failed:", res.error);
    }
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Identifying fleet context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="px-2 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search plate, model, driver..."
              className="pl-10 h-11 border-slate-200/60 rounded-[1.2rem] bg-slate-50/30 focus:bg-white transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100/40 p-1.5 rounded-2xl border border-slate-200/50">
            <Button
              variant={statusFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 ${statusFilter === "all" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All Units
            </Button>
            <Button
              variant={statusFilter === "online" ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 gap-2 ${statusFilter === "online" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setStatusFilter("online")}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </Button>
            <Button
              variant={statusFilter === "offline" ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 gap-2 ${statusFilter === "offline" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setStatusFilter("offline")}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Offline
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
            className="h-11 px-6 gap-3 rounded-[1.2rem] border-slate-200/60 bg-white hover:bg-slate-50 transition-all shadow-sm"
          >
            {viewMode === "list" ? (
              <Map className="w-4 h-4 text-blue-500" />
            ) : (
              <List className="w-4 h-4 text-blue-500" />
            )}
            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-700">
              {viewMode === "list" ? "Live Map" : "Asset List"}
            </span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm min-h-[600px] flex flex-col">
        {viewMode === "list" ? (
          <EditableTable
            data={filteredData.map((v) => ({
              ...v,
              gps_id: v.custom_fields?.gps_id || "",
              gps_status: v.custom_fields?.gps_status || "inactive",
              assignment_status:
                v.custom_fields?.assignment_status ||
                (v.assigned_driver_id ? "assigned" : "unassigned"),
              customValues: v.custom_fields || {},
            }))}
            columns={columns}
            virtualColumns={virtualColumns}
            hideHeader={true}
            onUpdate={handleUpdate}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onColumnAdd={handleColumnAdd}
            onColumnUpdate={handleColumnUpdate}
            onColumnDelete={handleColumnDelete}
          />
        ) : (
          <div className="flex-1 w-full relative">
            <VehicleMap vehicles={filteredData} />
          </div>
        )}
      </div>
    </div>
  );
}
