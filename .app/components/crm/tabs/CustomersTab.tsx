"use client";

import { CrmWorkspaceTable } from "@/components/crm/workspace/CrmWorkspaceTable";
import { useCrmEntityTab } from "@/components/crm/workspace/useCrmEntityTab";
import TabSkeleton from "./TabSkeleton";

type CustomersTabProps = {
  companyId: string;
  searchQuery: string;
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
  onMutationStateChange?: (mutating: boolean) => void;
};

const TABLE = "customers" as const;

export default function CustomersTab({
  companyId,
  searchQuery,
  refreshNonce = 0,
  onRefreshStateChange,
  onMutationStateChange,
}: CustomersTabProps) {
  const { tableProps, queryError, isInitialLoading } = useCrmEntityTab({
    companyId,
    searchQuery,
    table: TABLE,
    tableLabel: "Customers",
    refreshNonce,
    onRefreshStateChange,
    onMutationStateChange,
  });

  if (isInitialLoading) return <TabSkeleton rows={8} />;

  return (
    <div className="h-full min-h-0">
      {queryError ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {queryError}
        </div>
      ) : null}
      <CrmWorkspaceTable {...tableProps} />
    </div>
  );
}
