"use client";

import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  getInventoryColumnsAction,
  getInventoryProductsOptionsAction,
  getInventoryRowsAction,
  getInventorySuppliersOptionsAction,
  getInventoryWarehousesOptionsAction,
} from "./inventory-workspace.query-actions";
import type {
  InventoryDataTable,
  RawRow,
  SelectOption,
} from "../inventory-workspace.shared";
import { toFriendlyInventoryError } from "../inventory-workspace.shared";

const filterSchema = z.object({
  search: z.string().optional().default(""),
});

export type InventoryWorkspaceFilters = z.infer<typeof filterSchema>;
export const normalizeInventoryWorkspaceFilters = (
  filters: InventoryWorkspaceFilters,
) => {
  const parsed = filterSchema.parse(filters);
  return {
    search: parsed.search.trim(),
  };
};

const stableSerialize = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const getInventoryFiltersHash = (filters: InventoryWorkspaceFilters) =>
  stableSerialize(normalizeInventoryWorkspaceFilters(filters));

export type RowsKeyParams = {
  companyId: string;
  table: InventoryDataTable;
  page: number;
  pageSize: number;
  search: string;
  filtersHash: string;
};

export type RowsRootKeyParams = Omit<RowsKeyParams, "page">;

export const inventoryKeys = {
  all: ["inventory"] as const,
  rowsRoot: (params: RowsRootKeyParams) =>
    [
      "inventory",
      "rows",
      params.companyId,
      params.table,
      params.pageSize,
      params.search,
      params.filtersHash,
    ] as const,
  rows: (params: RowsKeyParams) =>
    [...inventoryKeys.rowsRoot(params), params.page] as const,
  columns: (params: { companyId: string; table: InventoryDataTable }) =>
    ["inventory", "columns", params.companyId, params.table] as const,
  meta: (params: {
    companyId: string;
    table: InventoryDataTable;
    kind: "products" | "suppliers" | "warehouses";
  }) =>
    ["inventory", "meta", params.companyId, params.table, params.kind] as const,
};

export type InventoryRowsQueryData = {
  rows: RawRow[];
  totalRows: number;
};

const throwIfError = <T>(response: {
  success: boolean;
  error?: string;
  data?: T;
}) => {
  if (!response.success)
    throw new Error(
      toFriendlyInventoryError(response.error || "Request failed."),
    );
  return response.data as T;
};

export const fetchInventoryRows = async (
  params: RowsKeyParams,
): Promise<InventoryRowsQueryData> => {
  const response = await getInventoryRowsAction({
    companyId: params.companyId,
    table: params.table,
    page: params.page,
    pageSize: params.pageSize,
    search: params.search || undefined,
  });
  const data = throwIfError<{
    rows: Record<string, unknown>[];
    totalRows: number;
  }>(response);
  return {
    rows: (data.rows ?? []) as RawRow[],
    totalRows: data.totalRows ?? 0,
  };
};

export const useInventoryRowsQuery = (params: RowsKeyParams | null) =>
  useQuery<InventoryRowsQueryData>({
    queryKey: params
      ? inventoryKeys.rows(params)
      : ["inventory", "rows", "disabled"],
    enabled: !!params,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!params) return { rows: [], totalRows: 0 };
      return fetchInventoryRows(params);
    },
  });

export const useInventoryColumnsQuery = (
  params: { companyId: string; table: InventoryDataTable } | null,
) =>
  useQuery<Record<string, unknown>[]>({
    queryKey: params
      ? inventoryKeys.columns(params)
      : ["inventory", "columns", "disabled"],
    enabled: !!params,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!params) return [];
      const response = await getInventoryColumnsAction({
        companyId: params.companyId,
        table: params.table,
      });
      return throwIfError<Record<string, unknown>[]>(response) ?? [];
    },
  });

export const useInventoryRelationsQueries = (
  params: { companyId: string; table: InventoryDataTable } | null,
) => {
  const enabledProducts = params?.table === "products";
  const enabledStock = params?.table === "stock_levels";

  const [productsQuery, suppliersQuery, warehousesQuery] = useQueries({
    queries: [
      {
        queryKey: params
          ? inventoryKeys.meta({
              companyId: params.companyId,
              table: params.table,
              kind: "products",
            })
          : ["inventory", "meta", "disabled", "products"],
        enabled: !!enabledStock,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          if (!params) return [] as SelectOption[];
          const response = await getInventoryProductsOptionsAction({
            companyId: params.companyId,
          });
          return throwIfError<SelectOption[]>(response) ?? [];
        },
      },
      {
        queryKey: params
          ? inventoryKeys.meta({
              companyId: params.companyId,
              table: params.table,
              kind: "suppliers",
            })
          : ["inventory", "meta", "disabled", "suppliers"],
        enabled: !!enabledProducts,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          if (!params) return [] as SelectOption[];
          const response = await getInventorySuppliersOptionsAction({
            companyId: params.companyId,
          });
          return throwIfError<SelectOption[]>(response) ?? [];
        },
      },
      {
        queryKey: params
          ? inventoryKeys.meta({
              companyId: params.companyId,
              table: params.table,
              kind: "warehouses",
            })
          : ["inventory", "meta", "disabled", "warehouses"],
        enabled: !!enabledStock,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
          if (!params) return [] as SelectOption[];
          const response = await getInventoryWarehousesOptionsAction({
            companyId: params.companyId,
          });
          return throwIfError<SelectOption[]>(response) ?? [];
        },
      },
    ],
  });

  const firstError =
    (productsQuery.error instanceof Error && productsQuery.error.message) ||
    (suppliersQuery.error instanceof Error && suppliersQuery.error.message) ||
    (warehousesQuery.error instanceof Error && warehousesQuery.error.message) ||
    null;

  return {
    products: productsQuery.data ?? [],
    suppliers: suppliersQuery.data ?? [],
    warehouses: warehousesQuery.data ?? [],
    isPending:
      (enabledStock && productsQuery.isPending) ||
      (enabledProducts && suppliersQuery.isPending) ||
      (enabledStock && warehousesQuery.isPending),
    isFetching:
      (enabledStock && productsQuery.isFetching) ||
      (enabledProducts && suppliersQuery.isFetching) ||
      (enabledStock && warehousesQuery.isFetching),
    error: firstError,
    refetchAll: () =>
      Promise.all([
        enabledStock ? productsQuery.refetch() : Promise.resolve(),
        enabledProducts ? suppliersQuery.refetch() : Promise.resolve(),
        enabledStock ? warehousesQuery.refetch() : Promise.resolve(),
      ]),
  };
};
