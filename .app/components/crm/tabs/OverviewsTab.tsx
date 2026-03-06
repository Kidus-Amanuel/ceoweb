"use client";

import { useEffect } from "react";
import { useCompanies } from "@/hooks/use-companies";
import { useCrmCountsQuery } from "../workspace/queries/crm-workspace.queries";

type OverviewsTabProps = {
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
};

export function OverviewsTab({
  refreshNonce = 0,
  onRefreshStateChange,
}: OverviewsTabProps) {
  const { selectedCompany } = useCompanies();
  const countsQuery = useCrmCountsQuery(selectedCompany?.id ?? null, true);
  const { refetch } = countsQuery;
  const tableCounts = countsQuery.data;
  const error =
    countsQuery.error instanceof Error ? countsQuery.error.message : null;
  const isPending = countsQuery.isPending;

  useEffect(() => {
    if (!refreshNonce) return;
    onRefreshStateChange?.(true);
    void refetch().finally(() => onRefreshStateChange?.(false));
  }, [onRefreshStateChange, refreshNonce, refetch]);

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-[#787774]">
            Total Customers
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#37352F]">
            {isPending ? "..." : (tableCounts?.customers ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-[#787774]">
            Active Deals
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#37352F]">
            {isPending ? "..." : (tableCounts?.deals ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-[#787774]">
            Pending Activities
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#37352F]">
            {isPending ? "..." : (tableCounts?.activities ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
