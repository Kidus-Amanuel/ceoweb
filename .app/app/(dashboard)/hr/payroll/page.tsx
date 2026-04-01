"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { type VirtualColumn } from "@/components/shared/table/EditableTable";
import { EditableTable } from "@/components/shared/table/EditableTable";
import {
  BadgeDollarSign,
  ArrowDownToLine,
  CheckCircle2,
  Receipt,
  Plus,
  RefreshCw,
  Calendar,
  TrendingUp,
  Clock,
  Search,
  Settings2,
  X,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import { useCompanies } from "@/hooks/use-companies";
import {
  usePayrollRuns,
  useAddPayrollRun,
  useUpdatePayrollRun,
  useHrColumnDefs,
  useAddHrColumn,
  useUpdateHrColumn,
  useDeleteHrColumn,
} from "@/hooks/use-hr";
import { useHRRealtime } from "@/hooks/use-hr-realtime";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { type ColumnFieldType } from "@/components/shared/table/CustomColumnEditorContent";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";

export default function PayrollPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  // 1. Live Sync
  useHRRealtime(companyId, ["payroll_runs"]);

  // 2. State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 2. Data Fetching
  const { data: runs = [], isLoading } = usePayrollRuns(companyId);
  const { data: columnDefs = [] } = useHrColumnDefs("payroll_runs", companyId);

  // 3. Mutations
  const addRun = useAddPayrollRun(companyId, {
    onSuccess: () => toast.success(t("hr.toast_payroll_add")),
    onError: (err: any) =>
      toast.error(err.message || t("hr.toast_payroll_add") + " failed"),
  });
  const updateRun = useUpdatePayrollRun(companyId, {
    onSuccess: () => toast.success(t("hr.toast_payroll_update")),
    onError: (err: any) =>
      toast.error(err.message || t("hr.toast_payroll_update") + " failed"),
  });

  // Custom Column Mutations
  const addColumn = useAddHrColumn("payroll_runs", companyId);
  const updateColumn = useUpdateHrColumn("payroll_runs", companyId);
  const deleteColumn = useDeleteHrColumn("payroll_runs", companyId);

  // 4. Utils
  const mappedRuns = useMemo(
    () => runs.map((r) => ({ ...r, customValues: r.custom_fields || {} })),
    [runs],
  );

  const stats = useMemo(() => {
    const totalCost = runs.reduce(
      (sum, r) => sum + (Number(r.total_cost) || 0),
      0,
    );
    const completed = runs.filter((r) => r.status === "completed").length;
    const pending = runs.filter(
      (r) => r.status === "draft" || r.status === "reviewing",
    ).length;

    return {
      totalCost: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(totalCost),
      completed,
      pending,
    };
  }, [runs]);

  const selectedRun = useMemo(
    () => mappedRuns.find((r) => r.id === selectedRowId),
    [mappedRuns, selectedRowId],
  );

  const virtualColumns: VirtualColumn[] = useMemo(() => {
    return columnDefs.map((def: any) => ({
      id: def.id,
      header: def.field_label,
      accessorKey: def.field_name,
      type: def.field_type as ColumnFieldType,
      options: ((def.field_options || []) as string[]).map((o) => ({
        label: o,
        value: o,
      })),
    }));
  }, [columnDefs]);

  // 5. Table Configuration
  const columns = useMemo(
    () => [
      {
        header: t("hr.col_payroll_period_start"),
        accessorKey: "period_start",
        meta: { type: "date" as ColumnFieldType },
        cell: ({ row }: any) => {
          const val = row.original.period_start;
          const month = val
            ? new Date(val).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : t("hr.custom_period");

          return (
            <div className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-[14px] flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-300 shadow-sm shadow-indigo-500/5">
                <Calendar className="w-4 h-4 text-indigo-600 group-hover:text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-slate-800 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">
                  {month}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Start: {val || "---"}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        header: t("hr.col_payroll_period_end"),
        accessorKey: "period_end",
        meta: { type: "date" as ColumnFieldType },
        cell: ({ row }: any) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-700 text-xs">
              {row.original.period_end || "---"}
            </span>
          </div>
        ),
      },
      {
        header: t("hr.col_status"),
        accessorKey: "status",
        meta: {
          type: "select" as ColumnFieldType,
          options: [
            { label: t("hr.status_draft"), value: "draft" },
            { label: t("hr.status_reviewing"), value: "reviewing" },
            { label: t("hr.status_processing"), value: "processing" },
            { label: t("hr.status_completed"), value: "completed" },
          ],
        },
        cell: ({ row }: any) => {
          const status = row.original.status || "draft";
          const config: Record<
            string,
            { bg: string; text: string; dot: string }
          > = {
            draft: {
              bg: "bg-slate-100",
              text: "text-slate-600",
              dot: "bg-slate-400",
            },
            reviewing: {
              bg: "bg-amber-100",
              text: "text-amber-700",
              dot: "bg-amber-500",
            },
            processing: {
              bg: "bg-blue-100",
              text: "text-blue-700",
              dot: "bg-blue-500",
            },
            completed: {
              bg: "bg-emerald-100",
              text: "text-emerald-700",
              dot: "bg-emerald-500",
            },
          };
          const style = config[status] || config.draft;
          return (
            <Badge
              variant="outline"
              className={`gap-1.5 px-3 py-1 border-none shadow-sm rounded-full capitalize text-[9px] font-black tracking-widest ${style.bg} ${style.text}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${style.dot} ${status === "processing" ? "animate-pulse" : ""}`}
              />
              {status}
            </Badge>
          );
        },
      },
      {
        header: t("hr.col_financial_summary"),
        accessorKey: "total_cost",
        meta: { type: "number" as ColumnFieldType },
        cell: ({ row }: any) => (
          <div className="flex flex-col items-end pr-4">
            <div className="flex items-center gap-1.5 font-black text-slate-900 tracking-tighter text-[15px]">
              <Receipt className="w-3.5 h-3.5 text-slate-300" />$
              {(row.original.total_cost || 0).toLocaleString()}
            </div>
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.14em] mt-1">
              Total Adjusted Cost
            </span>
          </div>
        ),
      },
    ],
    [t],
  );

  // 5. Table Handlers
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExecuteBatch = async () => {
    if (!selectedRowId) return;
    setIsProcessing(true);
    toast.info(`${t("hr.status_processing")} batch...`);
    try {
      const res = await fetch(`/api/hr/payroll-generate?run_id=${selectedRowId}`, {
        method: "POST",
      }).then((r) => r.json());

      if (res.error) throw new Error(res.error);

      toast.success(
        `Success: ${res.count} payslips generated for $${res.totalCost.toLocaleString()}`
      );
      
      // Refresh the page data
      window.location.reload(); 
    } catch (err: any) {
      toast.error(`Processing error: ${err.message}`);
      console.error("[PayrollPage] Execution Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async (id: string, updates: any) => {
    try {
      const existing = runs.find((r) => r.id === id);
      const customData = updates.customValues || existing?.custom_fields || {};
      const payload: any = { id, ...updates };

      delete payload.customValues;
      payload.custom_fields = customData;

      await updateRun.mutateAsync(payload);
    } catch (err) {
      console.error("[PayrollPage] Update error:", err);
    }
  };

  const handleAdd = async (newItem: any) => {
    try {
      const customData = newItem.customValues || {};
      const payload: any = {
        ...newItem,
        company_id: companyId,
        custom_fields: customData,
      };
      delete payload.customValues;

      await addRun.mutateAsync(payload);
    } catch (err) {
      console.error("[PayrollPage] Add error:", err);
    }
  };

  const handleColumnAdd = async (payload: any) => {
    if (!companyId) return;
    await addColumn.mutateAsync({
      entityType: "payroll_runs",
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
      fieldType: payload.type === "status" ? "select" : payload.type,
      fieldOptions: (payload.options ?? []).map((o: any) =>
        String(o.value ?? o.label),
      ),
    });
  };

  const handleColumnDelete = async (fieldId: string) => {
    await deleteColumn.mutateAsync(fieldId);
  };

  if (!companyId) return null;

  return (
    <div className="h-full flex flex-col space-y-4 pb-6 overflow-hidden">
      {/* ── Header System ── */}
      <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm shadow-slate-200/20 overflow-hidden flex-shrink-0 mx-1">
        <AnimatePresence mode="wait">
          {!selectedRowId ? (
            <motion.div
              key="default-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-6 py-5 flex flex-col lg:flex-row items-center justify-between gap-6"
            >
              <div className="flex items-center gap-5 w-full lg:w-auto">
                <div className="w-12 h-12 bg-indigo-600 rounded-[18px] flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <BadgeDollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black font-display text-slate-900 leading-none mb-1.5 uppercase tracking-tighter">
                    {t("hr.payroll_hub")}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-indigo-500" />{" "}
                      {t("hr.payroll_total")}:{" "}
                      <span className="text-slate-800">{stats.totalCost}</span>
                    </span>
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />{" "}
                      {t("hr.payroll_processed")}:{" "}
                      <span className="text-slate-800">{stats.completed}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative group flex-1 lg:w-[280px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                  <Input
                    placeholder={t("hr.search_payroll")}
                    className="pl-10 h-10 bg-slate-50/50 border-slate-200 rounded-xl font-bold text-[11px] uppercase tracking-wider focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-4 rounded-xl gap-2 border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase hover:bg-slate-50"
                  onClick={() => toast.info("Export CSV started...")}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="h-10 px-6 rounded-xl gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] tracking-widest uppercase shadow-xl shadow-slate-900/10"
                  onClick={() =>
                    (
                      document.querySelector(
                        '[aria-label="New Record"]',
                      ) as HTMLButtonElement
                    )?.click()
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> {t("hr.create_run")}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="selection-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="px-6 py-5 flex items-center justify-between bg-indigo-50/60 backdrop-blur-xl border-b border-indigo-100"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white rounded-[18px] border-2 border-indigo-100 flex items-center justify-center shadow-xl shadow-indigo-500/5">
                  <Receipt className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-none mb-1">
                    {selectedRun?.period_start
                      ? `Payroll: ${new Date(selectedRun.period_start).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                      : "Batch View"}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-indigo-600 font-black tracking-[0.1em] uppercase bg-indigo-100/50 px-2 py-0.5 rounded-md">
                      {selectedRun?.status || "Draft"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Ref: {selectedRowId.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  disabled={isProcessing || selectedRun?.status === "completed"}
                  className="h-10 px-6 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] tracking-widest uppercase shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  onClick={handleExecuteBatch}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} /> 
                  {isProcessing ? t("hr.status_processing") : t("hr.execute_batch")}
                </Button>
                <div className="h-8 w-px bg-indigo-200/50 mx-1" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 rounded-xl gap-2 border-indigo-200 text-indigo-600 font-black text-[9px] tracking-widest uppercase hover:bg-indigo-50"
                  onClick={() => router.push(`/hr/payroll/${selectedRowId}`)}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> {t("hr.open_ledger")}
                </Button>
                <div className="h-8 w-px bg-indigo-200/50 mx-1" />
                <Button
                  variant="ghost"
                  className="h-10 w-10 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-xl"
                  onClick={() => setSelectedRowId(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Table Environment ── */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-200/60 overflow-hidden shadow-sm flex flex-col mx-1">
        {isLoading ? (
          <FleetTableSkeleton rows={10} cols={4} />
        ) : (
          <EditableTable
            hideHeader={true}
            multiSelect={false}
            data={mappedRuns}
            searchQuery={searchTerm}
            onSearchQueryChange={setSearchTerm}
            columns={columns}
            onUpdate={handleUpdate}
            onAdd={handleAdd}
            onDelete={() => {}}
            selectedRowId={selectedRowId}
            onSelectionChange={(ids) =>
              setSelectedRowId(ids[ids.length - 1] || null)
            }
            virtualColumns={virtualColumns}
            onColumnAdd={handleColumnAdd}
            onColumnUpdate={handleColumnUpdate}
            onColumnDelete={handleColumnDelete}
          />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-6 py-2.5 bg-slate-50/50 border border-slate-200/50 rounded-2xl mx-1 mt-auto flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t("hr.payroll_active")}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <p className="text-[10px] font-medium text-slate-400">
            {t("hr.payroll_disbursement")}{" "}
            <span className="text-slate-700 font-black">{stats.totalCost}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 hover:text-indigo-600 transition-colors">
            Documentation
          </button>
          <button className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 hover:text-indigo-600 transition-colors border-l pl-3 border-slate-200">
            Support
          </button>
        </div>
      </div>
    </div>
  );
}
