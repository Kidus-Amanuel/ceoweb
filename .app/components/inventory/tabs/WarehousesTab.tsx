"use client";

import { InventoryWorkspaceTable } from "../workspace/InventoryWorkspaceTable";
import { useInventoryEntityTab } from "../workspace/useInventoryEntityTab";

type WarehousesTabProps = {
  companyId: string;
  searchQuery: string;
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
  onMutationStateChange?: (mutating: boolean) => void;
};

export default function WarehousesTab({
  companyId,
  searchQuery,
  refreshNonce = 0,
  onRefreshStateChange,
  onMutationStateChange,
}: WarehousesTabProps) {
  const { tableProps, queryError, isInitialLoading } = useInventoryEntityTab({
    companyId,
    searchQuery,
    table: "warehouses",
    tableLabel: "Warehouses",
    refreshNonce,
    onRefreshStateChange,
    onMutationStateChange,
  });

  if (isInitialLoading) {
    return <div className="h-full rounded-2xl border bg-white animate-pulse" />;
  }

  return (
    <div className="h-full min-h-0">
      {queryError ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {queryError}
        </div>
      ) : null}
      <InventoryWorkspaceTable {...tableProps} />
    </div>
  );
}
