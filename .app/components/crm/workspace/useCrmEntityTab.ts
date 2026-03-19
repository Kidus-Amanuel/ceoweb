"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";
import { useWorkspaceManager } from "@/hooks/use-workspace-manager";
import { CRM_TABLE_PAGE_SIZE_DEFAULT } from "@/lib/constants/crm-pagination";
import { type TableFieldType } from "@/utils/table-helpers";
import {
  asRecord,
  crmViewHelpers,
  mapFieldType,
  normalizeFieldOptions,
  normalizeRowForGrid,
  tableToEntity,
  toFriendlyCrmError,
  type CrmDataTable,
  type RelationalSets,
  type SelectOption,
} from "./crm-workspace.shared";
import {
  createCrmCustomFieldAction,
  createCrmRowAction,
  deleteCrmCustomFieldAction,
  deleteCrmRowAction,
  updateCrmCustomFieldAction,
  updateCrmRowAction,
} from "./queries/crm-workspace.query-actions";
import {
  crmKeys,
  getCrmFiltersHash,
  normalizeCrmWorkspaceFilters,
  useCrmColumnsQuery,
  useCrmRelationsQueries,
  useCrmRowsQuery,
} from "./queries/crm-workspace.queries";
import type { CrmWorkspaceTableProps } from "./CrmWorkspaceTable";

type CrmEntityTabConfig = {
  companyId: string;
  searchQuery: string;
  table: CrmDataTable;
  tableLabel: string;
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
  onMutationStateChange?: (mutating: boolean) => void;
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

const buildRelations = (
  table: CrmDataTable,
  relationsQuery: ReturnType<typeof useCrmRelationsQueries>,
): RelationalSets => {
  const users = relationsQuery.users;
  const customers =
    table === "activities" || table === "deals"
      ? relationsQuery.customers
      : ([] as SelectOption[]);
  const deals =
    table === "activities" ? relationsQuery.deals : ([] as SelectOption[]);
  return { users, customers, deals };
};

export function useCrmEntityTab({
  companyId,
  searchQuery,
  table,
  tableLabel,
  refreshNonce = 0,
  onRefreshStateChange,
  onMutationStateChange,
}: CrmEntityTabConfig) {
  const searchParams = useSearchParams();
  const selectedRowId = searchParams.get("rowId");
  const [pageState, setPageState] = useState({ page: 1, search: "" });
  const lastRefreshNonceRef = useRef(0);
  const pageSize = CRM_TABLE_PAGE_SIZE_DEFAULT;

  const normalizedSearch = useMemo(
    () => normalizeCrmWorkspaceFilters({ search: searchQuery }).search,
    [searchQuery],
  );
  const filtersHash = useMemo(
    () => getCrmFiltersHash({ search: normalizedSearch }),
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
  const rowsQuery = useCrmRowsQuery(rowsParams);
  const columnsQuery = useCrmColumnsQuery({ companyId, table });
  const relationsQuery = useCrmRelationsQueries({ companyId, table });

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
  const relations = useMemo(
    () => buildRelations(table, relationsQuery),
    [relationsQuery, table],
  );
  const standardTypeByKey = useMemo(() => {
    const map = new Map<string, TableFieldType>();
    crmViewHelpers.getStandardColumns(table, relations).forEach((column) => {
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
  const gridData = useMemo(
    () => rows.map((row) => normalizeRowForGrid(table, row)),
    [rows, table],
  );
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

  const manager = useWorkspaceManager({
    featureName: "CRM",
    tableLabel,
    rowsRootKey: crmKeys.rowsRoot(rowsRootParams),
    extraInvalidateKeys: [
      crmKeys.columns({ companyId, table }),
      crmKeys.counts({ companyId }),
    ],
    rowsById: rowsById as Map<string, Record<string, unknown>>,
    standardTypeByKey,
    customTypeByKey,
    onMutationStateChange,
    normalizeError: toFriendlyCrmError,
    createRowAction: async (payload) =>
      createCrmRowAction({
        companyId,
        table,
        standardData: crmViewHelpers.serializeStandardData(table, payload),
        customData: asRecord(payload.customValues),
      }),
    updateRowAction: async ({ rowId, payload }) => {
      const existingRow = rowsById.get(rowId);
      const nextCustomValues =
        payload.customValues !== undefined
          ? asRecord(payload.customValues)
          : asRecord(existingRow?.custom_data ?? existingRow?.custom_fields);
      return updateCrmRowAction({
        companyId,
        table,
        rowId,
        standardData: crmViewHelpers.serializeStandardData(
          table,
          payload,
          existingRow,
        ),
        customData: nextCustomValues,
      });
    },
    deleteRowAction: async (rowId) =>
      deleteCrmRowAction({
        companyId,
        table,
        rowId,
      }),
    createColumnAction: async (payload) => {
      const column = payload as unknown as Omit<VirtualColumn, "id">;
      return createCrmCustomFieldAction({
        companyId,
        entityType: tableToEntity(table),
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
      return updateCrmCustomFieldAction({
        companyId,
        fieldId: columnId,
        entityType: tableToEntity(table),
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
      deleteCrmCustomFieldAction({
        companyId,
        fieldId: columnId,
      }),
  });

  const queryError =
    (rowsQuery.error instanceof Error && rowsQuery.error.message) ||
    (columnsQuery.error instanceof Error && columnsQuery.error.message) ||
    relationsQuery.error ||
    null;

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

  const tableProps: CrmWorkspaceTableProps = {
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
