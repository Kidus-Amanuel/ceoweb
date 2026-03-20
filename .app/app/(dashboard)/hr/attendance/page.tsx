"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type VirtualColumn } from "@/components/shared/table/EditableTable";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  Clock,
  MapPin,
  CalendarDays,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Settings2,
  X,
  UserCheck,
  ClipboardList,
  Fingerprint,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { useCompanies } from "@/hooks/use-companies";
import {
  useAttendance,
  useAddAttendance,
  useUpdateAttendance,
  useDeleteAttendance,
  useEmployees,
  useHrColumnDefs,
  useAddHrColumn,
  useUpdateHrColumn,
  useDeleteHrColumn,
} from "@/hooks/use-hr";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/shared/ui/input/Input";
import { motion, AnimatePresence } from "framer-motion";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";
import { type ColumnFieldType } from "@/components/shared/table/CustomColumnEditorContent";

export default function AttendancePage() {
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  // 1. State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 2. Data Fetching
  const { data: attendanceRes, isLoading } = useAttendance(companyId, {
    page,
    pageSize,
  });
  const { data: employeeRes } = useEmployees(companyId);
  const { data: columnDefs = [] } = useHrColumnDefs("attendance", companyId);

  const employees = useMemo(() => employeeRes?.data || [], [employeeRes]);
  const attendance = useMemo(() => attendanceRes?.data || [], [attendanceRes]);
  const totalRows = attendanceRes?.total || 0;

  const selectedEntry = useMemo(
    () => attendance.find((a) => a.id === selectedRowId),
    [attendance, selectedRowId],
  );

  // 3. Mutations
  const addAtt = useAddAttendance(companyId, {
    onSuccess: () => toast.success(t("hr.toast_attendance_add")),
    onError: (err: any) =>
      toast.error(err.message || t("hr.toast_attendance_add") + " failed"),
  });
  const updateAtt = useUpdateAttendance(companyId, {
    onSuccess: () => toast.success(t("hr.toast_attendance_update")),
    onError: (err: any) =>
      toast.error(err.message || t("hr.toast_attendance_update") + " failed"),
  });
  const deleteAtt = useDeleteAttendance(companyId, {
    onSuccess: () => {
      toast.success(t("hr.toast_attendance_delete"));
      setSelectedRowId(null);
    },
    onError: (err: any) =>
      toast.error(err.message || t("hr.toast_attendance_delete") + " failed"),
  });

  const addColumn = useAddHrColumn("attendance", companyId, {
    onSuccess: () => toast.success(t("hr.toast_field_add")),
  });
  const updateColumn = useUpdateHrColumn("attendance", companyId, {
    onSuccess: () => toast.success(t("hr.toast_field_update")),
  });
  const deleteColumn = useDeleteHrColumn("attendance", companyId, {
    onSuccess: () => toast.success(t("hr.toast_field_delete")),
  });

  // 4. Derived Configuration
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

  const mappedAttendance = useMemo(
    () =>
      attendance.map((a) => ({ ...a, customValues: a.custom_fields || {} })),
    [attendance],
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayRecs = attendance.filter((a) => a.date === today);
    return {
      total: employees.length,
      present: todayRecs.filter(
        (a) => a.status === "present" || a.status === "on_time",
      ).length,
      late: todayRecs.filter((a) => a.status === "late").length,
    };
  }, [attendance, employees]);

  // 5. Table Columns
  const columns = useMemo(
    () => [
      {
        header: t("hr.col_personnel"),
        accessorKey: "employee_id",
        meta: {
          type: "select" as ColumnFieldType,
          options: employees.map((e: any) => ({
            label: `${e.first_name} ${e.last_name}`,
            value: e.id,
          })),
        },
        cell: ({ row }: any) => {
          const emp = row.original.employee;
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-amber-200/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Fingerprint className="w-4 h-4 relative z-10" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-700 leading-none mb-1 tracking-tight">
                  {emp
                    ? `${emp.first_name} ${emp.last_name}`
                    : "Unknown System ID"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <ClipboardList className="w-2.5 h-2.5" />{" "}
                  {emp?.employee_code || "GEN-000"}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        header: t("hr.col_log_date"),
        accessorKey: "date",
        meta: { type: "date" as ColumnFieldType },
        cell: ({ row }: any) => (
          <span className="text-xs font-bold text-slate-600 tracking-tight">
            {new Date(row.original.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        header: t("hr.col_entry_log"),
        accessorKey: "check_in",
        meta: { type: "text" as ColumnFieldType },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-emerald-600 font-mono text-[11px] bg-emerald-50/50 px-2 py-1 rounded-lg border border-emerald-100/50 w-fit">
            <Clock className="w-3 h-3 text-emerald-400" />
            {row.original.check_in
              ? new Date(row.original.check_in).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </div>
        ),
      },
      {
        header: t("hr.col_exit_log"),
        accessorKey: "check_out",
        meta: { type: "text" as ColumnFieldType },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 text-rose-500 font-mono text-[11px] bg-rose-50/50 px-2 py-1 rounded-lg border border-rose-100/50 w-fit">
            <Clock className="w-3 h-3 text-rose-400" />
            {row.original.check_out
              ? new Date(row.original.check_out).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </div>
        ),
      },
      {
        header: t("hr.col_hours"),
        accessorKey: "hours_worked",
        meta: { readOnly: true, type: "number" as ColumnFieldType },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{
                  width: `${Math.min(100, (Number(row.original.hours_worked) || 0) * 10)}%`,
                }}
              />
            </div>
            <span className="text-[11px] font-black text-slate-600 min-w-[45px]">
              {row.original.hours_worked || "0.00"} {t("hr.hrs_label")}
            </span>
          </div>
        ),
      },
      {
        header: t("hr.col_system_status"),
        accessorKey: "status",
        meta: {
          type: "select" as ColumnFieldType,
          options: [
            { label: t("hr.status_present"), value: "present" },
            { label: t("hr.status_late"), value: "late" },
            { label: t("hr.status_absent"), value: "absent" },
            { label: t("hr.status_half_day"), value: "half_day" },
          ],
        },
        cell: ({ row }: any) => {
          const stats = row.original.status || "present";
          const variants: Record<string, string> = {
            present: "bg-emerald-50 text-emerald-700 border-emerald-100",
            late: "bg-amber-50 text-amber-700 border-amber-100",
            absent: "bg-rose-50 text-rose-700 border-rose-100",
            half_day: "bg-indigo-50 text-indigo-700 border-indigo-100",
          };
          return (
            <Badge
              variant="outline"
              className={`capitalize text-[9px] font-black tracking-widest px-2.5 py-0.5 ${variants[stats]}`}
            >
              {stats.replace("_", " ")}
            </Badge>
          );
        },
      },
    ],
    [t, employees],
  );

  const handleUpdate = async (id: string, updatedFields: any) => {
    try {
      const payload: any = { id };
      const customData = updatedFields.customValues || {};
      const standardKeys = [
        "employee_id",
        "date",
        "check_in",
        "check_out",
        "hours_worked",
        "status",
        "notes",
      ];

      Object.keys(updatedFields).forEach((key) => {
        if (standardKeys.includes(key)) payload[key] = updatedFields[key];
      });

      const existing = attendance.find((x) => x.id === id);
      const mergedCustom = {
        ...(existing?.custom_fields || {}),
        ...customData,
      };
      if (Object.keys(mergedCustom).length > 0)
        payload.custom_fields = mergedCustom;

      await updateAtt.mutateAsync(payload);
    } catch (err) {
      console.error("[AttendancePage] Update error:", err);
    }
  };

  const handleAdd = async (newItem: any) => {
    try {
      const customData = newItem.customValues || {};
      const payload: any = { company_id: companyId, custom_fields: customData };
      const standardKeys = [
        "employee_id",
        "date",
        "check_in",
        "check_out",
        "hours_worked",
        "status",
        "notes",
      ];

      Object.keys(newItem).forEach((key) => {
        if (standardKeys.includes(key)) payload[key] = newItem[key];
      });

      await addAtt.mutateAsync(payload);
    } catch (err) {
      console.error("[AttendancePage] Add error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAtt.mutateAsync(id);
  };

  const handleColumnAdd = async (payload: any) => {
    if (!companyId) return;
    await addColumn.mutateAsync({
      entityType: "attendance",
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

  if (!companyId) return null;

  return (
    <div className="space-y-4 relative">
      <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/50 shadow-2xl shadow-indigo-900/5 min-h-[750px] flex flex-col relative overflow-hidden">
        {/* Dynamic Header */}
        <div className="relative z-[60] bg-white/10 border-b border-slate-200/50">
          <AnimatePresence mode="wait">
            {!selectedRowId ? (
              <motion.div
                key="default-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <Input
                      placeholder={t("hr.search_attendance")}
                      className="pl-10 h-10 border-slate-200/60 rounded-2xl bg-white shadow-sm text-xs focus:ring-4 focus:ring-amber-500/10 transition-all font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-auto mr-4">
                  <span className="flex items-center gap-2">
                    {t("hr.stat_workforce")}{" "}
                    <span className="text-slate-900 text-xs font-black">
                      {stats.total}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-emerald-500">
                    {t("hr.stat_present")}{" "}
                    <span className="text-emerald-700 text-xs font-black">
                      {stats.present}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-amber-500">
                    {t("hr.stat_late")}{" "}
                    <span className="text-amber-700 text-xs font-black">
                      {stats.late}
                    </span>
                  </span>
                </div>

                <Button
                  size="sm"
                  className="h-10 px-6 rounded-2xl gap-2 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-amber-500/20"
                  onClick={() =>
                    (
                      document.querySelector(
                        '[aria-label="New Record"]',
                      ) as HTMLButtonElement
                    )?.click()
                  }
                >
                  <Clock className="w-4 h-4" /> {t("hr.log_attendance")}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="selection-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex items-center justify-between bg-amber-50/80 backdrop-blur-md text-amber-900 shadow-sm border-b-2 border-amber-200/50 transition-colors duration-500"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-3xl bg-white flex items-center justify-center text-amber-600 font-black text-xs shadow-xl border-2 border-amber-100">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">
                      {selectedEntry?.employee?.first_name}{" "}
                      {selectedEntry?.employee?.last_name}
                    </h2>
                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest opacity-70 flex items-center gap-2">
                      <CalendarDays className="w-3 h-3" />{" "}
                      {new Date(selectedEntry?.date).toLocaleDateString()} •{" "}
                      {selectedEntry?.hours_worked || "0.00"} {t("hr.compute_hours")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="h-11 w-11 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-100 rounded-2xl transition-all"
                  onClick={() => setSelectedRowId(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table Content */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {isLoading ? (
            <FleetTableSkeleton rows={12} cols={6} />
          ) : (
            <EditableTable
              hideHeader={true}
              multiSelect={false}
              data={mappedAttendance}
              columns={columns}
              virtualColumns={virtualColumns}
              onSelectionChange={(ids) =>
                setSelectedRowId(ids[ids.length - 1] || null)
              }
              selectedRowId={selectedRowId}
              searchQuery={searchTerm}
              onSearchQueryChange={setSearchTerm}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onColumnAdd={handleColumnAdd}
              onColumnUpdate={handleColumnUpdate}
              onColumnDelete={handleColumnDelete}
              pagination={true}
              totalRows={totalRows}
              onPageChange={setPage}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 bg-slate-50/50 border-t border-slate-200/50 flex items-center justify-between select-none">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 group cursor-help">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t("hr.attendance_verifier")}
              </span>
            </div>
            <div className="flex items-center gap-2 group cursor-help">
              <Settings2 className="w-3 h-3 text-slate-400 group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t("hr.attendance_entity")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-3 py-1 bg-slate-100/50 rounded-full border border-slate-200/50">
              ISO-8601 LOGGING STANDARD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
