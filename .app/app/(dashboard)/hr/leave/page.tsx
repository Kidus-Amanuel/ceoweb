"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCompanies } from "@/hooks/use-companies";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  useLeaves,
  useAddLeave,
  useUpdateLeave,
  useDeleteLeave,
  useEmployees,
  useLeaveTypes,
  useHrColumnDefs,
  useAddHrColumn,
  useUpdateHrColumn,
  useDeleteHrColumn,
} from "@/hooks/use-hr";
import {
  Search,
  Palmtree,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Settings2,
  X,
} from "lucide-react";
import { type VirtualColumn } from "@/components/shared/table/EditableTable";
import { Input } from "@/components/shared/ui/input/Input";
import { motion, AnimatePresence } from "framer-motion";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";
import { calculateDays } from "@/utils/table-utils";
import { type ColumnFieldType } from "@/components/shared/table/CustomColumnEditorContent";

export default function LeaveRequestsPage() {
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  // 1. Pagination & State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [status, setStatus] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 2. Data Fetching
  const { data: leavesRes, isLoading } = useLeaves(companyId, {
    page,
    pageSize,
    status,
    search: searchTerm,
  });
  const { data: employeesRes } = useEmployees(companyId);
  const { data: leaveTypes = [] } = useLeaveTypes(companyId);
  const { data: columnDefs = [] } = useHrColumnDefs("leaves", companyId);

  const leaves = useMemo(() => leavesRes?.data || [], [leavesRes]);
  const totalRows = leavesRes?.total || 0;
  const employees = useMemo(() => employeesRes?.data || [], [employeesRes]);

  const selectedLeave = useMemo(
    () => leaves.find((l) => l.id === selectedRowId),
    [leaves, selectedRowId],
  );

  // 3. Mutations
  const addLeave = useAddLeave(companyId, {
    onSuccess: () => toast.success(t("hr.toast_leave_add")),
    onError: (err: any) =>
      toast.error(err.message || t("hr.toast_leave_add") + " failed"),
  });
  const updateLeave = useUpdateLeave(companyId, {
    onSuccess: () => toast.success(t("hr.toast_leave_update")),
    onError: (err: any) =>
      toast.error(err.message || t("hr.toast_leave_update") + " failed"),
  });
  const deleteLeave = useDeleteLeave(companyId, {
    onSuccess: () => {
      toast.success(t("hr.toast_leave_delete"));
      setSelectedRowId(null);
    },
    onError: (err: any) =>
      toast.error(err.message || t("hr.toast_leave_delete") + " failed"),
  });

  const addColumn = useAddHrColumn("leaves", companyId, {
    onSuccess: () => toast.success(t("hr.toast_field_add")),
  });
  const updateColumn = useUpdateHrColumn("leaves", companyId, {
    onSuccess: () => toast.success(t("hr.toast_field_update")),
  });
  const deleteColumn = useDeleteHrColumn("leaves", companyId, {
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

  const mappedLeaves = useMemo(
    () => leaves.map((l) => ({ ...l, customValues: l.custom_fields || {} })),
    [leaves],
  );

  const stats = useMemo(
    () => ({
      total: totalRows,
      approved: leaves.filter((l) => l.status === "approved").length,
      pending: leaves.filter((l) => l.status === "pending").length,
    }),
    [totalRows, leaves],
  );

  // 4. Table Configuration
  const columns = useMemo(
    () => [
      {
        header: t("hr.col_employee"),
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
            <div className="flex flex-col">
              <span className="font-semibold text-slate-700">
                {emp ? `${emp.first_name} ${emp.last_name}` : "Unknown"}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {emp?.employee_code || "-"}
              </span>
            </div>
          );
        },
      },
      {
        header: t("hr.col_leave_type"),
        accessorKey: "leave_type_id",
        meta: {
          type: "select" as ColumnFieldType,
          options: leaveTypes.map((t: any) => ({
            label: t.name,
            value: t.id,
          })),
        },
        cell: ({ row }: any) => (
          <Badge
            variant="outline"
            className="rounded-lg text-[10px] font-bold px-2 py-0.5"
            style={{
              borderColor: row.original.leave_type?.color || "#e2e8f0",
              backgroundColor:
                (row.original.leave_type?.color || "#000000") + "10",
              color: row.original.leave_type?.color || "#475569",
            }}
          >
            {row.original.leave_type?.name || "Other"}
          </Badge>
        ),
      },
      {
        header: t("hr.col_start_date"),
        accessorKey: "start_date",
        meta: { type: "date" as ColumnFieldType },
      },
      {
        header: t("hr.col_end_date"),
        accessorKey: "end_date",
        meta: { type: "date" as ColumnFieldType },
      },
      {
        header: t("hr.col_status"),
        accessorKey: "status",
        meta: {
          type: "select" as ColumnFieldType,
          options: [
            { label: t("hr.status_pending"), value: "pending" },
            { label: t("hr.status_approved"), value: "approved" },
            { label: t("hr.status_rejected"), value: "rejected" },
            { label: t("hr.status_cancelled"), value: "cancelled" },
          ],
        },
        cell: ({ row }: any) => {
          const status = row.original.status || "pending";
          const variants: Record<string, string> = {
            pending: "bg-blue-50 text-blue-700 border-blue-100",
            approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
            rejected: "bg-rose-50 text-rose-700 border-rose-100",
            cancelled: "bg-slate-50 text-slate-700 border-slate-100",
          };
          return (
            <div className="flex items-center gap-1.5">
              {status === "approved" && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
              {status === "rejected" && (
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
              )}
              {status === "pending" && (
                <Clock className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              )}
              <Badge
                variant="outline"
                className={`capitalize text-[9px] font-black tracking-widest ${variants[status] || ""}`}
              >
                {status}
              </Badge>
            </div>
          );
        },
      },
      {
        header: t("hr.col_total_days"),
        accessorKey: "days_taken",
        meta: { type: "number" as ColumnFieldType, readOnly: true },
        cell: ({ row }: any) => (
          <span className="font-bold text-slate-700">
            {calculateDays(row.original.start_date, row.original.end_date)}{" "}
            {t("hr.days_label")}
          </span>
        ),
      },
      {
        header: t("hr.col_reason"),
        accessorKey: "reason",
        meta: { type: "text" as ColumnFieldType },
        cell: ({ row }: any) => (
          <span className="text-xs text-slate-500 truncate max-w-[150px] inline-block">
            {row.original.reason || "-"}
          </span>
        ),
      },
    ],
    [t, employees, leaveTypes],
  );

  const handleUpdate = async (id: string, updatedFields: any) => {
    try {
      const payload: any = { id };
      const customData = updatedFields.customValues || {};
      const standardKeys = [
        "employee_id",
        "leave_type_id",
        "start_date",
        "end_date",
        "days_taken",
        "status",
        "reason",
      ];

      Object.keys(updatedFields).forEach((key) => {
        if (standardKeys.includes(key)) {
          payload[key] = updatedFields[key];
        }
      });

      if (payload.start_date || payload.end_date) {
        const existing = leaves.find((l) => l.id === id);
        payload.days_taken = calculateDays(
          payload.start_date || existing?.start_date,
          payload.end_date || existing?.end_date,
        );
      }

      const existing = leaves.find((x) => x.id === id);
      const mergedCustom = {
        ...(existing?.custom_fields || {}),
        ...customData,
      };
      if (Object.keys(mergedCustom).length > 0)
        payload.custom_fields = mergedCustom;

      await updateLeave.mutateAsync(payload);
    } catch (err) {
      console.error("[LeaveRequestsPage] Update error:", err);
    }
  };

  const handleAdd = async (newItem: any) => {
    try {
      const customData = newItem.customValues || {};
      const payload: any = { company_id: companyId, custom_fields: customData };
      const standardKeys = [
        "employee_id",
        "leave_type_id",
        "start_date",
        "end_date",
        "days_taken",
        "status",
        "reason",
      ];

      Object.keys(newItem).forEach((key) => {
        if (standardKeys.includes(key)) payload[key] = newItem[key];
      });

      payload.days_taken = calculateDays(newItem.start_date, newItem.end_date);
      payload.status = payload.status || "pending";

      await addLeave.mutateAsync(payload);
    } catch (err) {
      console.error("[LeaveRequestsPage] Add error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteLeave.mutateAsync(id);
  };

  const handleColumnAdd = async (payload: any) => {
    if (!companyId) return;
    await addColumn.mutateAsync({
      entityType: "leaves",
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
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <Input
                      placeholder={t("hr.search_leaves")}
                      className="pl-10 h-10 border-slate-200/60 rounded-2xl bg-white shadow-sm text-xs focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                    {["all", "pending", "approved"].map((f) => (
                      <Button
                        key={f}
                        variant={
                          status === f || (f === "all" && !status)
                            ? "secondary"
                            : "ghost"
                        }
                        size="sm"
                        className={`h-8 px-3 text-[10px] font-black uppercase rounded-lg transition-all ${
                          status === f || (f === "all" && !status)
                            ? "bg-white shadow-sm text-emerald-600"
                            : "text-slate-400"
                        }`}
                        onClick={() => setStatus(f === "all" ? undefined : f)}
                      >
                        {f === "all"
                          ? t("hr.filter_all")
                          : f === "pending"
                            ? t("hr.filter_pending")
                            : t("hr.filter_approved")}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-auto mr-4">
                  <span className="flex items-center gap-2">
                    {t("hr.stat_total")}{" "}
                    <span className="text-slate-900 text-xs font-black">
                      {stats.total}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-amber-500">
                    {t("hr.filter_pending")}{" "}
                    <span className="text-amber-700 text-xs font-black">
                      {stats.pending}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-emerald-500">
                    {t("hr.filter_approved")}{" "}
                    <span className="text-emerald-700 text-xs font-black">
                      {stats.approved}
                    </span>
                  </span>
                </div>

                <Button
                  size="sm"
                  className="h-10 px-6 rounded-2xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20"
                  onClick={() =>
                    (
                      document.querySelector(
                        '[aria-label="New Record"]',
                      ) as HTMLButtonElement
                    )?.click()
                  }
                >
                  <Plus className="w-4 h-4" /> {t("hr.request_leave")}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="selection-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex items-center justify-between bg-emerald-50/80 backdrop-blur-md text-emerald-900 shadow-sm border-b-2 border-emerald-200/50 transition-colors duration-500"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-3xl bg-white flex items-center justify-center text-emerald-600 font-black text-xs shadow-xl border-2 border-emerald-100">
                    {selectedLeave?.employee?.first_name?.[0]}
                    {selectedLeave?.employee?.last_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      {selectedLeave?.employee?.first_name}{" "}
                      {selectedLeave?.employee?.last_name}
                    </h2>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest opacity-70">
                      {selectedLeave?.leave_type?.name} •{" "}
                      {calculateDays(
                        selectedLeave?.start_date,
                        selectedLeave?.end_date,
                      )}{" "}
                      {t("hr.days_label")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="h-11 w-11 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-2xl transition-all"
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
              data={mappedLeaves}
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
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t("hr.live_registry")}
              </span>
            </div>
            <div className="flex items-center gap-2 group cursor-help">
              <Settings2 className="w-3 h-3 text-slate-400 group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Entity: LEAVES
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[8px] font-black text-emerald-600 hover:bg-emerald-50 rounded-full px-4 uppercase tracking-widest border border-emerald-100"
            onClick={() => (window.location.href = "/hr/leave/types")}
          >
            {t("hr.configure_types")}
          </Button>
        </div>
      </div>
    </div>
  );
}
