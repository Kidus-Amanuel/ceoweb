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
  type CrmDataTable,
  type RawRow,
  type RelationalSets,
  type SelectOption,
} from "./crm-workspace.shared";
import { showCrmToast } from "./crm-toast";
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
  isCrmRowsKeyForScope,
  normalizeCrmWorkspaceFilters,
  useCrmColumnsQuery,
  useCrmRelationsQueries,
  useCrmRowsQuery,
  type CrmRowsQueryData,
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

const normalizeNil = (value: unknown) =>
  value === "" || value === null || value === undefined ? null : value;

const toStringSafe = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);

const normalizeSelectValue = (value: unknown) => {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as { value?: unknown; label?: unknown }).value ??
        (value as { label?: unknown }).label
      : value;
  const trimmed = toStringSafe(normalizeNil(raw)).trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

const normalizeText = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  return toStringSafe(normalized).trim();
};

const normalizeEmail = (value: unknown) => {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
};

const normalizePhone = (value: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const trimmed = normalized.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  return `${hasPlus ? "+" : ""}${digits}`;
};

const normalizeNumber = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  const parsed = typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(parsed) ? parsed : toStringSafe(normalized).trim();
};

const normalizeCurrency = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  if (typeof normalized === "object" && !Array.isArray(normalized)) {
    const record = normalized as { amount?: unknown; currency?: unknown };
    const amount = normalizeNumber(record.amount ?? null);
    const currency = normalizeText(record.currency ?? null);
    return JSON.stringify({
      amount: typeof amount === "number" ? amount : amount ?? null,
      currency: currency ? currency.toUpperCase() : null,
    });
  }
  if (typeof normalized === "string") {
    return JSON.stringify({
      amount: null,
      currency: normalized.trim().toUpperCase(),
    });
  }
  if (typeof normalized === "number") {
    return JSON.stringify({ amount: normalized, currency: null });
  }
  return JSON.stringify({ amount: null, currency: null });
};

const normalizeDate = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  const date = new Date(String(normalized));
  if (Number.isNaN(date.getTime())) return normalizeText(normalized);
  return date.toISOString().slice(0, 10);
};

const normalizeDateTime = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  const date = new Date(String(normalized));
  if (Number.isNaN(date.getTime())) return normalizeText(normalized);
  return date.toISOString();
};

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`);
  return `{${entries.join(",")}}`;
};

const normalizeJson = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  return stableStringify(normalized);
};

const normalizeFiles = (value: unknown) => {
  if (!Array.isArray(value)) return normalizeJson(value);
  const ids = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return String(entry ?? "");
      const record = entry as {
        id?: unknown;
        path?: unknown;
        url?: unknown;
        name?: unknown;
      };
      return (
        toStringSafe(record.id) ||
        toStringSafe(record.path) ||
        toStringSafe(record.url) ||
        toStringSafe(record.name)
      ).trim();
    })
    .filter(Boolean)
    .sort();
  return JSON.stringify(ids);
};

const normalizeByType = (value: unknown, type: VirtualColumn["type"]) => {
  switch (type) {
    case "select":
    case "status":
      return normalizeSelectValue(value);
    case "number":
      return normalizeNumber(value);
    case "currency":
      return normalizeCurrency(value);
    case "date":
      return normalizeDate(value);
    case "datetime":
      return normalizeDateTime(value);
    case "boolean": {
      const normalized = normalizeNil(value);
      if (normalized === null) return null;
      if (typeof normalized === "boolean") return normalized;
      const token = toStringSafe(normalized).trim().toLowerCase();
      if (token === "true" || token === "1") return true;
      if (token === "false" || token === "0") return false;
      return token ? true : null;
    }
    case "email":
      return normalizeEmail(value);
    case "phone":
      return normalizePhone(value);
    case "files":
      return normalizeFiles(value);
    case "json":
      return normalizeJson(value);
    case "text":
    default:
      return normalizeText(value);
  }
};

const isEqualByType = (
  left: unknown,
  right: unknown,
  type: VirtualColumn["type"],
) => {
  const leftNorm = normalizeByType(left, type);
  const rightNorm = normalizeByType(right, type);
  if (typeof leftNorm === "number" && typeof rightNorm === "number") {
    return Number.isFinite(leftNorm) && Number.isFinite(rightNorm)
      ? leftNorm === rightNorm
      : leftNorm === rightNorm;
  }
  return Object.is(leftNorm, rightNorm);
};

const hasRowChanges = (
  row: RawRow | undefined,
  payload: Record<string, unknown>,
  standardTypeByKey: Map<string, VirtualColumn["type"]>,
  customTypeByKey: Map<string, VirtualColumn["type"]>,
) => {
  if (!row) return true;
  const entries = Object.entries(payload);
  if (!entries.length) return false;
  const existingCustom = asRecord(row.custom_data ?? row.custom_fields);

  for (const [key, value] of entries) {
    if (key === "customValues") {
      if (value === undefined) continue;
      const nextCustom = asRecord(value);
      for (const [customKey, customValue] of Object.entries(nextCustom)) {
        const type = customTypeByKey.get(customKey) ?? "text";
        if (!isEqualByType(existingCustom[customKey], customValue, type))
          return true;
      }
      continue;
    }
    const type = standardTypeByKey.get(key) ?? "text";
    if (!isEqualByType((row as Record<string, unknown>)[key], value, type))
      return true;
  }
  return false;
};

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
    table === "activities"
      ? relationsQuery.deals
      : ([] as SelectOption[]);
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
  const currentRowsKey = useMemo(() => crmKeys.rows(rowsParams), [rowsParams]);

  const rowsQuery = useCrmRowsQuery(rowsParams);
  const columnsQuery = useCrmColumnsQuery({ companyId, table });
  const relationsQuery = useCrmRelationsQueries({ companyId, table });

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

  const rows = useMemo(() => rowsQuery.data?.rows ?? [], [rowsQuery.data?.rows]);
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
    const map = new Map<string, VirtualColumn["type"]>();
    crmViewHelpers
      .getStandardColumns(table, relations)
      .forEach((column) => {
        const key = String(
          (column as { accessorKey?: unknown }).accessorKey ??
            (column as { id?: unknown }).id ??
            "",
        );
        if (!key) return;
        const meta = (column as { meta?: { type?: VirtualColumn["type"] } })
          .meta;
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
        virtualColumns.map((column) => [column.key, column.type] as const),
      ),
    [virtualColumns],
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
        table,
        standardData: crmViewHelpers.serializeStandardData(table, payload),
        customData: asRecord(payload.customValues),
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || `Failed to create ${table} row.`);
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
      if (currentPage !== 1) {
        void invalidateRowsScope(true);
      }
      void queryClient.invalidateQueries({
        queryKey: crmKeys.counts({ companyId }),
      });
      showCrmToast({
        op: "rowCreate",
        tableLabel,
        mode: "success",
        message: "Row created.",
      });
    },
    onError: (mutationError) => {
      showCrmToast({
        op: "rowCreate",
        tableLabel,
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : `Failed to create ${table} row.`,
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
        table,
        rowId,
        standardData: crmViewHelpers.serializeStandardData(
          table,
          payload,
          existingRow,
        ),
        customData: nextCustomValues,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || `Failed to update ${table} row.`);
      }
      return { rowId, row: response.data as RawRow };
    },
    onMutate: async ({ rowId, payload }) => {
      await queryClient.cancelQueries({ queryKey: currentRowsKey });
      const previous = queryClient.getQueryData<CrmRowsQueryData>(currentRowsKey);
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
        tableLabel,
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : `Failed to update ${table} row.`,
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
        tableLabel,
        mode: "success",
        message: "Row updated.",
      });
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const response = await deleteCrmRowAction({
        companyId,
        table,
        rowId,
      });
      if (!response.success) {
        throw new Error(response.error || `Failed to delete ${table} row.`);
      }
    },
    onMutate: async (rowId) => {
      await queryClient.cancelQueries({ queryKey: currentRowsKey });
      const previous = queryClient.getQueryData<CrmRowsQueryData>(currentRowsKey);
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
        tableLabel,
        mode: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : `Failed to delete ${table} row.`,
      });
    },
    onSuccess: () => {
      if (currentPage !== 1) {
        void invalidateRowsScope(true);
      }
      void queryClient.invalidateQueries({
        queryKey: crmKeys.counts({ companyId }),
      });
      showCrmToast({
        op: "rowDelete",
        tableLabel,
        mode: "success",
        message: "Row deleted.",
      });
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: async (column: Omit<VirtualColumn, "id">) => {
      const response = await createCrmCustomFieldAction({
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
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create custom field.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: crmKeys.columns({ companyId, table }),
      });
      void invalidateRowsScope(true);
      showCrmToast({
        op: "columnCreate",
        tableLabel,
        mode: "success",
        message: "Field added.",
      });
    },
    onError: (mutationError) => {
      showCrmToast({
        op: "columnCreate",
        tableLabel,
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
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to update custom field.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: crmKeys.columns({ companyId, table }),
      });
      void invalidateRowsScope(true);
      showCrmToast({
        op: "columnUpdate",
        tableLabel,
        mode: "success",
        message: "Field updated.",
      });
    },
    onError: (mutationError) => {
      showCrmToast({
        op: "columnUpdate",
        tableLabel,
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
        queryKey: crmKeys.columns({ companyId, table }),
      });
      void invalidateRowsScope(true);
      showCrmToast({
        op: "columnDelete",
        tableLabel,
        mode: "success",
        message: "Field deleted.",
      });
    },
    onError: (mutationError) => {
      showCrmToast({
        op: "columnDelete",
        tableLabel,
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
      if (
        !hasRowChanges(
          rowsById.get(rowId),
          payload,
          standardTypeByKey,
          customTypeByKey,
        )
      )
        return;
      const previous = rowUpdateQueueRef.current.get(rowId) ?? Promise.resolve();
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
    [customTypeByKey, rowsById, standardTypeByKey, updateRowMutation],
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

  const tableProps: CrmWorkspaceTableProps = {
    table,
    gridData,
    relations,
    virtualColumns,
    currentPage,
    totalRows,
    pageSize,
    onPageChange: handlePageChange,
    onAdd: handleAddRow,
    onUpdate: handleUpdateRow,
    onDelete: handleDeleteRow,
    onColumnAdd: handleAddColumn,
    onColumnUpdate: handleUpdateColumn,
    onColumnDelete: handleDeleteColumn,
    searchQuery,
    onSearchQueryChange: () => {},
    selectedRowId,
  };

  return { tableProps, queryError, isInitialLoading };
}
