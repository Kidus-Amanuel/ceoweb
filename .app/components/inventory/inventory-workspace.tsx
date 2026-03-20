"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";
import { WorkspaceErrorBoundary } from "@/components/shared/workspace/WorkspaceErrorBoundary";
import { Button } from "@/components/shared/ui/button/Button";
import { Input } from "@/components/shared/ui/input/Input";
import { useCompanies } from "@/hooks/use-companies";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  VIEW_META,
  type InventoryTable,
} from "./workspace/inventory-workspace.shared";
import { InventoryOverviewTab } from "./tabs/InventoryOverviewTab";
import ProductsTab from "./tabs/ProductsTab";
import SuppliersTab from "./tabs/SuppliersTab";
import WarehousesTab from "./tabs/WarehousesTab";
import StockTab from "./tabs/StockTab";
import StockMovementsTab from "./tabs/StockMovementsTab";

type InventoryWorkspaceProps = {
  defaultTable?: InventoryTable;
};

export function InventoryWorkspace({
  defaultTable = "overviews",
}: InventoryWorkspaceProps) {
  const { selectedCompany } = useCompanies();
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(workspaceSearchQuery, 300);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const activeTable = defaultTable;

  if (!selectedCompany?.id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" />
        <div>
          <p className="font-semibold">No active company selected</p>
          <p className="text-sm">
            Select a company from the sidebar to load inventory data.
          </p>
        </div>
      </div>
    );
  }

  const activeMeta = VIEW_META[activeTable];
  const ActiveIcon = activeMeta.icon;

  return (
    <WorkspaceErrorBoundary featureName="Inventory">
      <div className="flex h-[calc(100dvh-145px)] lg:h-[calc(100dvh-170px)] min-h-0 min-w-0 flex-col gap-6 overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ActiveIcon className={`h-5 w-5 ${activeMeta.iconClass}`} />
              {activeMeta.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Showing data for{" "}
              <span className="font-semibold">{selectedCompany.name}</span>
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
            <div className="relative w-full sm:min-w-[280px] sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
              <Input
                value={workspaceSearchQuery}
                onChange={(event) =>
                  setWorkspaceSearchQuery(event.target.value)
                }
                placeholder="Search workspace..."
                className="h-10 pl-9 pr-9 !border-[#BEC9DD] focus-visible:!border-[#AAB9D3] focus-visible:ring-blue-200"
              />
              <Loader2
                className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground transition-opacity duration-200 ${workspaceSearchQuery !== debouncedSearchQuery ? "opacity-100" : "opacity-0"}`}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-[#BEC9DD] px-4"
              onClick={() => {
                setIsRefreshing(true);
                setRefreshNonce((value) => value + 1);
              }}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 text-emerald-500 ${isRefreshing || isMutating ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTable === "overviews" ? (
            <InventoryOverviewTab
              refreshNonce={refreshNonce}
              onRefreshStateChange={setIsRefreshing}
            />
          ) : null}
          {activeTable === "products" ? (
            <ProductsTab
              companyId={selectedCompany.id}
              searchQuery={debouncedSearchQuery}
              refreshNonce={refreshNonce}
              onRefreshStateChange={setIsRefreshing}
              onMutationStateChange={setIsMutating}
            />
          ) : null}
          {activeTable === "suppliers" ? (
            <SuppliersTab
              companyId={selectedCompany.id}
              searchQuery={debouncedSearchQuery}
              refreshNonce={refreshNonce}
              onRefreshStateChange={setIsRefreshing}
              onMutationStateChange={setIsMutating}
            />
          ) : null}
          {activeTable === "warehouses" ? (
            <WarehousesTab
              companyId={selectedCompany.id}
              searchQuery={debouncedSearchQuery}
              refreshNonce={refreshNonce}
              onRefreshStateChange={setIsRefreshing}
              onMutationStateChange={setIsMutating}
            />
          ) : null}
          {activeTable === "stock_levels" ? (
            <StockTab
              companyId={selectedCompany.id}
              searchQuery={debouncedSearchQuery}
              refreshNonce={refreshNonce}
              onRefreshStateChange={setIsRefreshing}
              onMutationStateChange={setIsMutating}
            />
          ) : null}
          {activeTable === "stock_movements" ? (
            <StockMovementsTab
              companyId={selectedCompany.id}
              searchQuery={debouncedSearchQuery}
              refreshNonce={refreshNonce}
              onRefreshStateChange={setIsRefreshing}
              onMutationStateChange={setIsMutating}
            />
          ) : null}
        </div>
      </div>
    </WorkspaceErrorBoundary>
  );
}
