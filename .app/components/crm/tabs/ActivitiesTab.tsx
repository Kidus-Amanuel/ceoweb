"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";
import { CRM_TABLE_PAGE_SIZE_DEFAULT } from "@/lib/constants/crm-pagination";
import {
  asRecord,
  crmViewHelpers,
  mapFieldType,
  normalizeFieldOptions,
  normalizeRowForGrid,
  tableToEntity,
  type RawRow,
  type SelectOption,
} from "@/components/crm/workspace/crm-workspace.shared";
import { showCrmToast } from "@/components/crm/workspace/crm-toast";
import {
  createCrmCustomFieldAction,
  createCrmRowAction,
  deleteCrmCustomFieldAction,
  deleteCrmRowAction,
  updateCrmCustomFieldAction,
  updateCrmRowAction,
} from "@/components/crm/workspace/queries/crm-workspace.query-actions";
import {
  crmKeys,
  getCrmFiltersHash,
  isCrmRowsKeyForScope,
  normalizeCrmWorkspaceFilters,
  useCrmColumnsQuery,
  useCrmRelationsQueries,
  useCrmRowsQuery,
  type CrmRowsQueryData,
} from "@/components/crm/workspace/queries/crm-workspace.queries";
import { CrmWorkspaceTable } from "@/components/crm/workspace/CrmWorkspaceTable";
import TabSkeleton from "./TabSkeleton";

type ActivitiesTabProps = {
  companyId: string;
  searchQuery: string;
  refreshNonce?: number;
  onRefreshStateChange?: (refreshing: boolean) => void;
  onMutationStateChange?: (mutating: boolean) => void;
};

const TABLE = "activities" as const;

const isSameQueryKey = (left: readonly unknown[], right: readonly unknown[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const mergePayloadIntoRow = (row: RawRow, payload: Record<string, unknown>) => {
  const nextRow = { ...row };
  for (const [key, value] of Object.entries(payload)) {
    if (key === "customValues") {
      const mergedCustom = {
        ...asRecord(row.custom_data ?? row.custom_fields),
        ...asRecord(value),
      };
      nextRow.custom_data = mergedCustom;
      nextRow.custom_fields = mergedCustom;
      continue;
    }
    (nextRow as Record<string, unknown>)[key] = value;
  }
  return nextRow;
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

export default function ActivitiesTab({
  companyId,
  searchQuery,
  refreshNonce = 0,
  onRefreshStateChange,
  onMutationStateChange,
}: ActivitiesTabProps) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const pageSize = CRM_TABLE_PAGE_SIZE_DEFAULT;
  const selectedRowId = searchParams.get("rowId");
  const [pageState, setPageState] = useState({ page: 1, search: "" });
  const rowUpdateQueueRef = useRef(new Map<string, Promise<void>>());
  const lastRefreshNonceRef = useRef(0);

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
      table: TABLE,
      pageSize,
      search: normalizedSearch,
      filtersHash,
    }),
    [companyId, filtersHash, normalizedSearch, pageSize],
  );
  const rowsParams = useMemo(
    () => ({
      ...rowsRootParams,
      page: currentPage,
    }),
    [currentPage, rowsRootParams],
  );
  const currentRowsKey = useMemo(() => crmKeys.rows(rowsParams), [rowsParams]);

  const rowsQuery = useCrmRowsQuery(rowsParams);
  const columnsQuery = useCrmColumnsQuery({ companyId, table: TABLE });
  const relationsQuery = useCrmRelationsQueries({ companyId, table: TABLE });

  const rowsRefetch = rowsQuery.refetch;
  const columnsRefetch = columnsQuery.refetch;
  const relationsRefetchAll = relationsQuery.refetchAll;
  useEffect(() => {
    if (!refreshNonce) return;
    if (lastRefreshNonceRef.current === refreshNonce) return;
    lastRefreshNonceRef.current = refreshNonce;
    onRefreshStateChange?.(true);
    void Promise.all([
      rowsRefetch(),
      columnsRefetch(),
      relationsRefetchAll(),
      queryClient.invalidateQueries({
        queryKey: crmKeys.counts({ companyId }),
      }),
    ]).finally(() => onRefreshStateChange?.(false));
  }, [
    refreshNonce,
    rowsRefetch,
    columnsRefetch,
    relationsRefetchAll,
    queryClient,
    companyId,
    onRefreshStateChange,
  ]);

  const rows = useMemo(
    () => rowsQuery.data?.rows ?? [],
    [rowsQuery.data?.rows],
  );
  const totalRows = rowsQuery.data?.totalRows ?? 0;
  const columnDefinitions = useMemo(
    () => columnsQuery.data ?? [],
    [columnsQuery.data],
  );
  const users = relationsQuery.users;
  const customers = relationsQuery.customers;
  const deals = relationsQuery.deals;

  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row] as const)),
    [rows],
  );
  const relations = useMemo(
    () => ({
      users,
      customers,
      deals,
    }),
    [customers, deals, users],
  );
  const gridData = useMemo(
    () => rows.map((row) => normalizeRowForGrid(TABLE, row)),
    [rows],
  );
  const virtualColumns = useMemo(
    () => toVirtualColumns(columnDefinitions),
    [columnDefinitions],
  );

  const queryError =
    (rowsQuery.error instanceof Error && rowsQuery.error.message) ||
    (columnsQuery.error instanceof Error && columnsQuery.error.message) ||
    relationsQuery.error ||
    null;

  const setCurrentRowsData = useCallback(
    (updater: (current: CrmRowsQueryData) => CrmRowsQueryData) => {
      queryClient.setQueryData<CrmRowsQueryData>(currentRowsKey, (current) =>
        current ? updater(current) : current,
      );
    },
    [currentRowsKey, queryClient],
  );

  const invalidateRowsScope = useCallback(
    (includeCurrentPage = false) =>
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as readonly unknown[];
          if (!isCrmRowsKeyForScope(key, rowsRootParams)) return false;
          return includeCurrentPage || !isSameQueryKey(key, currentRowsKey);
        },
      }),
    [currentRowsKey, queryClient, rowsRootParams],
  );

  const createRowMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await createCrmRowAction({
        companyId,
        table: TABLE,
        standardData: crmViewHelpers.serializeStandardData(TABLE, payload),
        customData: asRecord(payload.customValues),
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create activity row.");
      }
      return response.data as RawRow;
    },
    onSuccess: (createdRow) => {
      setCurrentRowsData((current) => ({
        rows:
          currentPage === 1
            ? [createdRow, ...current.rows].slice(0, pageSize)
            : current.rows,
        totalRows: current.totalRows + 1,
      }));
      void invalidateRowsScope();
      void queryClient.invalidateQueries({
        queryKey: crmKeys.counts({ companyId }),
      });
      showCrmToast({
        op: "rowCreate",
        tableLabel: "Activities",
        mode: "success",
        message: "Row created.",
      });
    },
    onError: (mutationError) => {
      showCrmToast({
        op: "rowCreate",
        tableLabel: "Activities",
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to create activity row.",
      });
    },
  });

  const updateRowMutation = useMutation({
    mutationFn: async ({
      rowId,
      payload,
    }: {
      rowId: string;
      payload: Record<string, unknown>;
    }) => {
      const existingRow = rowsById.get(rowId);
      const nextCustomValues =
        payload.customValues !== undefined
          ? asRecord(payload.customValues)
          : asRecord(existingRow?.custom_data ?? existingRow?.custom_fields);
      const response = await updateCrmRowAction({
        companyId,
        table: TABLE,
        rowId,
        standardData: crmViewHelpers.serializeStandardData(
          TABLE,
          payload,
          existingRow,
        ),
        customData: nextCustomValues,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to update activity row.");
      }
      return { rowId, row: response.data as RawRow };
    },
    onMutate: async ({ rowId, payload }) => {
      await queryClient.cancelQueries({ queryKey: currentRowsKey });
      const previous =
        queryClient.getQueryData<CrmRowsQueryData>(currentRowsKey);
      if (previous) {
        queryClient.setQueryData<CrmRowsQueryData>(currentRowsKey, {
          ...previous,
          rows: previous.rows.map((row) =>
            row.id === rowId ? mergePayloadIntoRow(row, payload) : row,
          ),
        });
      }
      return { previous };
    },
    onError: (mutationError, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(currentRowsKey, context.previous);
      showCrmToast({
        op: "rowUpdate",
        tableLabel: "Activities",
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to update activity row.",
      });
    },
    onSuccess: ({ rowId, row }) => {
      setCurrentRowsData((current) => ({
        ...current,
        rows: current.rows.map((currentRow) =>
          currentRow.id === rowId ? (row as RawRow) : currentRow,
        ),
      }));
      showCrmToast({
        op: "rowUpdate",
        tableLabel: "Activities",
        mode: "success",
        message: "Row updated.",
      });
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const response = await deleteCrmRowAction({
        companyId,
        table: TABLE,
        rowId,
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to delete activity row.");
      }
    },
    onMutate: async (rowId) => {
      await queryClient.cancelQueries({ queryKey: currentRowsKey });
      const previous =
        queryClient.getQueryData<CrmRowsQueryData>(currentRowsKey);
      if (previous) {
        queryClient.setQueryData<CrmRowsQueryData>(currentRowsKey, {
          rows: previous.rows.filter((row) => row.id !== rowId),
          totalRows: Math.max(0, previous.totalRows - 1),
        });
      }
      return { previous };
    },
    onError: (mutationError, _rowId, context) => {
      if (context?.previous)
        queryClient.setQueryData(currentRowsKey, context.previous);
      showCrmToast({
        op: "rowDelete",
        tableLabel: "Activities",
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to delete activity row.",
      });
    },
    onSuccess: () => {
      void invalidateRowsScope();
      void queryClient.invalidateQueries({
        queryKey: crmKeys.counts({ companyId }),
      });
      showCrmToast({
        op: "rowDelete",
        tableLabel: "Activities",
        mode: "success",
        message: "Row deleted.",
      });
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: async (column: Omit<VirtualColumn, "id">) => {
      const response = await createCrmCustomFieldAction({
        companyId,
        entityType: tableToEntity(TABLE),
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
        throw new Error(response.error || "Failed to create custom field.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: crmKeys.columns({ companyId, table: TABLE }),
      });
      void invalidateRowsScope(true);
      showCrmToast({
        op: "columnCreate",
        tableLabel: "Activities",
        mode: "success",
        message: "Field added.",
      });
    },
    onError: (mutationError) => {
      showCrmToast({
        op: "columnCreate",
        tableLabel: "Activities",
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to create custom field.",
      });
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({
      columnId,
      column,
    }: {
      columnId: string;
      column: Omit<VirtualColumn, "id">;
    }) => {
      const response = await updateCrmCustomFieldAction({
        companyId,
        fieldId: columnId,
        entityType: tableToEntity(TABLE),
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
        throw new Error(response.error || "Failed to update custom field.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: crmKeys.columns({ companyId, table: TABLE }),
      });
      void invalidateRowsScope(true);
      showCrmToast({
        op: "columnUpdate",
        tableLabel: "Activities",
        mode: "success",
        message: "Field updated.",
      });
    },
    onError: (mutationError) => {
      showCrmToast({
        op: "columnUpdate",
        tableLabel: "Activities",
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to update custom field.",
      });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const response = await deleteCrmCustomFieldAction({
        companyId,
        fieldId: columnId,
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to delete custom field.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: crmKeys.columns({ companyId, table: TABLE }),
      });
      void invalidateRowsScope(true);
      showCrmToast({
        op: "columnDelete",
        tableLabel: "Activities",
        mode: "success",
        message: "Field deleted.",
      });
    },
    onError: (mutationError) => {
      showCrmToast({
        op: "columnDelete",
        tableLabel: "Activities",
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to delete custom field.",
      });
    },
  });

  const isMutating =
    createRowMutation.isPending ||
    updateRowMutation.isPending ||
    deleteRowMutation.isPending ||
    createColumnMutation.isPending ||
    updateColumnMutation.isPending ||
    deleteColumnMutation.isPending;

  useEffect(() => {
    onMutationStateChange?.(isMutating);
    return () => onMutationStateChange?.(false);
  }, [isMutating, onMutationStateChange]);

  const handleAddRow = useCallback(
    async (payload: Record<string, unknown>) => {
      await createRowMutation.mutateAsync(payload);
    },
    [createRowMutation],
  );
  const handleUpdateRow = useCallback(
    async (rowId: string, payload: Record<string, unknown>) => {
      const previous =
        rowUpdateQueueRef.current.get(rowId) ?? Promise.resolve();
      const run: Promise<void> = previous
        .catch(() => undefined)
        .then(() => updateRowMutation.mutateAsync({ rowId, payload }))
        .then(() => undefined)
        .finally(() => {
          if (rowUpdateQueueRef.current.get(rowId) === run) {
            rowUpdateQueueRef.current.delete(rowId);
          }
        });
      rowUpdateQueueRef.current.set(rowId, run);
      await run;
    },
    [updateRowMutation],
  );
  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      await deleteRowMutation.mutateAsync(rowId);
    },
    [deleteRowMutation],
  );
  const handleAddColumn = useCallback(
    async (column: Omit<VirtualColumn, "id">) => {
      await createColumnMutation.mutateAsync(column);
    },
    [createColumnMutation],
  );
  const handleUpdateColumn = useCallback(
    async (columnId: string, column: Omit<VirtualColumn, "id">) => {
      await updateColumnMutation.mutateAsync({ columnId, column });
    },
    [updateColumnMutation],
  );
  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      await deleteColumnMutation.mutateAsync(columnId);
    },
    [deleteColumnMutation],
  );
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

  if (isInitialLoading) return <TabSkeleton rows={8} />;

  return (
    <div className="h-full min-h-0">
      {queryError ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {queryError}
        </div>
      ) : null}
      <CrmWorkspaceTable
        table={TABLE}
        gridData={gridData}
        relations={relations}
        virtualColumns={virtualColumns}
        currentPage={currentPage}
        totalRows={totalRows}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onAdd={handleAddRow}
        onUpdate={handleUpdateRow}
        onDelete={handleDeleteRow}
        onColumnAdd={handleAddColumn}
        onColumnUpdate={handleUpdateColumn}
        onColumnDelete={handleDeleteColumn}
        searchQuery={searchQuery}
        onSearchQueryChange={() => {}}
        selectedRowId={selectedRowId}
      />
    </div>
  );
}
