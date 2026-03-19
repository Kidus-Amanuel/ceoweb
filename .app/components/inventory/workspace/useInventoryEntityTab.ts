"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";
import { useSearchParams } from "next/navigation";
import { useWorkspaceManager } from "@/hooks/use-workspace-manager";
import { type TableFieldType } from "@/utils/table-helpers";
import {
  asRecord,
  inventoryViewHelpers,
  mapFieldType,
  normalizeFieldOptions,
  normalizeRowForGrid,
  toFriendlyInventoryError,
  type InventoryDataTable,
  type InventoryRelationalSets,
} from "./inventory-workspace.shared";
import type { InventoryWorkspaceTableProps } from "./InventoryWorkspaceTable";
import {
  createInventoryCustomFieldAction,
  createInventoryRowAction,
  deleteInventoryCustomFieldAction,
  deleteInventoryRowAction,
  updateInventoryCustomFieldAction,
  updateInventoryRowAction,
} from "./queries/inventory-workspace.query-actions";
import {
  getInventoryFiltersHash,
  inventoryKeys,
  normalizeInventoryWorkspaceFilters,
  useInventoryColumnsQuery,
  useInventoryRelationsQueries,
  useInventoryRowsQuery,
} from "./queries/inventory-workspace.queries";

type InventoryEntityTabConfig = {
  companyId: string;
  searchQuery: string;
  table: InventoryDataTable;
  tableLabel: string;
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
  onMutationStateChange?: (mutating: boolean) => void;
};

const toStandardData = (payload: Record<string, unknown>) => {
  const { customValues, ...standard } = payload;
  return standard;
};

const toVirtualColumns = (fields: Record<string, unknown>[]): VirtualColumn[] =>
  fields.map((field) => {
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
              label: String(
                (option as { label?: unknown }).label ??
                  (option as { value?: unknown }).value ??
                  "",
              ),
              value: String(
                (option as { value?: unknown }).value ??
                  (option as { label?: unknown }).label ??
                  "",
              ),
            }
          : { label: String(option), value: String(option) },
      ),
    };
  });

export function useInventoryEntityTab({
  companyId,
  searchQuery,
  table,
  tableLabel,
  refreshNonce = 0,
  onRefreshStateChange,
  onMutationStateChange,
}: InventoryEntityTabConfig) {
  const searchParams = useSearchParams();
  const selectedRowId = searchParams.get("rowId");
  const [pageState, setPageState] = useState({ page: 1, search: "" });
  const lastRefreshNonceRef = useRef(0);
  const pageSize = 50;

  const normalizedSearch = useMemo(
    () => normalizeInventoryWorkspaceFilters({ search: searchQuery }).search,
    [searchQuery],
  );
  const filtersHash = useMemo(
    () => getInventoryFiltersHash({ search: normalizedSearch }),
    [normalizedSearch],
  );
  const currentPage =
    pageState.search === normalizedSearch ? pageState.page : 1;

  const rowsRootParams = useMemo(
    () => ({
      companyId,
      table,
      pageSize,
      search: normalizedSearch,
      filtersHash,
    }),
    [companyId, filtersHash, normalizedSearch, pageSize, table],
  );
  const rowsParams = useMemo(
    () => ({
      ...rowsRootParams,
      page: currentPage,
    }),
    [currentPage, rowsRootParams],
  );
  const rowsQuery = useInventoryRowsQuery(rowsParams);
  const columnsQuery = useInventoryColumnsQuery({ companyId, table });
  const relationsQuery = useInventoryRelationsQueries({ companyId, table });

  useEffect(() => {
    if (!refreshNonce) return;
    if (lastRefreshNonceRef.current === refreshNonce) return;
    lastRefreshNonceRef.current = refreshNonce;
    onRefreshStateChange?.(true);
    void Promise.all([
      rowsQuery.refetch(),
      columnsQuery.refetch(),
      relationsQuery.refetchAll(),
    ]).finally(() => onRefreshStateChange?.(false));
  }, [
    columnsQuery,
    onRefreshStateChange,
    refreshNonce,
    relationsQuery,
    rowsQuery,
  ]);

  const rows = useMemo(() => rowsQuery.data?.rows ?? [], [rowsQuery.data]);
  const totalRows = rowsQuery.data?.totalRows ?? 0;
  const columnDefinitions = useMemo(
    () => columnsQuery.data ?? [],
    [columnsQuery.data],
  );
  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row] as const)),
    [rows],
  );
  const relations = useMemo<InventoryRelationalSets>(
    () => ({
      products: relationsQuery.products,
      warehouses: relationsQuery.warehouses,
    }),
    [relationsQuery.products, relationsQuery.warehouses],
  );

  const standardTypeByKey = useMemo(() => {
    const map = new Map<string, TableFieldType>();
    inventoryViewHelpers
      .getStandardColumns(table, relations)
      .forEach((column) => {
        const key = String(
          (column as { accessorKey?: unknown }).accessorKey ??
            (column as { id?: unknown }).id ??
            "",
        );
        if (!key) return;
        const meta = (column as { meta?: { type?: TableFieldType } }).meta;
        map.set(key, meta?.type ?? "text");
      });
    return map;
  }, [relations, table]);

  const virtualColumns = useMemo(
    () => toVirtualColumns(columnDefinitions),
    [columnDefinitions],
  );
  const customTypeByKey = useMemo(
    () =>
      new Map(
        virtualColumns.map(
          (column) => [column.key, column.type as TableFieldType] as const,
        ),
      ),
    [virtualColumns],
  );
  const gridData = useMemo(
    () => rows.map((row) => normalizeRowForGrid(row)),
    [rows],
  );

  const manager = useWorkspaceManager({
    featureName: "Inventory",
    tableLabel,
    rowsRootKey: inventoryKeys.rowsRoot(rowsRootParams),
    extraInvalidateKeys: [inventoryKeys.columns({ companyId, table })],
    rowsById: rowsById as Map<string, Record<string, unknown>>,
    standardTypeByKey,
    customTypeByKey,
    onMutationStateChange,
    normalizeError: toFriendlyInventoryError,
    createRowAction: async (payload) =>
      createInventoryRowAction({
        companyId,
        table,
        standardData: toStandardData(payload),
        customData: asRecord(payload.customValues),
      }),
    updateRowAction: async ({ rowId, payload }) => {
      const existingRow = rowsById.get(rowId);
      const nextCustomValues =
        payload.customValues !== undefined
          ? asRecord(payload.customValues)
          : asRecord(existingRow?.custom_data ?? existingRow?.custom_fields);
      return updateInventoryRowAction({
        companyId,
        table,
        rowId,
        standardData: toStandardData(payload),
        customData: nextCustomValues,
      });
    },
    deleteRowAction: async (rowId) =>
      deleteInventoryRowAction({
        companyId,
        table,
        rowId,
      }),
    createColumnAction: async (payload) => {
      const column = payload as unknown as Omit<VirtualColumn, "id">;
      return createInventoryCustomFieldAction({
        companyId,
        entityType: table,
        fieldLabel: column.label,
        fieldName: column.key,
        fieldType: column.type === "status" ? "select" : column.type,
        fieldOptions:
          column.type === "select" ||
          column.type === "currency" ||
          column.type === "status"
            ? normalizeFieldOptions(column.type, column.options)
            : undefined,
        isRequired: false,
      });
    },
    updateColumnAction: async ({ columnId, payload }) => {
      const column = payload as unknown as Omit<VirtualColumn, "id">;
      return updateInventoryCustomFieldAction({
        companyId,
        fieldId: columnId,
        entityType: table,
        fieldLabel: column.label,
        fieldName: column.key,
        fieldType: column.type === "status" ? "select" : column.type,
        fieldOptions:
          column.type === "select" ||
          column.type === "currency" ||
          column.type === "status"
            ? normalizeFieldOptions(column.type, column.options)
            : undefined,
        isRequired: false,
      });
    },
    deleteColumnAction: async (columnId) =>
      deleteInventoryCustomFieldAction({
        companyId,
        fieldId: columnId,
      }),
  });

  const handlePageChange = useCallback(
    (page: number) => {
      setPageState({ page, search: normalizedSearch });
    },
    [normalizedSearch],
  );

  const isInitialLoading =
    (rowsQuery.isPending ||
      columnsQuery.isPending ||
      relationsQuery.isPending) &&
    rows.length === 0;
  const queryError =
    (rowsQuery.error instanceof Error && rowsQuery.error.message) ||
    (columnsQuery.error instanceof Error && columnsQuery.error.message) ||
    relationsQuery.error ||
    null;

  const tableProps: InventoryWorkspaceTableProps = {
    table,
    gridData,
    relations,
    virtualColumns,
    currentPage,
    totalRows,
    pageSize,
    onPageChange: handlePageChange,
    onAdd: manager.createRow,
    onUpdate: manager.updateRow,
    onDelete: manager.deleteRow,
    onColumnAdd: manager.createColumn,
    onColumnUpdate: manager.updateColumn,
    onColumnDelete: manager.deleteColumn,
    searchQuery,
    onSearchQueryChange: () => {},
    selectedRowId,
  };

  return { tableProps, queryError, isInitialLoading };
}
