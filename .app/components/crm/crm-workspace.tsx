"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
import { Input } from "@/components/shared/ui/input/Input";
import { useCompanies } from "@/hooks/use-companies";
import { VIEW_META, type CrmTable } from "./workspace/crm-workspace.shared";
import { CrmWorkspaceErrorBoundary } from "./workspace/CrmWorkspaceErrorBoundary";
import CustomersTab from "./tabs/CustomersTab";
import DealsTab from "./tabs/DealsTab";
import ActivitiesTab from "./tabs/ActivitiesTab";
import { OverviewsTab } from "./tabs/OverviewsTab";

type CrmWorkspaceProps = {
  defaultTable?: CrmTable;
};

export function CrmWorkspace({
  defaultTable = "customers",
}: CrmWorkspaceProps) {
  const searchParams = useSearchParams();
  const { selectedCompany } = useCompanies();
  const initialQuery = searchParams.get("q") ?? "";
  const [workspaceSearchQuery, setWorkspaceSearchQuery] =
    useState(initialQuery);
  const activeTable: CrmTable = defaultTable;

  if (!selectedCompany?.id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" />
        <div>
          <p className="font-semibold">No active company selected</p>
          <p className="text-sm">
            Select a company from the sidebar to load CRM data.
          </p>
        </div>
      </div>
    );
  }

  const activeMeta = VIEW_META[activeTable];
  const ActiveIcon = activeMeta.icon;

  return (
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
              onChange={(event) => setWorkspaceSearchQuery(event.target.value)}
              placeholder="Search workspace..."
              className="h-10 pl-9 !border-[#BEC9DD] focus-visible:!border-[#AAB9D3] focus-visible:ring-blue-200"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <CrmWorkspaceErrorBoundary>
          {activeTable === "customers" ? (
            <CustomersTab
              companyId={selectedCompany.id}
              searchQuery={workspaceSearchQuery}
            />
          ) : null}
          {activeTable === "deals" ? (
            <DealsTab
              companyId={selectedCompany.id}
              searchQuery={workspaceSearchQuery}
            />
          ) : null}
          {activeTable === "activities" ? (
            <ActivitiesTab
              companyId={selectedCompany.id}
              searchQuery={workspaceSearchQuery}
            />
          ) : null}
          {activeTable === "overviews" ? <OverviewsTab /> : null}
        </CrmWorkspaceErrorBoundary>
      </div>
    </div>
  );
}
