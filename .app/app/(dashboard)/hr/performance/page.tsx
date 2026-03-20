"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCompanies } from "@/hooks/use-companies";
import { toast } from "@/hooks/use-toast";
import { EditableTable } from "@/components/shared/table/EditableTable";
import { useEmployees } from "@/hooks/use-hr";
import {
  TrendingUp,
  Search,
  Star,
  Settings2,
  FileText,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Badge } from "@/components/shared/ui/badge/Badge";
import { Input } from "@/components/shared/ui/input/Input";
import { motion, AnimatePresence } from "framer-motion";
import { type ColumnFieldType } from "@/components/shared/table/CustomColumnEditorContent";
import { FleetTableSkeleton } from "@/components/shared/ui/skeleton/FleetTableSkeleton";

export default function PerformancePage() {
  const { t } = useTranslation();
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id;
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // 1. Data Fetching
  const { data: employeesRes } = useEmployees(companyId);
  const employees = useMemo(() => employeesRes?.data || [], [employeesRes]);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["performance_reviews", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .select(`*, employee:employees!employee_id(first_name, last_name, employee_code)`)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const selectedReview = useMemo(
    () => reviews.find((r) => r.id === selectedRowId),
    [reviews, selectedRowId],
  );

  // 2. Mutations
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(t("hr.toast_performance_add"));
      queryClient.invalidateQueries({ queryKey: ["performance_reviews", companyId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to add review"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("performance_reviews")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(t("hr.toast_performance_update"));
      queryClient.invalidateQueries({ queryKey: ["performance_reviews", companyId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update review"),
  });

  // 3. Columns
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
        header: t("hr.col_review_period"),
        accessorKey: "review_period",
        meta: { type: "text" as ColumnFieldType },
      },
      {
        header: t("hr.col_rating"),
        accessorKey: "rating",
        meta: {
          type: "select" as ColumnFieldType,
          options: [
            { label: "1 - Poor", value: "1" },
            { label: "2 - Fair", value: "2" },
            { label: "3 - Good", value: "3" },
            { label: "4 - Very Good", value: "4" },
            { label: "5 - Excellent", value: "5" },
          ],
        },
        cell: ({ row }: any) => {
          const ratingStr = row.original.rating || "0";
          const ratingNum = parseInt(ratingStr, 10) || 0;
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i <= ratingNum ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                {ratingNum}/5 Score
              </span>
            </div>
          );
        },
      },
      {
        header: t("hr.col_reviewer"),
        accessorKey: "reviewer_id",
        meta: {
          type: "select" as ColumnFieldType,
          options: employees.map((e: any) => ({
            label: `${e.first_name} ${e.last_name}`,
            value: e.user_id || e.id,
          })),
        },
        cell: ({ row }: any) => (
          <span className="text-xs font-medium text-slate-700">
            {row.original.reviewer_id ? (employees.find((e: any) => e.user_id === row.original.reviewer_id || e.id === row.original.reviewer_id)?.first_name || "Manager") : "Manager"}
          </span>
        ),
      },
      {
        header: t("hr.col_notes"),
        accessorKey: "notes",
        meta: { type: "text" as ColumnFieldType },
        cell: ({ row }: any) => (
          <span className="text-xs text-slate-500 truncate max-w-[150px] inline-block">
            {row.original.notes || "-"}
          </span>
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
            { label: t("hr.status_completed"), value: "completed" },
          ],
        },
        cell: ({ row }: any) => {
          const status = row.original.status || "draft";
          const variants: Record<string, string> = {
            draft: "bg-slate-50 text-slate-700 border-slate-100",
            reviewing: "bg-amber-50 text-amber-700 border-amber-100",
            completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
          };
          return (
            <Badge
              variant="outline"
              className={`capitalize text-[9px] font-black tracking-widest ${variants[status] || ""}`}
            >
              {t(`hr.status_${status}`)}
            </Badge>
          );
        },
      },
    ],
    [t, employees],
  );

  const handleUpdate = async (id: string, updates: any) => {
    try {
      if (updates.rating) updates.rating = String(updates.rating);
      if (updates.rating && updates.rating.includes(" - ")) updates.rating = updates.rating.split(" - ")[0];
      await updateMutation.mutateAsync({ id, updates });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async (newItem: any) => {
    try {
      const payload = {
        company_id: companyId,
        employee_id: newItem.employee_id,
        review_period: newItem.review_period || "Q1 2026",
        rating: newItem.rating ? (String(newItem.rating).includes(" - ") ? String(newItem.rating).split(" - ")[0] : String(newItem.rating)) : "3",
        reviewer_id: newItem.reviewer_id,
        notes: newItem.notes,
        status: newItem.status || "draft",
      };
      await addMutation.mutateAsync(payload);
    } catch (err) {
      console.error(err);
    }
  };

  if (!companyId) return null;

  return (
    <div className="h-full flex flex-col space-y-4 pb-6 overflow-hidden">
      {/* ── Header ── */}
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
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black font-display text-slate-900 leading-none mb-1.5 uppercase tracking-tighter">
                    {t("hr.performance_title")}
                  </h1>
                  <p className="text-[10px] text-slate-500 font-bold tracking-wide">
                    {t("hr.performance_subtitle")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative group flex-1 lg:w-[280px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                  <Input
                    placeholder="Search reviews..."
                    className="pl-10 h-10 bg-slate-50/50 border-slate-200 rounded-xl font-bold text-[11px] uppercase tracking-wider focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <Button
                  size="sm"
                  className="h-10 px-6 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] tracking-widest uppercase shadow-xl shadow-indigo-600/20"
                  onClick={() =>
                    (
                      document.querySelector(
                        '[aria-label="New Record"]',
                      ) as HTMLButtonElement
                    )?.click()
                  }
                >
                  <Plus className="w-3.5 h-3.5" /> {t("hr.add_review")}
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
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 leading-none mb-1">
                    {selectedReview?.employee?.first_name} {selectedReview?.employee?.last_name}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-indigo-600 font-black tracking-[0.1em] uppercase bg-indigo-100/50 px-2 py-0.5 rounded-md">
                      {selectedReview?.status || "Draft"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Period: {selectedReview?.review_period}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                className="h-10 w-10 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-xl"
                onClick={() => setSelectedRowId(null)}
              >
                <X className="w-5 h-5" />
              </Button>
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
            data={reviews.map(r => ({ ...r, customValues: {} }))}
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
          />
        )}
      </div>
    </div>
  );
}
