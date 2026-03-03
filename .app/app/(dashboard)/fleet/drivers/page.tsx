"use client";

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useTransition,
} from "react";
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
} from "lucide-react";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import { Button } from "@/components/shared/ui/button/Button";
import { useCompanies } from "@/hooks/use-companies";
import {
  getFleetTableViewAction,
  createFleetCustomFieldAction,
  updateFleetCustomFieldAction,
  deleteFleetCustomFieldAction,
} from "@/app/api/fleet/fleet";

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

  const [data, setData] = useState<Assignment[]>([]);
  const [columnDefs, setColumnDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ended">(
    "all",
  );

  const [employeeOptions, setEmployeeOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [vehicleOptions, setVehicleOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [dRes, empRes, vehRes] = await Promise.all([
        fetch("/api/fleet/drivers"),
        fetch("/api/hr/employees"),
        fetch("/api/fleet/vehicles"),
      ]);

      const [dData, empList, vehList] = await Promise.all([
        dRes.ok ? dRes.json() : [],
        empRes.ok ? empRes.json() : [],
        vehRes.ok ? vehRes.json() : [],
      ]);

      const rows = (dData || []).map((r: any) => ({
        ...r,
        customValues: r.custom_fields || {},
      }));
      setData(rows);

      setEmployeeOptions(
        (empList || []).map((e: any) => ({
          label: e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim(),
          value: e.id,
        })),
      );

      setVehicleOptions([
        { label: t("fleet_drivers.no_vehicle_option"), value: "none" },
        ...(vehList || []).map((v: any) => ({
          label:
            `${v.make || ""} ${v.model || ""} ${v.license_plate ? "· " + v.license_plate : ""}`.trim(),
          value: v.id,
        })),
      ]);

      // Load virtual column definitions separately (non-blocking)
      if (companyId) {
        getFleetTableViewAction({
          companyId,
          table: "drivers",
          page: 1,
          pageSize: 1,
        })
          .then((res) => {
            if (res.success && res.data) {
              setColumnDefs(res.data.columnDefinitions || []);
            }
          })
          .catch(() => { });
      }
    } catch (error) {
      console.error("[DriversPage] Failed to load driver assignments:", error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

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
    [data],
  );

  const virtualColumns = useMemo((): VirtualColumn[] => {
    return columnDefs.map((def) => ({
      id: def.id,
      label: def.field_label,
      key: def.field_name,
      type: def.field_type as any,
      options: (def.field_options || []).map((o: string) => ({
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
                <BadgeCheck className="w-3 h-3" /> {t("fleet_drivers.status_active")}
              </div>
            );
          const past = new Date(endDate) < new Date();
          return (
            <div
              className={`flex items-center gap-1 text-[10px] font-semibold ${past ? "text-slate-400" : "text-orange-500"
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
              {active ? t("fleet_drivers.status_active") : t("fleet_drivers.status_ended")}
            </Badge>
          );
        },
      },
    ],
    [employeeOptions, vehicleOptions],
  );

  const handleAdd = async (newItem: any) => {
    startTransition(async () => {
      try {
        const vehicleId =
          newItem.vehicle_id === "none" || !newItem.vehicle_id
            ? null
            : newItem.vehicle_id;
        const res = await fetch("/api/fleet/drivers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driver_id: newItem.driver_id,
            vehicle_id: vehicleId,
            start_date:
              newItem.start_date || new Date().toISOString().split("T")[0],
            end_date: newItem.end_date || null,
            notes: newItem.notes || null,
            custom_fields: newItem.customValues || {},
          }),
        });
        const json = await res.json();
        if (!res.ok) console.error("[DriversPage] Create failed:", json.error);
        else loadAll();
      } catch (err) {
        console.error("[DriversPage] Create error:", err);
      }
    });
  };

  const handleUpdate = async (id: string, updatedFields: any) => {
    startTransition(async () => {
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

        const res = await fetch("/api/fleet/drivers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        const json = await res.json();
        if (!res.ok) console.error("[DriversPage] Update failed:", json.error);
        else loadAll();
      } catch (err) {
        console.error("[DriversPage] Update error:", err);
      }
    });
  };

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/fleet/drivers?id=${id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok) console.error("[DriversPage] Delete failed:", json.error);
        else setData((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        console.error("[DriversPage] Delete error:", err);
      }
    });
  };

  const handleColumnAdd = async (payload: any) => {
    if (!companyId) return;
    const res = await createFleetCustomFieldAction({
      companyId,
      entityType: "drivers",
      fieldLabel: payload.label,
      fieldName: payload.key,
      fieldType: payload.type === "status" ? "select" : payload.type,
      fieldOptions: (payload.options ?? []).map((o: any) =>
        String(o.value ?? o.label),
      ),
    });
    if (res.success) {
      loadAll();
    } else {
      console.error("[DriversPage] Column creation failed:", res.error);
    }
  };

  const handleColumnUpdate = async (fieldId: string, payload: any) => {
    if (!companyId) return;
    const res = await updateFleetCustomFieldAction({
      companyId,
      entityType: "drivers",
      fieldId,
      fieldLabel: payload.label,
      fieldName: payload.key,
      fieldType: payload.type === "status" ? "select" : payload.type,
      fieldOptions: (payload.options ?? []).map((o: any) =>
        String(o.value ?? o.label),
      ),
    });
    if (res.success) {
      loadAll();
    } else {
      console.error("[DriversPage] Column update failed:", res.error);
    }
  };

  const handleColumnDelete = async (fieldId: string) => {
    if (!companyId) return;
    const res = await deleteFleetCustomFieldAction({
      companyId,
      fieldId,
    });
    if (res.success) {
      loadAll();
    } else {
      console.error("[DriversPage] Column deletion failed:", res.error);
    }
  };

  return (
    <div className="space-y-1">
      <div className="px-1 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder={t("fleet_drivers.search_placeholder")}
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
                className={`h-7 px-2.5 text-[9px] font-bold uppercase rounded-md gap-1 ${statusFilter === f ? "bg-white shadow-sm" : ""
                  }`}
                onClick={() => setStatusFilter(f)}
              >
                {f === "active" && (
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                )}
                {f === "all"
                  ? t("fleet_drivers.filter_all")
                  : f === "active"
                    ? t("fleet_drivers.filter_active")
                    : t("fleet_drivers.filter_ended")}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
          <span>{t("fleet_drivers.stat_total", { count: stats.total })}</span>
          <span className="text-emerald-500">{t("fleet_drivers.stat_active", { count: stats.active })}</span>
          <span className="text-blue-500">
            {t("fleet_drivers.stat_with_vehicle", { count: stats.withVehicle })}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm min-h-[560px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Users className="w-8 h-8 animate-pulse" />
            <p className="text-[11px] font-black uppercase tracking-widest">
              {t("fleet_drivers.loading")}
            </p>
          </div>
        ) : (
          <EditableTable
            hideHeader={true}
            data={filteredData}
            columns={columns}
            virtualColumns={virtualColumns}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onColumnAdd={handleColumnAdd}
            onColumnUpdate={handleColumnUpdate}
            onColumnDelete={handleColumnDelete}
          />
        )}
      </div>
    </div>
  );
}
