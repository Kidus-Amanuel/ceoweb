"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EditableTable,
  type VirtualColumn,
} from "@/components/shared/table/EditableTable";
import {
  Users,
  Car,
  Search,
  Calendar,
  Mail,
  Clock,
  BadgeCheck,
  Eye,
  X,
} from "lucide-react";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import { Button } from "@/components/shared/ui/button/Button";
import { useCompanies } from "@/hooks/use-companies";
import {
  useDrivers,
  useVehicles,
  useEmployees,
  useFleetColumnDefs,
  useAddDriver,
  useUpdateDriver,
  useDeleteDriver,
  useAddFleetColumn,
  useUpdateFleetColumn,
  useDeleteFleetColumn,
} from "@/hooks/use-fleet";
import { toast } from "@/hooks/use-toast";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";
import { motion, AnimatePresence } from "framer-motion";

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
  custom_fields?: Record<string, any>;
  customValues?: Record<string, any>;
}

export default function DriversPage() {
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  // ── UI state for Pagination ─────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">(
    "all",
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const router = useRouter();

  // ── Data via React Query ──────────────────────────────────────────────────
  const { data: driverResponse, isLoading: loading } = useDrivers(companyId, {
    page,
    pageSize,
    search: searchTerm,
    status: statusFilter,
  });

  const rawDrivers = useMemo(
    () => driverResponse?.data || [],
    [driverResponse],
  );
  const totalDrivers = driverResponse?.total || 0;
  const { data: rawVehicles = [] as any[] } = useVehicles(companyId);
  const { data: employees = [] } = useEmployees(companyId);
  const { data: columnDefs = [] } = useFleetColumnDefs("drivers", companyId);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addDriver = useAddDriver(companyId, {
    onSuccess: () => toast.success(t("fleet_drivers.toast_add_success")),
    onError: () => toast.error(t("fleet_drivers.toast_add_error")),
  });
  const updateDriver = useUpdateDriver(companyId, {
    onSuccess: () => toast.success(t("fleet_drivers.toast_update_success")),
    onError: () => toast.error(t("fleet_drivers.toast_update_error")),
  });
  const deleteDriver = useDeleteDriver(companyId, {
    onSuccess: () => toast.success(t("fleet_drivers.toast_delete_success")),
    onError: () => toast.error(t("fleet_drivers.toast_delete_error")),
  });
  const addColumn = useAddFleetColumn("drivers", companyId, {
    onSuccess: () => toast.success(t("fleet_drivers.toast_column_add_success")),
  });
  const updateColumn = useUpdateFleetColumn("drivers", companyId, {
    onSuccess: () =>
      toast.success(t("fleet_drivers.toast_column_update_success")),
  });
  const deleteColumn = useDeleteFleetColumn("drivers", companyId, {
    onSuccess: () =>
      toast.success(t("fleet_drivers.toast_column_delete_success")),
  });

  // ── Derived options ──────────────────────────────────────────────────
  const data: Assignment[] = useMemo(
    () =>
      rawDrivers.map((r: any) => ({
        ...r,
        customValues: r.custom_fields || {},
      })),
    [rawDrivers],
  );

  const employeeOptions = useMemo(() => {
    const list = Array.isArray(employees)
      ? employees
      : (employees as any)?.data || [];
    return list.map((e: any) => ({
      label: e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim(),
      value: e.id,
    }));
  }, [employees]);

  const vehicleOptions = useMemo(() => {
    const list = (rawVehicles as any)?.data || (rawVehicles as any) || [];
    return [
      { label: t("fleet_drivers.no_vehicle_option"), value: "none" },
      ...list.map((v: any) => ({
        label: `${v.make || ""} ${v.model || ""} ${
          v.license_plate ? "\u00b7 " + v.license_plate : ""
        }`.trim(),
        value: v.id,
      })),
    ];
  }, [rawVehicles, t]);

  const isActive = (a: Assignment) =>
    !a.end_date || new Date(a.end_date) >= new Date();

  // With server-side filtering, data is already filtered/assigned
  const displayData = useMemo(() => {
    return data;
  }, [data]);

  const stats = useMemo(
    () => ({
      total: data.length,
      active: data.filter(isActive).length,
      withVehicle: data.filter((a) => a.vehicle_id && isActive(a)).length,
    }),
    [data],
  );

  const virtualColumns = useMemo((): VirtualColumn[] => {
    return (columnDefs as any[]).map((def) => ({
      id: String(def.id),
      label: String(def.field_label),
      key: String(def.field_name),
      type: def.field_type as any,
      options: ((def.field_options || []) as string[]).map((o) => ({
        label: o,
        value: o,
      })),
    }));
  }, [columnDefs]);

  const columns = useMemo(
    () => [
      {
        header: t("fleet_drivers.col_driver"),
        accessorKey: "driver_id",
        meta: {
          type: "select" as const,
          options: employeeOptions,
        },
        cell: ({ row }: any) => {
          const initials = (row.original.driver_name || "?")
            .split(" ")
            .map((n: string) => n[0] || "")
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-black text-xs shadow-md flex-shrink-0">
                {initials}
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
        header: t("fleet_drivers.col_vehicle"),
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
                <Car className="w-3 h-3" /> {t("fleet_drivers.no_vehicle")}
              </span>
            );
          return (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <Car className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-slate-700">
                  {vehicle_label}
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
      {
        header: t("fleet_drivers.col_start_date"),
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
        header: t("fleet_drivers.col_end_date"),
        accessorKey: "end_date",
        meta: { type: "date" as const },
        cell: ({ row }: any) => {
          const endDate = row.original.end_date;
          if (!endDate)
            return (
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                <BadgeCheck className="w-3 h-3" />{" "}
                {t("fleet_drivers.status_active")}
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
        header: t("fleet_drivers.col_notes"),
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
        header: t("fleet_drivers.col_status"),
        accessorKey: "assignment_status",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          const active = isActive(row.original);
          return (
            <Badge
              variant={active ? "success" : "default"}
              className="text-[9px] px-2"
            >
              {active
                ? t("fleet_drivers.status_active")
                : t("fleet_drivers.status_ended")}
            </Badge>
          );
        },
      },
    ],
    [employeeOptions, vehicleOptions, t],
  );

  const handleAdd = async (newItem: any) => {
    try {
      const vehicleId =
        newItem.vehicle_id === "none" || !newItem.vehicle_id
          ? null
          : newItem.vehicle_id;
      await addDriver.mutateAsync({
        driver_id: newItem.driver_id,
        vehicle_id: vehicleId,
        start_date:
          newItem.start_date || new Date().toISOString().split("T")[0],
        end_date: newItem.end_date || null,
        notes: newItem.notes || null,
        custom_fields: newItem.customValues || {},
      });
    } catch (err) {
      console.error("[DriversPage] Create error:", err);
    }
  };

  const handleUpdate = async (id: string, updatedFields: any) => {
    try {
      const standardKeys = [
        "driver_id",
        "vehicle_id",
        "start_date",
        "end_date",
        "notes",
      ];
      const updatePayload: any = { id };
      const customData: any = updatedFields.customValues || {};

      Object.keys(updatedFields).forEach((key) => {
        if (standardKeys.includes(key)) {
          let val = updatedFields[key];
          if (val === "none") val = null;
          updatePayload[key] = val;
        }
      });

      const existing = data.find((a) => a.id === id);
      const mergedCustom = {
        ...(existing?.custom_fields || {}),
        ...customData,
      };
      if (Object.keys(mergedCustom).length > 0) {
        updatePayload.custom_fields = mergedCustom;
      }

      await updateDriver.mutateAsync(updatePayload);
    } catch (err) {
      console.error("[DriversPage] Update error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDriver.mutateAsync(id);
    } catch (err) {
      console.error("[DriversPage] Delete error:", err);
    }
  };

  const handleColumnAdd = async (payload: any) => {
    if (!companyId) return;
    await addColumn.mutateAsync({
      entityType: "drivers",
      fieldLabel: payload.label,
      fieldName: payload.key,
      fieldType: payload.type === "status" ? "select" : payload.type,
      fieldOptions: (payload.options ?? []).map((o: any) =>
        String(o.value ?? o.label),
      ),
    });
  };

  const handleColumnUpdate = async (fieldId: string, payload: any) => {
    if (!companyId) return;
    await updateColumn.mutateAsync({
      fieldId,
      fieldLabel: payload.label,
      fieldName: payload.key,
      fieldType: payload.type === "status" ? "select" : payload.type,
      fieldOptions: (payload.options ?? []).map((o: any) =>
        String(o.value ?? o.label),
      ),
    });
  };

  const handleColumnDelete = async (fieldId: string) => {
    if (!companyId) return;
    await deleteColumn.mutateAsync(fieldId);
  };

  return (
    <div className="space-y-4 relative">
      <div className="bg-white rounded-[2.5rem] border border-slate-200/50 shadow-2xl shadow-indigo-900/5 min-h-[700px] flex flex-col relative overflow-hidden">
        {/* Dynamic Header */}
        <div className="relative z-[60] bg-white border-b border-slate-100">
          <AnimatePresence mode="wait">
            {!selectedRowId ? (
              <motion.div
                key="default-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="relative w-64 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input
                      placeholder={t("fleet_drivers.search_placeholder")}
                      className="pl-10 h-10 border-slate-200/60 rounded-2xl bg-slate-50/10 text-xs focus:bg-white transition-all font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                    {(["all", "active", "ended"] as const).map((f) => (
                      <Button
                        key={f}
                        variant={statusFilter === f ? "secondary" : "ghost"}
                        size="sm"
                        className={`h-8 px-3 text-[10px] font-black uppercase rounded-lg transition-all ${
                          statusFilter === f
                            ? "bg-white shadow-sm text-indigo-600"
                            : "text-slate-400"
                        }`}
                        onClick={() => setStatusFilter(f)}
                      >
                        {f === "all"
                          ? t("fleet_drivers.filter_all")
                          : f === "active"
                            ? t("fleet_drivers.filter_active")
                            : t("fleet_drivers.filter_ended")}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span className="flex items-center gap-2">
                    {t("fleet_drivers.stat_total", { count: totalDrivers })}
                  </span>
                  <span className="flex items-center gap-2 text-emerald-500">
                    Active:{" "}
                    <span className="text-emerald-700 text-xs font-black">
                      {stats.active}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-blue-500">
                    With Vehicle:{" "}
                    <span className="text-blue-700 text-xs font-black">
                      {stats.withVehicle}
                    </span>
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="selection-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex items-center justify-between bg-indigo-50/80 backdrop-blur-md text-indigo-900 shadow-sm border-b-2 border-indigo-200/50 transition-colors duration-500"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-3xl bg-white flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100 shadow-xl">
                    {data
                      .find((d) => d.id === selectedRowId)
                      ?.driver_name?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 leading-none mb-1">
                      {data.find((d) => d.id === selectedRowId)?.driver_name}
                    </h2>
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest opacity-80">
                      Fleet Assignment •{" "}
                      {data.find((d) => d.id === selectedRowId)
                        ?.vehicle_plate || "No Vehicle"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="h-11 px-6 text-indigo-600 hover:bg-indigo-500/10 hover:text-indigo-700 rounded-2xl gap-3 transition-all border border-indigo-500/20 bg-white group shadow-sm"
                    onClick={() =>
                      router.push(`/fleet/drivers/${selectedRowId}`)
                    }
                  >
                    <div className="p-1 bg-indigo-500/10 rounded-lg group-hover:scale-110 transition-transform">
                      <Eye className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      View Analytics
                    </span>
                  </Button>
                  <div className="w-px h-8 bg-indigo-200 mx-3 opacity-50" />
                  <Button
                    variant="ghost"
                    className="h-11 w-11 p-0 text-slate-400 hover:text-slate-600 hover:bg-indigo-100/50 rounded-2xl transition-all"
                    onClick={() => setSelectedRowId(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table Content */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {loading ? (
            <FleetTableSkeleton rows={10} cols={6} />
          ) : (
            <EditableTable
              hideHeader={true}
              data={displayData}
              columns={columns}
              virtualColumns={virtualColumns}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onColumnAdd={handleColumnAdd}
              onColumnUpdate={handleColumnUpdate}
              onColumnDelete={handleColumnDelete}
              onSelectionChange={(ids) => setSelectedRowId(ids[0] || null)}
              selectedRowId={selectedRowId}
              pagination={true}
              currentPage={page}
              totalRows={totalDrivers}
              pageSize={pageSize}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
