"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompanies } from "@/hooks/use-companies";
import { getInventoryOverviewAction } from "@/app/api/inventory/inventory";

type InventoryOverviewTabProps = {
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
};

const CARD_CLASS = "rounded-xl border border-[#E9E9E7] bg-white p-5";

const toCurrency = (value: unknown) => {
  const amount = Number(value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(safe);
};

export function InventoryOverviewTab({
  refreshNonce = 0,
  onRefreshStateChange,
}: InventoryOverviewTabProps) {
  const { selectedCompany } = useCompanies();
  const companyId = selectedCompany?.id ?? null;

  const overviewQuery = useQuery({
    queryKey: ["inventory", "overview", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const response = await getInventoryOverviewAction({ companyId });
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to load inventory overview.");
      }
      return response.data;
    },
  });

  useEffect(() => {
    if (!refreshNonce) return;
    onRefreshStateChange?.(true);
    void overviewQuery.refetch().finally(() => onRefreshStateChange?.(false));
  }, [overviewQuery, onRefreshStateChange, refreshNonce]);

  const recentMovements = useMemo(
    () => overviewQuery.data?.recentStockMovements ?? [],
    [overviewQuery.data?.recentStockMovements],
  );

  const kpis = [
    {
      label: "Total Inventory Value",
      value: toCurrency(overviewQuery.data?.totalInventoryValue ?? 0),
      tone: "text-emerald-600",
    },
    {
      label: "Low Stock Alerts",
      value: String(overviewQuery.data?.lowStockAlertCount ?? 0),
      tone: "text-red-600",
    },
    {
      label: "Active Suppliers",
      value: String(overviewQuery.data?.totalActiveSuppliers ?? 0),
      tone: "text-sky-600",
    },
    {
      label: "Recent Movements",
      value: String(recentMovements.length),
      tone: "text-violet-600",
    },
  ];

  const error =
    (overviewQuery.error instanceof Error && overviewQuery.error.message) ||
    null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-6 overflow-y-auto pr-1">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={CARD_CLASS}>
            <p className="text-xs uppercase tracking-widest text-[#787774]">
              {kpi.label}
            </p>
            <p className={`mt-3 text-3xl font-bold ${kpi.tone}`}>
              {overviewQuery.isPending ? "..." : kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className={`${CARD_CLASS} flex min-h-0 flex-col`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#787774]">
              Recent Stock Movements
            </h3>
            <p className="mt-1 text-sm text-[#6B7280]">
              Latest inventory activity across products and warehouses.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#ECECE8] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-[#787774]">
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Warehouse</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Change</th>
                <th className="px-3 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1EE]">
              {recentMovements.map((row, index) => {
                const product =
                  typeof row.product === "object" && row.product !== null
                    ? (row.product as { name?: unknown }).name
                    : null;
                const warehouse =
                  typeof row.warehouse === "object" && row.warehouse !== null
                    ? (row.warehouse as { name?: unknown }).name
                    : null;
                const movementDate = new Date(
                  String(
                    row.movement_date ?? row.created_at ?? row.updated_at ?? "",
                  ),
                );
                const quantity = Number(row.quantity_change ?? 0);
                const tone = quantity >= 0 ? "text-emerald-600" : "text-red-600";
                return (
                  <tr key={String(row.id ?? index)} className="text-[#37352F]">
                    <td className="px-3 py-3 font-medium">
                      {String(product ?? "Unnamed Product")}
                    </td>
                    <td className="px-3 py-3">
                      {String(warehouse ?? "Unnamed Warehouse")}
                    </td>
                    <td className="px-3 py-3 capitalize">
                      {String(row.movement_type ?? "adjustment").replace(/_/g, " ")}
                    </td>
                    <td className={`px-3 py-3 font-semibold ${tone}`}>
                      {quantity > 0 ? `+${quantity}` : `${quantity}`}
                    </td>
                    <td className="px-3 py-3 text-[#6B7280]">
                      {Number.isNaN(movementDate.getTime())
                        ? "Unknown"
                        : movementDate.toLocaleString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </td>
                  </tr>
                );
              })}
              {!overviewQuery.isPending && recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-[#787774]">
                    No stock movements found yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
