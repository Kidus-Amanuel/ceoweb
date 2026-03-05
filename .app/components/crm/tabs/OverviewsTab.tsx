"use client";

import { useEffect, useState } from "react";
import { getCrmTablesAction } from "@/app/api/crm/crm";
import { useCompanies } from "@/hooks/use-companies";
import {
  DEFAULT_COUNTS,
  toFriendlyCrmError,
  type TableCounts,
} from "../workspace/crm-workspace.shared";

export function OverviewsTab() {
  const { selectedCompany } = useCompanies();
  const [tableCounts, setTableCounts] = useState<TableCounts>(DEFAULT_COUNTS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const companyId = selectedCompany?.id;
    if (!companyId) return;
    let disposed = false;

    const run = async () => {
      setIsPending(true);
      setError(null);
      try {
        const response = await getCrmTablesAction({ companyId });
        if (!response.success || !response.data) {
          setError(
            toFriendlyCrmError(
              response.error || "Failed to load CRM overviews.",
            ),
          );
          return;
        }
        if (disposed) return;
        setTableCounts({
          customers: response.data.customers ?? 0,
          deals: response.data.deals ?? 0,
          activities: response.data.activities ?? 0,
        });
      } catch (loadError) {
        if (disposed) return;
        setError(
          toFriendlyCrmError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load CRM overviews.",
          ),
        );
      } finally {
        if (!disposed) setIsPending(false);
      }
    };

    void run();
    return () => {
      disposed = true;
    };
  }, [selectedCompany?.id]);

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
            {isPending ? "..." : tableCounts.customers}
          </p>
        </div>
        <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-[#787774]">
            Active Deals
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#37352F]">
            {isPending ? "..." : tableCounts.deals}
          </p>
        </div>
        <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-[#787774]">
            Pending Activities
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#37352F]">
            {isPending ? "..." : tableCounts.activities}
          </p>
        </div>
      </div>
    </div>
  );
}
