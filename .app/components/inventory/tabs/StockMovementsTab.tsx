"use client";

import { InventoryWorkspaceTable } from "../workspace/InventoryWorkspaceTable";
import { useInventoryEntityTab } from "../workspace/useInventoryEntityTab";
import type { InventoryWorkspaceTableProps } from "../workspace/InventoryWorkspaceTable";

type StockMovementsTabProps = {
  companyId: string;
  searchQuery: string;
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
  onMutationStateChange?: (mutating: boolean) => void;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export default function StockMovementsTab({
  companyId,
  searchQuery,
  refreshNonce = 0,
  onRefreshStateChange,
  onMutationStateChange,
}: StockMovementsTabProps) {
  const { tableProps, queryError, isInitialLoading } = useInventoryEntityTab({
    companyId,
    searchQuery,
    table: "stock_movements",
    tableLabel: "Stock History",
    refreshNonce,
    onRefreshStateChange,
    onMutationStateChange,
  });

  if (isInitialLoading) {
    return <div className="h-full rounded-2xl border bg-white animate-pulse" />;
  }

  const readOnlyProps: InventoryWorkspaceTableProps = {
    ...tableProps,
    onAdd: undefined,
    onUpdate: undefined,
    gridData: tableProps.gridData.map((row) => {
      const record = asRecord(row);
      const product = asRecord(record.product);
      const warehouse = asRecord(record.warehouse);
      const movementDate =
        record.updated_at ?? record.created_at ?? record.movement_date ?? null;
      return {
        ...record,
        product_name: product.name ?? record.product_name ?? "Unnamed Product",
        warehouse_name:
          warehouse.name ?? record.warehouse_name ?? "Unnamed Warehouse",
        movement_type: record.movement_type ?? "adjustment",
        quantity_change: record.quantity_change ?? record.quantity ?? 0,
        movement_date: movementDate,
      };
    }),
    onColumnAdd: undefined,
    onColumnUpdate: undefined,
    onColumnDelete: undefined,
  };

  return (
    <div className="h-full min-h-0">
      {queryError ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {queryError}
        </div>
      ) : null}
      <InventoryWorkspaceTable {...readOnlyProps} />
    </div>
  );
}
