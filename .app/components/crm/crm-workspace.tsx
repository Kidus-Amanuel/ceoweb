"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";
import { Button } from "@/components/shared/ui/button/Button";
import { Input } from "@/components/shared/ui/input/Input";
import { useCompanies } from "@/hooks/use-companies";
import {
  createCrmCustomFieldAction,
  createCrmRowAction,
  deleteCrmCustomFieldAction,
  deleteCrmRowAction,
  getCrmTableViewAction,
  getCrmTablesAction,
  updateCrmCustomFieldAction,
  updateCrmRowAction,
} from "@/app/api/crm/crm";
import { CrmReportsView } from "./workspace/CrmReportsView";
import { CrmWorkspaceTable } from "./workspace/CrmWorkspaceTable";
import {
  CrmDataTable,
  CrmTable,
  DEFAULT_COUNTS,
  RawRow,
  SelectOption,
  TableCounts,
  VIEW_META,
  asRecord,
  crmViewHelpers,
  mapFieldType,
  normalizeFieldOptions,
  normalizeRowForGrid,
  tableToEntity,
  toFriendlyCrmError,
} from "./workspace/crm-workspace.shared";

type CrmWorkspaceProps = {
  defaultTable?: CrmTable;
};

export function CrmWorkspace({
  defaultTable = "customers",
}: CrmWorkspaceProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialSelectedRowId = searchParams.get("rowId");
  const { selectedCompany } = useCompanies();
  const activeTable = defaultTable;
  const activeMeta = VIEW_META[activeTable];
  const ActiveIcon = activeMeta.icon;
  const companyId = selectedCompany?.id;

  const [rows, setRows] = useState<RawRow[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<
    Record<string, unknown>[]
  >([]);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [deals, setDeals] = useState<SelectOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 50;
  const [tableCounts, setTableCounts] = useState<TableCounts>(DEFAULT_COUNTS);
  const [error, setError] = useState<string | null>(null);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] =
    useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const selectedRowId = initialSelectedRowId;

  const handleWorkspaceSearchQueryChange = useCallback((value: string) => {
    setCurrentPage(1);
    setWorkspaceSearchQuery(value);
  }, []);

  const loadCounts = useCallback(async (selectedCompanyId: string) => {
    const response = await getCrmTablesAction({ companyId: selectedCompanyId });
    if (!response.success) {
      setError(
        toFriendlyCrmError(
          response.error || "Failed to load CRM table counters.",
        ),
      );
      return;
    }

    const counts = (response.data || DEFAULT_COUNTS) as Record<string, number>;
    setTableCounts({
      customers: counts.customers ?? 0,
      deals: counts.deals ?? 0,
      activities: counts.activities ?? 0,
    });
  }, []);

  const loadTableView = useCallback(
    async (
      selectedCompanyId: string,
      table: CrmDataTable,
      page: number,
      size: number,
      search?: string,
    ) => {
      const response = await getCrmTableViewAction({
        companyId: selectedCompanyId,
        table,
        page,
        pageSize: size,
        search,
      });
      if (!response.success || !response.data) {
        setError(
          toFriendlyCrmError(
            response.error || "Failed to load CRM table view.",
          ),
        );
        return;
      }

      setRows((response.data.rows as RawRow[]) || []);
      setColumnDefinitions(response.data.columnDefinitions || []);
      setTotalRows(response.data.totalRows || 0);
      setUsers(response.data.users || []);
      setCustomers(response.data.customers || []);
      setDeals(response.data.deals || []);
    },
    [],
  );

  const refresh = useCallback(
    (table: CrmTable = activeTable, page: number = currentPage) => {
      if (!companyId) return;

      setError(null);
      startTransition(async () => {
        if (table === "reports") {
          await loadCounts(companyId);
          return;
        }

        await loadTableView(
          companyId,
          table,
          page,
          pageSize,
          workspaceSearchQuery,
        );
      });
    },
    [
      activeTable,
      companyId,
      currentPage,
      loadCounts,
      loadTableView,
      pageSize,
      workspaceSearchQuery,
      startTransition,
    ],
  );

  useEffect(() => {
    if (!companyId) return;

    const timer = setTimeout(() => refresh(activeTable, currentPage), 0);
    return () => clearTimeout(timer);
  }, [activeTable, companyId, currentPage, refresh, workspaceSearchQuery]);

  const relations = useMemo(
    () => ({ users, customers, deals }),
    [users, customers, deals],
  );

  const gridData = useMemo(
    () => rows.map((row) => normalizeRowForGrid(activeTable, row)),
    [activeTable, rows],
  );
  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row] as const)),
    [rows],
  );

  const virtualColumns = useMemo<VirtualColumn[]>(
    () =>
      columnDefinitions.map((field) => {
        const rawOptions = Array.isArray(field.field_options)
          ? field.field_options
          : [];
        return {
          id: String(field.field_name ?? field.id),
          label: String(field.field_label || field.field_name),
          key: String(field.field_name),
          type: mapFieldType(String(field.field_type || "text")),
          options: rawOptions.map((option: unknown) =>
            option && typeof option === "object" && !Array.isArray(option)
              ? {
                  label:
                    String(field.field_type || "text") === "currency"
                      ? String(
                          (option as { label?: unknown }).label ??
                            (option as { value?: unknown }).value ??
                            "",
                        ).toUpperCase()
                      : String(
                          (option as { label?: unknown }).label ??
                            (option as { value?: unknown }).value ??
                            "",
                        ),
                  value:
                    String(field.field_type || "text") === "currency"
                      ? String(
                          (option as { value?: unknown }).value ??
                            (option as { label?: unknown }).label ??
                            "",
                        ).toUpperCase()
                      : String(
                          (option as { value?: unknown }).value ??
                            (option as { label?: unknown }).label ??
                            "",
                        ),
                }
              : {
                  label:
                    String(field.field_type || "text") === "currency"
                      ? String(option).toUpperCase()
                      : String(option),
                  value:
                    String(field.field_type || "text") === "currency"
                      ? String(option).toUpperCase()
                      : String(option),
                },
          ),
        };
      }),
    [columnDefinitions],
  );

  const handleAddRow = async (payload: Record<string, unknown>) => {
    if (!companyId || activeTable === "reports") return;

    const response = await createCrmRowAction({
      companyId,
      table: activeTable,
      standardData: crmViewHelpers.serializeStandardData(activeTable, payload),
      customData: asRecord(payload.customValues),
    });

    if (!response.success) {
      setError(
        toFriendlyCrmError(response.error || "Failed to create CRM row."),
      );
      return;
    }

    refresh(activeTable);
  };

  const handleUpdateRow = async (
    rowId: string,
    payload: Record<string, unknown>,
  ) => {
    if (!companyId || activeTable === "reports") return;
    const existingRow = rowsById.get(rowId);

    const nextCustomValues =
      payload.customValues !== undefined
        ? asRecord(payload.customValues)
        : asRecord(existingRow?.custom_data ?? existingRow?.custom_fields);

    const response = await updateCrmRowAction({
      companyId,
      table: activeTable,
      rowId,
      standardData: crmViewHelpers.serializeStandardData(
        activeTable,
        payload,
        existingRow,
      ),
      customData: nextCustomValues,
    });

    if (!response.success) {
      setError(
        toFriendlyCrmError(response.error || "Failed to update CRM row."),
      );
      return;
    }

    refresh(activeTable);
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!companyId || activeTable === "reports") return;

    const response = await deleteCrmRowAction({
      companyId,
      table: activeTable,
      rowId,
    });

    if (!response.success) {
      setError(
        toFriendlyCrmError(response.error || "Failed to delete CRM row."),
      );
      return;
    }

    refresh(activeTable);
  };

  const handleAddColumn = async (column: Omit<VirtualColumn, "id">) => {
    if (!companyId || activeTable === "reports") return;

    const response = await createCrmCustomFieldAction({
      companyId,
      entityType: tableToEntity(activeTable),
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType:
        column.type === "json"
          ? "text"
          : column.type === "status"
            ? "select"
            : column.type,
      fieldOptions:
        column.type === "select" ||
        column.type === "currency" ||
        column.type === "status"
          ? normalizeFieldOptions(column.type, column.options)
          : undefined,
      isRequired: false,
    });

    if (!response.success) {
      setError(
        toFriendlyCrmError(response.error || "Failed to create custom field."),
      );
      return;
    }

    if (response.data) {
      const nextField = response.data as Record<string, unknown>;
      const nextFieldName = String(
        nextField.field_name ?? nextField.id ?? column.key,
      );
      setColumnDefinitions((previous) => {
        const exists = previous.some(
          (field) =>
            String(field.field_name ?? field.id ?? "") === nextFieldName,
        );
        if (exists) return previous;
        return [...previous, nextField];
      });
    }

    refresh(activeTable);
  };

  const handleUpdateColumn = async (
    columnId: string,
    column: Omit<VirtualColumn, "id">,
  ) => {
    if (!companyId || activeTable === "reports") return;

    const response = await updateCrmCustomFieldAction({
      companyId,
      fieldId: columnId,
      entityType: tableToEntity(activeTable),
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType:
        column.type === "json"
          ? "text"
          : column.type === "status"
            ? "select"
            : column.type,
      fieldOptions:
        column.type === "select" ||
        column.type === "currency" ||
        column.type === "status"
          ? normalizeFieldOptions(column.type, column.options)
          : undefined,
      isRequired: false,
    });

    if (!response.success || !response.data) {
      setError(
        toFriendlyCrmError(response.error || "Failed to update custom field."),
      );
      return;
    }

    const nextField = response.data as Record<string, unknown>;
    setColumnDefinitions((previous) =>
      previous.map((field) =>
        String(field.id ?? field.field_name ?? "") === columnId ||
        String(field.field_name ?? "") === columnId
          ? nextField
          : field,
      ),
    );
    refresh(activeTable);
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!companyId || activeTable === "reports") return;

    const response = await deleteCrmCustomFieldAction({
      companyId,
      fieldId: columnId,
    });

    if (!response.success) {
      setError(
        toFriendlyCrmError(response.error || "Failed to delete custom field."),
      );
      return;
    }

    setColumnDefinitions((previous) =>
      previous.filter(
        (field) =>
          String(field.id ?? field.field_name ?? "") !== columnId &&
          String(field.field_name ?? "") !== columnId,
      ),
    );
    refresh(activeTable);
  };

  if (!companyId) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
                handleWorkspaceSearchQueryChange(event.target.value)
              }
              placeholder="Search workspace..."
              className="h-10 pl-9 !border-[#BEC9DD] focus-visible:!border-[#AAB9D3] focus-visible:ring-blue-200"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refresh()}
            disabled={isPending}
            className="w-full sm:w-auto justify-center gap-2 !border-[#BEC9DD] hover:!border-[#AAB9D3]"
          >
            <RefreshCw
              className={`w-4 h-4 text-emerald-500 ${isPending ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {activeTable === "reports" ? (
        <CrmReportsView tableCounts={tableCounts} />
      ) : (
        <CrmWorkspaceTable
          table={activeTable}
          gridData={gridData}
          relations={relations}
          virtualColumns={virtualColumns}
          currentPage={currentPage}
          totalRows={totalRows}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onAdd={handleAddRow}
          onUpdate={handleUpdateRow}
          onDelete={handleDeleteRow}
          onColumnAdd={handleAddColumn}
          onColumnUpdate={handleUpdateColumn}
          onColumnDelete={handleDeleteColumn}
          searchQuery={workspaceSearchQuery}
          onSearchQueryChange={handleWorkspaceSearchQueryChange}
          selectedRowId={selectedRowId}
        />
      )}
    </div>
  );
}
