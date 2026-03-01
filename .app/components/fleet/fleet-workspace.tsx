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
  createFleetCustomFieldAction,
  createFleetRowAction,
  deleteFleetCustomFieldAction,
  deleteFleetRowAction,
  getFleetTableViewAction,
  updateFleetCustomFieldAction,
  updateFleetRowAction,
} from "@/app/api/fleet/fleet";
import { FleetWorkspaceTable } from "./workspace/FleetWorkspaceTable";
import {
  FleetDataTable,
  RawRow,
  SelectOption,
  VIEW_META,
  asRecord,
  fleetViewHelpers,
  mapFieldType,
  normalizeFieldOptions,
  normalizeRowForGrid,
  tableToEntity,
} from "./workspace/fleet-workspace.shared";

type FleetWorkspaceProps = {
  defaultTable?: FleetDataTable;
};

export function FleetWorkspace({
  defaultTable = "vehicles",
}: FleetWorkspaceProps) {
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
  const [drivers, setDrivers] = useState<SelectOption[]>([]);
  const [vehicles, setVehicles] = useState<SelectOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<SelectOption[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 50;
  const [error, setError] = useState<string | null>(null);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] =
    useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const selectedRowId = initialSelectedRowId;

  const handleWorkspaceSearchQueryChange = useCallback((value: string) => {
    setCurrentPage(1);
    setWorkspaceSearchQuery(value);
  }, []);

  const loadTableView = useCallback(
    async (
      selectedCompanyId: string,
      table: FleetDataTable,
      page: number,
      size: number,
      search?: string,
    ) => {
      const response = await getFleetTableViewAction({
        companyId: selectedCompanyId,
        table,
        page,
        pageSize: size,
        search,
      });
      if (!response.success || !response.data) {
        setError(response.error || "Failed to load Fleet table view.");
        return;
      }

      setRows((response.data.rows as RawRow[]) || []);
      setColumnDefinitions(response.data.columnDefinitions || []);
      setTotalRows(response.data.totalRows || 0);

      // Note: In a real implementation, we would also fetch relations here
      // For now, we'll focus on the core table functionality
    },
    [],
  );

  const refresh = useCallback(
    (table: FleetDataTable = activeTable, page: number = currentPage) => {
      if (!companyId) return;

      setError(null);
      startTransition(async () => {
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
    () => ({ drivers, vehicles, vehicleTypes }),
    [drivers, vehicles, vehicleTypes],
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
          id: String(field.id || field.field_name),
          label: String(field.field_label || field.field_name),
          key: String(field.field_name),
          type: mapFieldType(String(field.field_type || "text")),
          options: rawOptions.map((option: any) => ({
            label: String(option.label || option.value || option),
            value: String(option.value || option.label || option),
          })),
        };
      }),
    [columnDefinitions],
  );

  const handleAddRow = async (payload: Record<string, unknown>) => {
    if (!companyId) return;

    const response = await createFleetRowAction({
      companyId,
      table: activeTable,
      standardData: fleetViewHelpers.serializeStandardData(
        activeTable,
        payload,
      ),
      customData: asRecord(payload.customValues),
    });

    if (!response.success) {
      setError(response.error || "Failed to create row.");
      return;
    }

    refresh(activeTable);
  };

  const handleUpdateRow = async (
    rowId: string,
    payload: Record<string, unknown>,
  ) => {
    if (!companyId) return;
    const existingRow = rowsById.get(rowId);

    const nextCustomValues =
      payload.customValues !== undefined
        ? asRecord(payload.customValues)
        : asRecord(existingRow?.custom_fields);

    const response = await updateFleetRowAction({
      companyId,
      table: activeTable,
      rowId,
      standardData: fleetViewHelpers.serializeStandardData(
        activeTable,
        payload,
      ),
      customData: nextCustomValues,
    });

    if (!response.success) {
      setError(response.error || "Failed to update row.");
      return;
    }

    refresh(activeTable);
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!companyId) return;

    const response = await deleteFleetRowAction({
      companyId,
      table: activeTable,
      rowId,
    });

    if (!response.success) {
      setError(response.error || "Failed to delete row.");
      return;
    }

    refresh(activeTable);
  };

  const handleAddColumn = async (column: Omit<VirtualColumn, "id">) => {
    if (!companyId) return;

    const response = await createFleetCustomFieldAction({
      companyId,
      entityType: tableToEntity(activeTable),
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType: column.type === "currency" ? "currency" : (column.type as any),
      fieldOptions:
        column.type === "select" || column.type === "currency"
          ? normalizeFieldOptions(column.type, column.options)
          : undefined,
      isRequired: false,
    });

    if (!response.success) {
      setError(response.error || "Failed to create custom field.");
      return;
    }

    refresh(activeTable);
  };

  const handleUpdateColumn = async (
    columnId: string,
    column: Omit<VirtualColumn, "id">,
  ) => {
    if (!companyId) return;

    const response = await updateFleetCustomFieldAction({
      companyId,
      fieldId: columnId,
      entityType: tableToEntity(activeTable),
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType: column.type === "currency" ? "currency" : (column.type as any),
      fieldOptions:
        column.type === "select" || column.type === "currency"
          ? normalizeFieldOptions(column.type, column.options)
          : undefined,
      isRequired: false,
    });

    if (!response.success) {
      setError(response.error || "Failed to update custom field.");
      return;
    }

    refresh(activeTable);
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!companyId) return;

    const response = await deleteFleetCustomFieldAction({
      companyId,
      fieldId: columnId,
    });

    if (!response.success) {
      setError(response.error || "Failed to delete custom field.");
      return;
    }

    refresh(activeTable);
  };

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" />
        <div>
          <p className="font-semibold">No active company selected</p>
          <p className="text-sm">
            Select a company from the sidebar to load Fleet data.
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

      <FleetWorkspaceTable
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
    </div>
  );
}
