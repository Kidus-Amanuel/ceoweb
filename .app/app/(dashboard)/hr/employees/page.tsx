"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  EditableTable,
  type VirtualColumn,
} from "@/components/shared/table/EditableTable";
import {
  Users,
  UserPlus,
  Search,
  Download,
  Filter,
  RefreshCw,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  Palmtree,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  UserCheck,
  LayoutGrid,
  Settings2,
  Trash2,
  X,
  UserCircle2,
  Plus,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import { useCompanies } from "@/hooks/use-companies";
import {
  useEmployees,
  useAddEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useDepartments,
  usePositions,
  useHrColumnDefs,
  useAddHrColumn,
  useUpdateHrColumn,
  useDeleteHrColumn,
  useLeaves,
  useAddLeave,
  useUpdateLeave,
  useDeleteLeave,
  useLeaveTypes,
  useAddLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
} from "@/hooks/use-hr";
import { toast } from "@/hooks/use-toast";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";
import { motion, AnimatePresence } from "framer-motion";
import { calculateDays } from "@/utils/table-utils";
import { type ColumnFieldType } from "@/components/shared/table/CustomColumnEditorContent";

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  // 1. Navigation & Search State
  const [view, setView] = useState<"list" | "leaves" | "types">("list");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 2. Main Data Fetching
  const { data: employeeRes, isLoading: loading } = useEmployees(companyId, {
    page,
    pageSize,
    search: searchTerm,
    status: statusFilter,
  });
  const { data: departments = [] } = useDepartments(companyId);
  const { data: positions = [] } = usePositions(companyId);

  const entityType = useMemo(() => {
    if (view === "list") return "employees";
    if (view === "leaves") return "leaves";
    return "leave_types";
  }, [view]);

  const { data: columnDefs = [] } = useHrColumnDefs(entityType, companyId);

  const employees = useMemo(() => employeeRes?.data || [], [employeeRes]);
  const totalRows = employeeRes?.total || 0;

  const selectedEmployee = useMemo(
    () =>
      employees.find(
        (e) => e.id === (view === "list" ? selectedRowId : activeEmployeeId),
      ),
    [employees, selectedRowId, activeEmployeeId, view],
  );

  // 3. Detail Data - Leaves & Types
  const { data: leaveRes, isLoading: loadingLeaves } = useLeaves(companyId, {
    employee_id: activeEmployeeId || undefined,
  });
  const leaves = useMemo(() => leaveRes?.data || [], [leaveRes]);

  const { data: leaveTypes = [], isLoading: loadingTypes } =
    useLeaveTypes(companyId);

  // 4. Mutations
  const addEmp = useAddEmployee(companyId, {
    onSuccess: () => toast.success(t("hr.toast_employee_add")),
  });
  const updateEmp = useUpdateEmployee(companyId, {
    onSuccess: () => toast.success(t("hr.toast_employee_update")),
  });
  const deleteEmp = useDeleteEmployee(companyId, {
    onSuccess: () => {
      toast.success(t("hr.toast_employee_delete"));
      setSelectedRowId(null);
    },
  });

  const addLeave = useAddLeave(companyId, {
    onSuccess: () => toast.success(t("hr.toast_leave_log")),
  });
  const updateLeave = useUpdateLeave(companyId, {
    onSuccess: () => toast.success(t("hr.toast_leave_refined")),
  });
  const deleteLeave = useDeleteLeave(companyId, {
    onSuccess: () => toast.success(t("hr.toast_leave_deleted")),
  });

  const addType = useAddLeaveType(companyId, {
    onSuccess: () => toast.success(t("hr.toast_leave_type_add")),
  });
  const updateType = useUpdateLeaveType(companyId, {
    onSuccess: () => toast.success(t("hr.toast_leave_type_update")),
  });
  const deleteType = useDeleteLeaveType(companyId, {
    onSuccess: () => toast.success(t("hr.toast_leave_type_delete")),
  });

  const addColumn = useAddHrColumn(entityType, companyId, {
    onSuccess: () => toast.success(t("hr.toast_field_add")),
  });
  const updateColumn = useUpdateHrColumn(entityType, companyId, {
    onSuccess: () => toast.success(t("hr.toast_field_update")),
  });
  const deleteColumn = useDeleteHrColumn(entityType, companyId, {
    onSuccess: () => toast.success(t("hr.toast_field_delete")),
  });

  // 5. Derived Options & Stats
  const deptOptions = useMemo(
    () => departments.map((d: any) => ({ label: d.name, value: d.id })),
    [departments],
  );
  const posOptions = useMemo(
    () => positions.map((p: any) => ({ label: p.title, value: p.id })),
    [positions],
  );
  const leaveTypeOptions = useMemo(
    () => leaveTypes.map((t: any) => ({ label: t.name, value: t.id })),
    [leaveTypes],
  );

  const stats = useMemo(
    () => ({
      total: totalRows,
      active: employees.filter(
        (e) => e.status === "active" && !e.on_active_leave,
      ).length,
      onLeave: employees.filter((e) => e.on_active_leave).length,
    }),
    [totalRows, employees],
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

  // 6. Data Mapping (Bridge between DB snake_case and Table customValues)
  const mappedEmployees = useMemo(
    () => employees.map((e) => ({ ...e, customValues: e.custom_fields || {} })),
    [employees],
  );
  const mappedLeaves = useMemo(
    () => leaves.map((l) => ({ ...l, customValues: l.custom_fields || {} })),
    [leaves],
  );
  const mappedLeaveTypes = useMemo(
    () =>
      leaveTypes.map((t) => ({ ...t, customValues: t.custom_fields || {} })),
    [leaveTypes],
  );

  // 7. Dynamic Column Configuration
  const employeeColumns = useMemo(
    () => [
      {
        header: t("hr.col_employee"),
        accessorKey: "first_name",
        meta: { type: "text" as ColumnFieldType },
        cell: ({ row }: any) => {
          const initials =
            `${row.original.first_name?.[0] || ""}${row.original.last_name?.[0] || ""}`.toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white/10 shrink-0">
                {initials || "?"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-800 truncate leading-none mb-1">
                  {row.original.first_name} {row.original.last_name}
                </span>
                <span className="text-[10px] items-center gap-1 flex font-mono text-slate-400">
                  <LayoutGrid className="w-2.5 h-2.5" />{" "}
                  {row.original.employee_code}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        header: t("hr.col_department"),
        accessorKey: "department_id",
        meta: { type: "select" as ColumnFieldType, options: deptOptions },
        cell: ({ row }: any) => (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-600 font-bold border-transparent"
          >
            {row.original.department?.name || "Unassigned"}
          </Badge>
        ),
      },
      {
        header: t("hr.col_position_role"),
        accessorKey: "position_id",
        meta: { type: "select" as ColumnFieldType, options: posOptions },
        cell: ({ row }: any) => (
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-600 truncate">
              {row.original.position?.title || "-"}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {row.original.email || "No email"}
            </span>
          </div>
        ),
      },
      {
        header: t("hr.col_current_status"),
        accessorKey: "status",
        meta: {
          type: "select" as ColumnFieldType,
          options: [
            { label: t("hr.status_active"), value: "active" },
            { label: t("hr.status_on_leave"), value: "on_leave" },
            { label: t("hr.status_terminated"), value: "terminated" },
          ],
        },
        cell: ({ row }: any) => {
          const onLeave = row.original.on_active_leave;
          return (
            <Badge
              variant="outline"
              className={`capitalize text-[9px] font-black tracking-widest px-2.5 ${onLeave ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}
            >
              {onLeave
                ? t("hr.status_on_leave")
                : row.original.status
                  ? t(`hr.status_${row.original.status}`)
                  : t("hr.status_active")}
            </Badge>
          );
        },
      },
      {
        header: t("hr.col_salary"),
        accessorKey: "basic_salary",
        meta: { type: "currency" as ColumnFieldType },
      },
    ],
    [t, deptOptions, posOptions],
  );

  const leaveColumns = useMemo(
    () => [
      {
        header: t("hr.col_category"),
        accessorKey: "leave_type_id",
        meta: { type: "select" as ColumnFieldType, options: leaveTypeOptions },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-50 rounded-lg">
              <Palmtree className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm font-black text-slate-800">
              {row.original.leave_type?.name ||
                row.original.leave_type_id?.substring(0, 8) ||
                "Personal Leave"}
            </span>
          </div>
        ),
      },
      {
        header: t("hr.col_from"),
        accessorKey: "start_date",
        meta: { type: "date" as ColumnFieldType },
      },
      {
        header: t("hr.col_until"),
        accessorKey: "end_date",
        meta: { type: "date" as ColumnFieldType },
      },
      {
        header: t("hr.col_days"),
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
        header: t("hr.col_leave_note"),
        accessorKey: "reason",
        meta: { type: "text" as ColumnFieldType },
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
          ],
        },
        cell: ({ row }: any) => {
          const status = row.original.status || "pending";
          const styles: Record<string, string> = {
            approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
            pending: "bg-amber-50 text-amber-700 border-amber-100",
            rejected: "bg-rose-50 text-rose-700 border-rose-100",
          };
          return (
            <Badge
              variant="outline"
              className={`uppercase text-[9px] font-black tracking-widest ${styles[status]}`}
            >
              {t(`hr.status_${status}`)}
            </Badge>
          );
        },
      },
    ],
    [t, leaveTypeOptions],
  );

  const typeColumns = useMemo(
    () => [
      {
        header: t("hr.col_category_name"),
        accessorKey: "name",
        meta: { type: "text" as ColumnFieldType },
      },
      {
        header: t("hr.col_annual_limit"),
        accessorKey: "days_per_year",
        meta: { type: "number" as ColumnFieldType },
      },
      {
        header: t("hr.col_paid_leave"),
        accessorKey: "paid",
        meta: { type: "boolean" as ColumnFieldType },
      },
      {
        header: t("hr.col_carry_over"),
        accessorKey: "carry_over",
        meta: { type: "boolean" as ColumnFieldType },
      },
    ],
    [t],
  );

  // 7. Event Logic - Single Selection Behavior
  const handleSelectionChange = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        setSelectedRowId(null);
        if (view === "list") setActiveEmployeeId(null);
        return;
      }
      const latestId = ids[ids.length - 1];
      setSelectedRowId(latestId);
      if (view === "list") setActiveEmployeeId(latestId);
    },
    [view],
  );

  const handleUpdate = async (id: string, updatedFields: any) => {
    try {
      const updatePayload: any = { id };
      const customData = updatedFields.customValues || {};

      // Determine standard keys based on view
      const standardKeys =
        view === "list"
          ? [
              "first_name",
              "last_name",
              "email",
              "employee_code",
              "department_id",
              "position_id",
              "status",
              "basic_salary",
              "hourly_rate",
              "hire_date",
              "termination_date",
              "job_title",
              "user_id",
            ]
          : view === "leaves"
            ? [
                "leave_type_id",
                "start_date",
                "end_date",
                "days_taken",
                "reason",
                "status",
              ]
            : ["name", "paid", "days_per_year", "carry_over"];

      // 1. Map standard fields
      Object.keys(updatedFields).forEach((key) => {
        if (standardKeys.includes(key)) {
          let val = updatedFields[key];
          // Handle currency objects from SmartEditor (extract amount for numeric DB columns)
          if (val && typeof val === "object" && "amount" in val) {
            val = (val as any).amount;
          }
          updatePayload[key] = val;
        }
      });

      // Special handling for leave days calculation
      if (
        view === "leaves" &&
        (updatePayload.start_date || updatePayload.end_date)
      ) {
        const existing = leaves.find((l) => l.id === id);
        updatePayload.days_taken = calculateDays(
          updatePayload.start_date || existing?.start_date,
          updatePayload.end_date || existing?.end_date,
        );
      }

      // 2. Map custom fields
      const existing = (
        view === "list" ? employees : view === "leaves" ? leaves : leaveTypes
      ).find((x) => x.id === id);
      const mergedCustom = {
        ...(existing?.custom_fields || {}),
        ...customData,
      };
      if (Object.keys(mergedCustom).length > 0)
        updatePayload.custom_fields = mergedCustom;

      // 3. Dispatch
      if (view === "list") await updateEmp.mutateAsync(updatePayload);
      else if (view === "leaves") await updateLeave.mutateAsync(updatePayload);
      else await updateType.mutateAsync(updatePayload);
    } catch (err) {
      console.error("[EmployeesPage] Update error:", err);
    }
  };

  const handleAdd = async (newItem: any) => {
    try {
      const customData = newItem.customValues || {};
      const payload: any = { company_id: companyId };

      const standardKeys =
        view === "list"
          ? [
              "first_name",
              "last_name",
              "email",
              "employee_code",
              "department_id",
              "position_id",
              "status",
              "basic_salary",
              "hourly_rate",
              "hire_date",
              "termination_date",
              "job_title",
              "user_id",
            ]
          : view === "leaves"
            ? [
                "leave_type_id",
                "start_date",
                "end_date",
                "days_taken",
                "reason",
                "status",
              ]
            : ["name", "paid", "days_per_year", "carry_over"];

      // 1. Map standard fields
      Object.keys(newItem).forEach((key) => {
        if (standardKeys.includes(key)) {
          let val = newItem[key];
          // Handle currency objects from SmartEditor
          if (val && typeof val === "object" && "amount" in val) {
            val = (val as any).amount;
          }
          payload[key] = val;
        }
      });

      // 2. Add custom fields
      payload.custom_fields = customData;

      // 3. Dispatch
      if (view === "list") {
        payload.employee_code =
          payload.employee_code ||
          `EMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await addEmp.mutateAsync(payload);
      } else if (view === "leaves") {
        const days_taken = calculateDays(payload.start_date, payload.end_date);
        await addLeave.mutateAsync({
          ...payload,
          days_taken,
          employee_id: activeEmployeeId,
          status: payload.status || "pending",
        });
      } else {
        await addType.mutateAsync({
          ...payload,
          paid: payload.paid ?? true,
          carry_over: payload.carry_over ?? false,
        });
      }
    } catch (err) {
      console.error("[EmployeesPage] Add error:", err);
    }
  };

  const handleColumnAdd = async (payload: any) => {
    if (!companyId) return;
    await addColumn.mutateAsync({
      entityType:
        view === "list"
          ? "employees"
          : view === "leaves"
            ? "leaves"
            : "leave_types",
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

  const handleManageLeaves = () => {
    if (selectedRowId) {
      // Order of operations: set the target person first, then the view, then clear list selection
      const personId = selectedRowId;
      setActiveEmployeeId(personId);
      setView("leaves");
      setPage(1); // Reset pagination for the new view
      setTimeout(() => setSelectedRowId(null), 10);
    }
  };

  const handleBackToDirectory = () => {
    setView("list");
    setPage(1); // Reset pagination back to directory
    setSelectedRowId(activeEmployeeId);
  };

  // useEffect(() => { setPage(1); }, [view]); // Removed to fix cascading render warning

  if (!companyId) return null;

  return (
    <div className="space-y-4 relative">
      <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/50 shadow-2xl shadow-indigo-900/5 min-h-[750px] flex flex-col relative overflow-hidden">
        {/* Dynamic Header Section */}
        <div className="relative z-[60] bg-white/10 border-b border-slate-200/50">
          <AnimatePresence mode="wait">
            {view === "list" && !selectedRowId && (
              <motion.div
                key="default-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input
                      placeholder={t("hr.search_employees")}
                      className="pl-10 h-10 border-slate-200/60 rounded-2xl bg-white shadow-sm text-xs focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                    {["all", "active", "on_leave"].map((f) => (
                      <Button
                        key={f}
                        variant={statusFilter === f ? "secondary" : "ghost"}
                        size="sm"
                        className={`h-8 px-3 text-[10px] font-black uppercase rounded-lg gap-1.5 transition-all ${
                          statusFilter === f
                            ? "bg-white shadow-sm text-indigo-600 border border-slate-200/50"
                            : "text-slate-400"
                        }`}
                        onClick={() => setStatusFilter(f)}
                      >
                        {f === "active" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        {f === "all"
                          ? t("hr.filter_all")
                          : f === "active"
                            ? t("hr.filter_active")
                            : t("hr.filter_on_leave")}
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
                  <span className="flex items-center gap-2 text-emerald-500">
                    {t("hr.stat_active")}{" "}
                    <span className="text-emerald-700 text-xs font-black">
                      {stats.active}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-amber-500">
                    {t("hr.stat_on_leave")}{" "}
                    <span className="text-amber-700 text-xs font-black">
                      {stats.onLeave}
                    </span>
                  </span>
                </div>

                <Button
                  size="sm"
                  className="h-10 px-6 rounded-2xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-500/20"
                  onClick={() =>
                    (
                      document.querySelector(
                        '[aria-label="New Record"]',
                      ) as HTMLButtonElement
                    )?.click()
                  }
                >
                  <UserPlus className="w-4 h-4" /> {t("hr.recruit_talent")}
                </Button>
              </motion.div>
            )}

            {view === "list" && selectedRowId && (
              <motion.div
                key="selection-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex items-center justify-between bg-indigo-50/80 backdrop-blur-md text-indigo-900 shadow-sm border-b-2 border-indigo-200/50 transition-colors duration-500"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-3xl bg-white flex items-center justify-center text-indigo-600 font-black text-xs shadow-xl shadow-indigo-200 border-2 border-indigo-100">
                      {selectedEmployee?.first_name?.[0]}
                      {selectedEmployee?.last_name?.[0]}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-xl border-2 border-white flex items-center justify-center shadow-lg">
                      <UserCheck className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-tight leading-none mb-1 text-slate-900">
                      {selectedEmployee?.first_name}{" "}
                      {selectedEmployee?.last_name}
                    </h2>
                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest flex items-center gap-2 opacity-70">
                      {selectedEmployee?.employee_code}{" "}
                      <span className="text-indigo-300">•</span>{" "}
                      {selectedEmployee?.position?.title || "Staff Member"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="h-11 px-5 text-indigo-700 hover:bg-white hover:text-indigo-800 rounded-2xl gap-3 transition-all border border-indigo-100 bg-white/50 shadow-sm hover:shadow-md group"
                    onClick={handleManageLeaves}
                  >
                    <div className="p-1 bg-amber-100 rounded-lg group-hover:scale-110 transition-transform">
                      <Palmtree className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {t("hr.manage_leaves")}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 px-5 text-indigo-700 hover:bg-white hover:text-indigo-800 rounded-2xl gap-3 transition-all border border-indigo-100 bg-white/50 shadow-sm opacity-50 cursor-not-allowed group"
                    disabled
                  >
                    <div className="p-1 bg-sky-100 rounded-lg group-hover:scale-110 transition-transform">
                      <Clock className="w-4 h-4 text-sky-600" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {t("hr.clock_logs")}
                    </span>
                  </Button>
                  <div className="w-px h-8 bg-indigo-200 mx-3 opacity-50" />
                  <Button
                    variant="ghost"
                    className="h-11 w-11 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-2xl transition-all"
                    onClick={() => setSelectedRowId(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {(view === "leaves" || view === "types") && (
              <motion.div
                key="drilldown-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="px-6 py-4 flex items-center justify-between bg-white"
              >
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToDirectory}
                    className="rounded-2xl hover:bg-slate-50 border border-slate-200 h-10 px-4 group shadow-sm bg-white"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500 mr-2 group-hover:translate-x-[-2px] transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {t("hr.employee_directory")}
                    </span>
                  </Button>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xl">
                      {selectedEmployee?.first_name?.[0]}
                      {selectedEmployee?.last_name?.[0]}
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-800 leading-none flex items-center gap-2">
                        {view === "types"
                          ? "System Categories"
                          : `${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-indigo-600 underline underline-offset-4 decoration-indigo-200">
                          {view === "types" ? "Leave Logic" : "Leave Ledger"}
                        </span>
                      </h2>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">
                        {view === "types"
                          ? "Universal category parameters"
                          : "Reviewing individual tenure history"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {view === "leaves" && (
                    <Button
                      variant="ghost"
                      className="h-10 px-4 rounded-xl gap-2 text-slate-500 hover:bg-slate-100 border border-slate-200"
                      onClick={() => setView("types")}
                    >
                      <Settings2 className="w-4 h-4" />{" "}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Global Categories
                      </span>
                    </Button>
                  )}
                  {view === "types" && (
                    <Button
                      variant="ghost"
                      className="h-10 px-4 rounded-xl gap-2 text-slate-500 hover:bg-slate-100 border border-slate-200"
                      onClick={() => setView("leaves")}
                    >
                      <Palmtree className="w-4 h-4" />{" "}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Return to Ledger
                      </span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="h-10 px-6 rounded-2xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/10"
                    onClick={() =>
                      (
                        document.querySelector(
                          '[aria-label="New Record"]',
                        ) as HTMLButtonElement
                      )?.click()
                    }
                  >
                    <Plus className="w-4 h-4" />{" "}
                    {view === "types" ? "NEW CATEGORY" : "NEW LEAVE REQUEST"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table Content */}
        <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {loading ||
          (view === "leaves" && loadingLeaves) ||
          (view === "types" && loadingTypes) ? (
            <FleetTableSkeleton rows={12} cols={6} />
          ) : (
            <EditableTable
              key={view}
              hideHeader={true}
              multiSelect={false}
              data={
                view === "list"
                  ? mappedEmployees
                  : view === "leaves"
                    ? mappedLeaves
                    : mappedLeaveTypes
              }
              columns={
                view === "list"
                  ? employeeColumns
                  : view === "leaves"
                    ? leaveColumns
                    : typeColumns
              }
              virtualColumns={virtualColumns}
              onSelectionChange={handleSelectionChange}
              selectedRowId={selectedRowId}
              searchQuery={searchTerm}
              onSearchQueryChange={setSearchTerm}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onDelete={
                view === "list"
                  ? deleteEmp.mutateAsync
                  : view === "leaves"
                    ? deleteLeave.mutateAsync
                    : deleteType.mutateAsync
              }
              onColumnAdd={handleColumnAdd}
              onColumnUpdate={handleColumnUpdate}
              onColumnDelete={handleColumnDelete}
              pagination={view === "list"}
              currentPage={page}
              totalRows={totalRows}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          )}
        </div>

        {/* Footer Audit Trace */}
        <div className="px-6 py-2.5 bg-slate-50/50 border-t border-slate-200/50 flex items-center justify-between select-none">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 group cursor-help">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                System Active
              </span>
            </div>
            <div className="flex items-center gap-2 group cursor-help">
              <Settings2 className="w-3 h-3 text-slate-400 group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Metadata Entity: {entityType.toUpperCase()}
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[8px] font-black text-slate-300 border-slate-200 uppercase tracking-widest italic px-3 py-0.5 rounded-full"
          >
            CEO-ERP Interlink v4.0.2 / SECURE
          </Badge>
        </div>
      </div>
    </div>
  );
}
