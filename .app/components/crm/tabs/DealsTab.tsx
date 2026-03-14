"use client";

import { CrmWorkspaceTable } from "@/components/crm/workspace/CrmWorkspaceTable";
import { useCrmEntityTab } from "@/components/crm/workspace/useCrmEntityTab";
import TabSkeleton from "./TabSkeleton";

type DealsTabProps = {
  companyId: string;
  searchQuery: string;
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
  onMutationStateChange?: (mutating: boolean) => void;
};

const TABLE = "deals" as const;

export default function DealsTab({
  companyId,
  searchQuery,
  refreshNonce = 0,
  onRefreshStateChange,
  onMutationStateChange,
}: DealsTabProps) {
  const { tableProps, queryError, isInitialLoading } = useCrmEntityTab({
    companyId,
    searchQuery,
    table: TABLE,
    tableLabel: "Deals",
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
