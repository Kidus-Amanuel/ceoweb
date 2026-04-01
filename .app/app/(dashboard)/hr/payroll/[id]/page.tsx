"use client";

import { useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Receipt, 
  ArrowLeft, 
  RefreshCw, 
  ArrowDownToLine,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Search,
  Lock
} from "lucide-react";

import { useCompanies } from "@/hooks/use-companies";
import { 
  usePayrollRuns, 
  usePayslips
} from "@/hooks/use-hr";
import { useHRRealtime } from "@/hooks/use-hr-realtime";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import { toast } from "@/hooks/use-toast";
import { type ColumnFieldType } from "@/components/shared/table/CustomColumnEditorContent";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";
import { useUpdatePayrollRun } from "@/hooks/use-hr";

export default function PayrollDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;

  // 1. Live Sync & Data Fetching
  useHRRealtime(companyId, ["payroll_runs", "payslips"]);
  const { data: runs = [], isLoading: loadingRuns } = usePayrollRuns(companyId);
  const selectedRun = useMemo(() => runs.find(r => r.id === id), [runs, id]);
  const { data: payslips = [], isLoading: loadingPayslips } = usePayslips(companyId, id as string);

  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleSelectionChange = useCallback(() => {}, []);
  const handleUpdate = useCallback(() => {}, []);

  const { mutateAsync: updateRun } = useUpdatePayrollRun(companyId, {
    onSuccess: () => toast.success("Payroll finalized successfully."),
    onError: (err: any) => toast.error(`Error finalizing: ${err.message}`)
  });

  const handleFinalize = async () => {
     if (!id || !selectedRun) return;
     setIsProcessing(true);
     try {
       await updateRun({
         id: id as string,
         status: "completed",
       });
       window.location.reload();
     } catch (err) {
       console.error("[PayrollDetail] Finalize Error:", err);
     } finally {
       setIsProcessing(false);
     }
  };

  const handleExportLedger = () => {
    if (!payslips || payslips.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const headers = ["Employee", "Employee ID", "Worked Hours", "Basic Pay", "Net Pay", "Status"];
    const rows = payslips.map((p: any) => [
      `${p.employee?.first_name} ${p.employee?.last_name}`,
      p.employee?.employee_code || "---",
      p.breakdown?.calculated_hours || 0,
      p.basic_pay || 0,
      p.net_pay || 0,
      p.status || "draft",
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_ledger_${id}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger exported successfully");
  };

  const handleExecuteBatch = async () => {
    if (!id) return;
    setIsProcessing(true);
    toast.info(`${t("hr.status_processing")} batch...`);
    try {
      const res = await fetch(`/api/hr/payroll-generate?run_id=${id}`, {
        method: "POST",
      }).then((r) => r.json());

      if (res.error) throw new Error(res.error);

      toast.success(
        `Success: ${res.count} payslips generated for $${res.totalCost.toLocaleString()}`
      );
      
      // Refresh window since stats changed
      window.location.reload(); 
    } catch (err: any) {
      toast.error(`Processing error: ${err.message}`);
      console.error("[PayrollDetail] Execution Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: t("hr.col_employee"),
        accessorKey: "employee_name",
        meta: { readOnly: true },
        cell: ({ row }: any) => {
          const emp = row.original.employee;
          return (
            <div className="flex items-center gap-4 group">
              <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 text-xs font-black text-slate-500 uppercase group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                {emp?.first_name?.[0]}{emp?.last_name?.[0]}
              </div>
              <div className="flex flex-col">
                <span className="font-black text-slate-900 text-sm leading-none">{emp?.first_name} {emp?.last_name}</span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1.5 flex items-center gap-1.5">
                   <span className="w-4 h-px bg-slate-100" /> ID: {emp?.employee_code || "---"}
                </span>
              </div>
            </div>
          );
        }
      },
      {
        header: "Basic Pay",
        accessorKey: "basic_pay",
        meta: { readOnly: true },
        cell: ({ row }: any) => (
          <div className="flex flex-col">
             <span className="font-bold text-slate-700 text-xs">${(row.original.basic_pay || 0).toLocaleString()}</span>
             <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Calculated Base</span>
          </div>
        )
      },
      {
        header: "Worked Hours",
        accessorKey: "breakdown",
        meta: { readOnly: true },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2 group">
             <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 transition-colors">
                <RefreshCw className="w-3 h-3 text-indigo-600 group-hover:text-white" />
             </div>
             <div className="flex flex-col">
                <span className="font-black text-slate-900 text-sm leading-none tabular-nums">
                   {(row.original.breakdown?.calculated_hours || 0).toFixed(1)} <span className="text-[10px] text-slate-400 font-bold ml-0.5">HRS</span>
                </span>
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-[0.1em] mt-1">Verified Productivity</span>
             </div>
          </div>
        )
      },
      {
        header: t("hr.col_net_pay"),
        accessorKey: "net_pay",
        meta: { type: "currency" as ColumnFieldType, readOnly: true },
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="font-black text-slate-900 tabular-nums text-base">
              ${(row.original.net_pay || 0).toLocaleString()}
            </span>
          </div>
        )
      },
      {
        header: t("hr.col_status"),
        accessorKey: "status",
        meta: { 
          type: "select" as ColumnFieldType,
          readOnly: true,
          options: [
            { label: "Draft", value: "draft" },
            { label: "Approved", value: "approved" },
            { label: "Paid", value: "paid" }
          ]
        },
        cell: ({ row }: any) => {
          const status = row.original.status || "draft";
          return (
            <Badge className={`rounded-full px-3 py-1 text-[9px] font-black tracking-widest uppercase border-none shadow-sm ${
              status === "paid" ? "bg-emerald-100 text-emerald-700" :
              status === "approved" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
            }`}>
               {status}
            </Badge>
          );
        }
      }
    ], [t]
  );

  if (!companyId) return null;

  return (
    <div className="h-full flex flex-col space-y-5 pb-6 overflow-hidden bg-slate-50/20">
      {/* ── Drill-Down Header ── */}
      <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden flex-shrink-0 mx-1">
         <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-6">
               <Button 
                  variant="ghost"
                  onClick={() => router.push("/hr/payroll")}
                  className="w-11 h-11 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center transition-all group p-0"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />
               </Button>
               <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                      {selectedRun?.period_start ? new Date(selectedRun.period_start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : "Batch Details"}
                    </h1>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span className="text-slate-400 font-black text-xs uppercase tracking-widest">Disbursement Ledger</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <Badge variant="outline" className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-0.5 border-indigo-100 uppercase tracking-widest">
                        {selectedRun?.status || "Draft"}
                     </Badge>
                     <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                       Period: {selectedRun?.period_start} <ArrowRight className="inline w-3 h-3 mx-1" /> {selectedRun?.period_end}
                     </p>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex flex-col items-end pr-4 text-right">
                   <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Batch Total Cost</span>
                   <div className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                      ${(selectedRun?.total_cost || 0).toLocaleString()}
                   </div>
                </div>
                <div className="h-10 w-px bg-slate-100 mx-2" />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessing || selectedRun?.status === "completed"}
                  className="h-11 px-6 rounded-2xl gap-2 border-indigo-200 text-indigo-600 font-black text-[10px] tracking-widest uppercase hover:bg-indigo-50"
                  onClick={handleFinalize}
                >
                  <Lock className="w-4 h-4" /> Finalize Payroll
                </Button>
                <Button
                  size="sm"
                  disabled={isProcessing || selectedRun?.status === "completed"}
                  className="h-11 px-8 rounded-2xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] tracking-widest uppercase shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                  onClick={handleExecuteBatch}
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} /> 
                  {isProcessing ? t("hr.status_processing") : t("hr.execute_batch")}
                </Button>
            </div>
         </div>

         {/* ── Quick Statistics ── */}
         <div className="px-6 py-4 bg-slate-50/40 grid grid-cols-4 gap-6">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center gap-4">
               <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-indigo-600" />
               </div>
               <div className="flex flex-col">
                  <span className="text-xl font-black text-slate-900 leading-none">{payslips.length}</span>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Generated Slips</span>
               </div>
            </div>
            <div className="bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center gap-4">
               <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
               </div>
               <div className="flex flex-col">
                  <span className="text-xl font-black text-slate-900 leading-none">${(selectedRun?.total_cost || 0).toLocaleString()}</span>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Total Payload</span>
               </div>
            </div>
            <div className="bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center gap-4 col-span-2">
               <Search className="w-5 h-5 text-slate-300 ml-2" />
               <Input 
                  placeholder="Filter detailed ledger..."
                  className="bg-transparent border-none outline-none shadow-none focus:ring-0 flex-1 text-xs font-black text-slate-600 uppercase tracking-widest placeholder:text-slate-300 h-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
         </div>
      </div>

      {/* ── Detailed Ledger Table ── */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-200/60 overflow-hidden shadow-sm flex flex-col mx-1">
         <div className="flex-1 overflow-hidden p-1">
            {loadingPayslips ? (
              <FleetTableSkeleton rows={10} cols={5} />
            ) : (
              <EditableTable
                 hideHeader={true}
                 data={payslips}
                 columns={columns}
                 multiSelect={false}
                 searchQuery={searchTerm}
                 onSelectionChange={handleSelectionChange}
                 onUpdate={handleUpdate}
                 enableSelection={false}
              />
            )}
         </div>
      </div>

      {/* ── Detail Footer ── */}
      <div className="px-6 py-3 bg-white border border-slate-200/50 rounded-2xl mx-1 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ledger Safe Verified</span>
            </div>
            <div className="h-4 w-px bg-slate-100" />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last updated just now by System Automator</p>
         </div>
         <div className="flex items-center gap-3">
             <Button 
                variant="outline" 
                size="sm" 
                className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest border-slate-200 gap-2"
                onClick={handleExportLedger}
              >
                <ArrowDownToLine className="w-3 h-3" /> Export Ledger
             </Button>
         </div>
      </div>
    </div>
  );
}
