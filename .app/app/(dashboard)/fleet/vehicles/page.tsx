"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  useVehicles,
  useDrivers,
  useVehicleTypes,
  useFleetColumnDefs,
  useAddVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useAddFleetColumn,
  useUpdateFleetColumn,
  useDeleteFleetColumn,
} from "@/hooks/use-fleet";
import { toast } from "@/hooks/use-toast";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";

// Dynamically import Map to avoid SSR issues with Leaflet
function MapLoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-[600px] flex items-center justify-center bg-slate-50 text-slate-400">
      {t("fleet_vehicles.loading_map")}
    </div>
  );
}

const VehicleMap = dynamic(
  () => import("@/components/fleet/vehicles/VehicleMap"),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  },
);

export default function VehiclesPage() {
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  // ── UI state for Pagination ─────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");

  // ── Data via React Query ──────────────────────────────────────────────────
  const { data: vehicleResponse, isLoading: loadingVehicles } =
    useVehicles(companyId, { 
      page, 
      pageSize, 
      search: searchTerm, 
      status: statusFilter 
    });
  
  const vehicles = useMemo(() => vehicleResponse?.data || [], [vehicleResponse]);
  const totalVehicles = vehicleResponse?.total || 0;

  const { data: drivers = [] as any[] } = useDrivers(companyId);
  const { data: vehicleTypes = [] } = useVehicleTypes();
  const { data: columnDefs = [] } = useFleetColumnDefs("vehicles", companyId);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addVehicle = useAddVehicle(companyId, {
    onSuccess: () => toast.success(t("fleet_vehicles.toast_add_success")),
    onError: () => toast.error(t("fleet_vehicles.toast_add_error")),
  });
  const updateVehicle = useUpdateVehicle(companyId, {
    onSuccess: () => toast.success(t("fleet_vehicles.toast_update_success")),
    onError: () => toast.error(t("fleet_vehicles.toast_update_error")),
  });
  const deleteVehicle = useDeleteVehicle(companyId, {
    onSuccess: () => toast.success(t("fleet_vehicles.toast_delete_success")),
    onError: () => toast.error(t("fleet_vehicles.toast_delete_error")),
  });

  const addColumn = useAddFleetColumn("vehicles", companyId, {
    onSuccess: () =>
      toast.success(t("fleet_vehicles.toast_column_add_success")),
  });
  const updateColumn = useUpdateFleetColumn("vehicles", companyId, {
    onSuccess: () =>
      toast.success(t("fleet_vehicles.toast_column_update_success")),
  });
  const deleteColumn = useDeleteFleetColumn("vehicles", companyId, {
    onSuccess: () =>
      toast.success(t("fleet_vehicles.toast_column_delete_success")),
  });

  const loading = loadingVehicles;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Build unique driver options from driver_assignments.
  // driver_id is the UUID of the employee; driver_name is the display label.
  // Use 'none' as the sentinel for "Unassigned" — never use '' as a Select value.
  const driverOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [
      { label: `— ${t("fleet_vehicles.unassigned")} —`, value: "none" },
    ];
    
    const driverList = (drivers as any)?.data || (drivers as any) || [];
    
    for (const d of driverList) {
      if (d.driver_id && !seen.has(d.driver_id)) {
        seen.add(d.driver_id);
        opts.push({ label: d.driver_name || d.driver_id, value: d.driver_id });
      }
    }
    return opts;
  }, [drivers, t]);

  const virtualColumns = useMemo((): VirtualColumn[] => {
    return (columnDefs as any[]).map((def) => ({
      id: String(def.id),
      label: String(def.field_label),
      key: String(def.field_name),
      type: (def.field_type as any) || "text",
      options: def.field_options
        ? (def.field_options as string[]).map((o) => ({ label: o, value: o }))
        : undefined,
    }));
  }, [columnDefs]);

  const columns = useMemo(
    () => [
      {
        header: t("fleet_vehicles.col_make"),
        accessorKey: "make",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="text-sm font-medium text-slate-700">
            {row.original.make || "-"}
          </span>
        ),
      },
      {
        header: t("fleet_vehicles.col_model"),
        accessorKey: "model",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="text-sm font-medium text-slate-700">
            {row.original.model || "-"}
          </span>
        ),
      },
      {
        header: t("fleet_vehicles.col_year"),
        accessorKey: "year",
        meta: { type: "number" as const },
        cell: ({ row }: any) => (
          <span className="text-sm text-slate-600">
            {row.original.year || "-"}
          </span>
        ),
      },
      {
        header: t("fleet_vehicles.col_vehicle_type"),
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
        header: t("fleet_vehicles.col_vin"),
        accessorKey: "vin",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="font-mono text-[10px] text-slate-500">
            {row.original.vin || "-"}
          </span>
        ),
      },
      {
        header: t("fleet_vehicles.col_plate"),
        accessorKey: "license_plate",
        meta: { type: "text" as const },
        cell: ({ row }: any) => (
          <span className="font-mono text-xs text-slate-600">
            {row.original.license_plate || "-"}
          </span>
        ),
      },
      {
        header: t("fleet_vehicles.col_driver"),
        accessorKey: "assigned_driver_id",
        meta: {
          type: "select" as const,
          options: driverOptions,
        },
        cell: ({ row }: any) => {
          const driverId = row.original.assigned_driver_id;
          const driverList = (drivers as any)?.data || (drivers as any) || [];
          const driverRecord = driverList.find((d: any) => d.driver_id === driverId);
          if (!driverId || !driverRecord)
            return (
              <span className="text-muted-foreground italic text-xs">
                {t("fleet_vehicles.unassigned")}
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
        header: t("fleet_vehicles.col_gps_status"),
        accessorKey: "traccar_status",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          const isOnline = row.original.traccar_status?.trim() === "online";
          return (
            <Badge
              variant={isOnline ? "success" : "default"}
              className="capitalize text-[10px]"
            >
              {isOnline
                ? t("fleet_vehicles.online")
                : t("fleet_vehicles.offline")}
            </Badge>
          );
        },
      },
      {
        header: t("fleet_vehicles.col_gps_id"),
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
        header: t("fleet_vehicles.col_live_position"),
        accessorKey: "last_location_at",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          if (!row.original.last_known_lat)
            return (
              <span className="text-muted-foreground italic text-[10px]">
                {t("fleet_vehicles.no_signal")}
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
                  : t("fleet_vehicles.just_now")}
              </span>
            </div>
          );
        },
      },
    ],
    [driverOptions, drivers, t, vehicleTypes],
  );

  // With server-side filtering, filteredData is basically data from API
  const displayData = useMemo(() => {
    return vehicles;
  }, [vehicles]);

  const handleUpdate = async (id: string, updatedFields: any) => {
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
      const customData: any = updatedFields.customValues || {};

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

      const existing = vehicles.find((v) => v.id === id);
      const mergedCustom = {
        ...(existing?.custom_fields || {}),
        ...customData,
      };
      if (Object.keys(mergedCustom).length > 0) {
        updatePayload.custom_fields = mergedCustom;
      }

      await updateVehicle.mutateAsync(updatePayload);
    } catch (err) {
      console.error("[VehiclesPage] Update error:", err);
    }
  };

  const asRecord = (val: any): Record<string, any> => {
    if (!val || typeof val !== "object" || Array.isArray(val)) return {};
    return val as Record<string, any>;
  };

  const handleAdd = async (newItem: any) => {
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
      const customFields: any = { ...(newItem.customValues || {}) };
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
      await addVehicle.mutateAsync(payload);
    } catch (err) {
      console.error("[VehiclesPage] Creation error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVehicle.mutateAsync(id);
    } catch (err) {
      console.error("[VehiclesPage] Deletion error:", err);
    }
  };

  const handleColumnAdd = async (column: Omit<VirtualColumn, "id">) => {
    if (!companyId) return;
    await addColumn.mutateAsync({
      entityType: "vehicles",
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType: column.type === "json" ? "text" : (column.type as any),
      fieldOptions:
        column.type === "select" || column.type === "currency"
          ? column.options?.map((o) => String(o.value))
          : undefined,
    });
  };

  const handleColumnUpdate = async (
    id: string,
    column: Omit<VirtualColumn, "id">,
  ) => {
    if (!companyId) return;
    await updateColumn.mutateAsync({
      fieldId: id,
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType: column.type === "json" ? "text" : (column.type as any),
      fieldOptions:
        column.type === "select" || column.type === "currency"
          ? column.options?.map((o) => String(o.value))
          : undefined,
    });
  };

  const handleColumnDelete = async (id: string) => {
    if (!companyId) return;
    await deleteColumn.mutateAsync(id);
  };

  if (loading) {
    return <FleetTableSkeleton rows={10} cols={6} />;
  }

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">
            {t("fleet_vehicles.identifying_context")}
          </p>
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
              placeholder={t("fleet_vehicles.search_placeholder")}
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
              {t("fleet_vehicles.filter_all")}
            </Button>
            <Button
              variant={statusFilter === "online" ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 gap-2 ${statusFilter === "online" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setStatusFilter("online")}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("fleet_vehicles.filter_online")}
            </Button>
            <Button
              variant={statusFilter === "offline" ? "secondary" : "ghost"}
              size="sm"
              className={`h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 gap-2 ${statusFilter === "offline" ? "bg-white shadow-sm" : ""}`}
              onClick={() => setStatusFilter("offline")}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {t("fleet_vehicles.filter_offline")}
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
              {viewMode === "list"
                ? t("fleet_vehicles.view_map")
                : t("fleet_vehicles.view_list")}
            </span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm min-h-[600px] flex flex-col">
        {viewMode === "list" ? (
          <EditableTable
            data={displayData.map((v) => ({
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
            pagination={true}
            currentPage={page}
            totalRows={totalVehicles}
            pageSize={pageSize}
            onPageChange={(p) => setPage(p)}
          />
        ) : (
          <div className="flex-1 w-full relative">
            <VehicleMap vehicles={displayData} />
          </div>
        )}
      </div>
    </div>
  );
}
