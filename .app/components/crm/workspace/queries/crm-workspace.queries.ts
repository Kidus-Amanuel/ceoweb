"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import { z } from "zod";
import {
  getCrmColumnsAction,
  getCrmCountsAction,
  getCrmCustomersOptionsAction,
  getCrmDealsOptionsAction,
  getCrmRowsAction,
  getCrmUsersOptionsAction,
} from "./crm-workspace.query-actions";
import type {
  CrmDataTable,
  RawRow,
  SelectOption,
  TableCounts,
} from "../crm-workspace.shared";
import { DEFAULT_COUNTS, toFriendlyCrmError } from "../crm-workspace.shared";

const filterSchema = z.object({
  search: z.string().optional().default(""),
});

const METADATA_PERSIST_TTL_MS = 24 * 60 * 60 * 1000;
const metadataPersistPrefix = "crm-meta-cache:v1";
const makePersistKey = (parts: Array<string | number>) =>
  `${metadataPersistPrefix}:${parts.join(":")}`;
const readPersistedMetadata = <T>(key: string): T | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { ts?: number; data?: T };
    if (!parsed || typeof parsed.ts !== "number") return undefined;
    if (Date.now() - parsed.ts > METADATA_PERSIST_TTL_MS) {
      window.localStorage.removeItem(key);
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
};
const writePersistedMetadata = <T>(key: string, data: T) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        ts: Date.now(),
        data,
      }),
    );
  } catch {}
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

export type CrmWorkspaceFilters = z.infer<typeof filterSchema>;
export const normalizeCrmWorkspaceFilters = (filters: CrmWorkspaceFilters) => {
  const parsed = filterSchema.parse(filters);
  return {
    search: parsed.search.trim(),
  };
};
export const getCrmFiltersHash = (filters: CrmWorkspaceFilters) =>
  stableSerialize(normalizeCrmWorkspaceFilters(filters));

export type RowsKeyParams = {
  companyId: string;
  table: CrmDataTable;
  page: number;
  pageSize: number;
  search: string;
  filtersHash: string;
};

export type RowsRootKeyParams = Omit<RowsKeyParams, "page">;

export const crmKeys = {
  all: ["crm"] as const,
  rowsRoot: (params: RowsRootKeyParams) =>
    [
      "crm",
      "rows",
      params.companyId,
      params.table,
      params.pageSize,
      params.search,
      params.filtersHash,
    ] as const,
  rows: (params: RowsKeyParams) =>
    [...crmKeys.rowsRoot(params), params.page] as const,
  rowsInfinite: (params: RowsRootKeyParams) =>
    [
      "crm",
      "rows-infinite",
      params.companyId,
      params.table,
      params.pageSize,
      params.search,
      params.filtersHash,
    ] as const,
  columns: (params: { companyId: string; table: CrmDataTable }) =>
    ["crm", "columns", params.companyId, params.table] as const,
  meta: (params: {
    companyId: string;
    table: CrmDataTable;
    kind: "users" | "customers" | "deals";
  }) => ["crm", "meta", params.companyId, params.table, params.kind] as const,
  counts: (params: { companyId: string }) =>
    ["crm", "counts", params.companyId] as const,
  search: (params: { companyId: string; query: string; filtersHash: string }) =>
    [
      "crm",
      "search",
      params.companyId,
      params.query,
      params.filtersHash,
    ] as const,
};

export type CrmRowsQueryData = {
  rows: RawRow[];
  totalRows: number;
};

const throwIfError = <T>(response: {
  success: boolean;
  error?: string;
  data?: T;
}) => {
  if (!response.success)
    throw new Error(toFriendlyCrmError(response.error || "Request failed."));
  return response.data as T;
};

export const isCrmRowsKeyForScope = (
  queryKey: readonly unknown[],
  scope: RowsRootKeyParams,
) => {
  if (!Array.isArray(queryKey) || queryKey.length < 8) return false;
  if (queryKey[0] !== "crm" || queryKey[1] !== "rows") return false;
  return (
    queryKey[2] === scope.companyId &&
    queryKey[3] === scope.table &&
    queryKey[4] === scope.pageSize &&
    queryKey[6] === scope.filtersHash
  );
};

export const fetchCrmRows = async (
  params: RowsKeyParams,
): Promise<CrmRowsQueryData> => {
  const response = await getCrmRowsAction({
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

export const useCrmRowsQuery = (params: RowsKeyParams | null) =>
  useQuery<CrmRowsQueryData>({
    queryKey: params ? crmKeys.rows(params) : ["crm", "rows", "disabled"],
    enabled: !!params,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (!params) return { rows: [], totalRows: 0 };
      return fetchCrmRows(params);
    },
  });

export const useCrmRowsInfiniteQuery = (params: RowsRootKeyParams | null) =>
  useInfiniteQuery<CrmRowsQueryData>({
    queryKey: params
      ? crmKeys.rowsInfinite(params)
      : ["crm", "rows-infinite", "disabled"],
    enabled: !!params,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!params) return { rows: [], totalRows: 0 };
      return fetchCrmRows({
        ...params,
        page: Number(pageParam),
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedRows = allPages.reduce(
        (sum, page) => sum + page.rows.length,
        0,
      );
      if (loadedRows >= lastPage.totalRows) return undefined;
      return allPages.length + 1;
    },
  });

export const useCrmColumnsQuery = (
  params: { companyId: string; table: CrmDataTable } | null,
) =>
  useQuery<Record<string, unknown>[]>({
    queryKey: params ? crmKeys.columns(params) : ["crm", "columns", "disabled"],
    enabled: !!params,
    staleTime: 10 * 60 * 1000,
    initialData: () => {
      if (!params) return undefined;
      return readPersistedMetadata<Record<string, unknown>[]>(
        makePersistKey(["columns", params.companyId, params.table]),
      );
    },
    queryFn: async () => {
      if (!params) return [];
      const response = await getCrmColumnsAction({
        companyId: params.companyId,
        table: params.table,
      });
      const data = throwIfError<Record<string, unknown>[]>(response) ?? [];
      writePersistedMetadata(
        makePersistKey(["columns", params.companyId, params.table]),
        data,
      );
      return data;
    },
  });

export const useCrmRelationsQueries = (
  params: { companyId: string; table: CrmDataTable } | null,
) => {
  const enabledUsers =
    !!params && (params.table === "customers" || params.table === "deals");
  const enabledCustomers =
    !!params && (params.table === "deals" || params.table === "activities");
  const enabledDeals = !!params && params.table === "activities";

  const [usersQuery, customersQuery, dealsQuery] = useQueries({
    queries: [
      {
        queryKey: params
          ? crmKeys.meta({
              companyId: params.companyId,
              table: params.table,
              kind: "users",
            })
          : ["crm", "meta", "disabled", "users"],
        enabled: enabledUsers,
        staleTime: 5 * 60 * 1000,
        initialData: () =>
          params
            ? readPersistedMetadata<SelectOption[]>(
                makePersistKey([
                  "meta",
                  params.companyId,
                  params.table,
                  "users",
                ]),
              )
            : undefined,
        queryFn: async () => {
          if (!params) return [] as SelectOption[];
          const response = await getCrmUsersOptionsAction({
            companyId: params.companyId,
          });
          const data = throwIfError<SelectOption[]>(response) ?? [];
          writePersistedMetadata(
            makePersistKey(["meta", params.companyId, params.table, "users"]),
            data,
          );
          return data;
        },
      },
      {
        queryKey: params
          ? crmKeys.meta({
              companyId: params.companyId,
              table: params.table,
              kind: "customers",
            })
          : ["crm", "meta", "disabled", "customers"],
        enabled: enabledCustomers,
        staleTime: 5 * 60 * 1000,
        initialData: () =>
          params
            ? readPersistedMetadata<SelectOption[]>(
                makePersistKey([
                  "meta",
                  params.companyId,
                  params.table,
                  "customers",
                ]),
              )
            : undefined,
        queryFn: async () => {
          if (!params) return [] as SelectOption[];
          const response = await getCrmCustomersOptionsAction({
            companyId: params.companyId,
          });
          const data = throwIfError<SelectOption[]>(response) ?? [];
          writePersistedMetadata(
            makePersistKey([
              "meta",
              params.companyId,
              params.table,
              "customers",
            ]),
            data,
          );
          return data;
        },
      },
      {
        queryKey: params
          ? crmKeys.meta({
              companyId: params.companyId,
              table: params.table,
              kind: "deals",
            })
          : ["crm", "meta", "disabled", "deals"],
        enabled: enabledDeals,
        staleTime: 5 * 60 * 1000,
        initialData: () =>
          params
            ? readPersistedMetadata<SelectOption[]>(
                makePersistKey([
                  "meta",
                  params.companyId,
                  params.table,
                  "deals",
                ]),
              )
            : undefined,
        queryFn: async () => {
          if (!params) return [] as SelectOption[];
          const response = await getCrmDealsOptionsAction({
            companyId: params.companyId,
          });
          const data = throwIfError<SelectOption[]>(response) ?? [];
          writePersistedMetadata(
            makePersistKey(["meta", params.companyId, params.table, "deals"]),
            data,
          );
          return data;
        },
      },
    ],
  });

  const firstError =
    (usersQuery.error instanceof Error && usersQuery.error.message) ||
    (customersQuery.error instanceof Error && customersQuery.error.message) ||
    (dealsQuery.error instanceof Error && dealsQuery.error.message) ||
    null;

  return {
    users: usersQuery.data ?? [],
    customers: customersQuery.data ?? [],
    deals: dealsQuery.data ?? [],
    isPending:
      (enabledUsers && usersQuery.isPending) ||
      (enabledCustomers && customersQuery.isPending) ||
      (enabledDeals && dealsQuery.isPending),
    isFetching:
      (enabledUsers && usersQuery.isFetching) ||
      (enabledCustomers && customersQuery.isFetching) ||
      (enabledDeals && dealsQuery.isFetching),
    error: firstError,
    refetchAll: () =>
      Promise.all([
        enabledUsers ? usersQuery.refetch() : Promise.resolve(),
        enabledCustomers ? customersQuery.refetch() : Promise.resolve(),
        enabledDeals ? dealsQuery.refetch() : Promise.resolve(),
      ]),
  };
};

export const useCrmCountsQuery = (companyId: string | null, enabled = true) =>
  useQuery<TableCounts>({
    queryKey: companyId
      ? crmKeys.counts({ companyId })
      : ["crm", "counts", "disabled"],
    enabled: !!companyId && enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async () => {
      if (!companyId) return DEFAULT_COUNTS;
      const response = await getCrmCountsAction({ companyId });
      return throwIfError<TableCounts>(response) ?? DEFAULT_COUNTS;
    },
  });
