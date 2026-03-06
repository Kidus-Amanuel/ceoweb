/**
 * Fleet React Query Hooks
 *
 * Centralizes all fleet data fetching with:
 * - Consistent cache keys (change one → all pages stay in sync)
 * - Shared staleTime / refetchInterval per data type
 * - Typed mutations with automatic cache invalidation
 * - Optimistic deletes for instant UI feedback
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getFleetTableViewAction,
  createFleetCustomFieldAction,
  updateFleetCustomFieldAction,
  deleteFleetCustomFieldAction,
} from "@/app/api/fleet/fleet";

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const fleetKeys = {
  all: ["fleet"] as const,
  vehicles: (companyId?: string) =>
    ["fleet", "vehicles", companyId || "global"] as const,
  drivers: (companyId?: string) =>
    ["fleet", "drivers", companyId || "global"] as const,
  maintenance: (companyId?: string) =>
    ["fleet", "maintenance", companyId || "global"] as const,
  vehicleTypes: () => ["fleet", "vehicle-types"] as const,
  employees: (companyId?: string) =>
    ["fleet", "employees", companyId || "global"] as const,
  columnDefs: (entity: string, companyId: string) =>
    ["fleet", "column-defs", entity, companyId] as const,
};

// ─── Generic fetch helper ───────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  console.log(`[use-fleet] apiFetch result for ${url}:`, data);
  return data;
}

// ─── VEHICLES ──────────────────────────────────────────────────────────────────
export type VehicleParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export function useVehicles(companyId?: string, params: VehicleParams = {}) {
  const qc = useQueryClient();
  const { page = 1, pageSize = 20, search = "", status = "all" } = params;

  // 1. Fetching
  const query = useQuery({
    queryKey: [...fleetKeys.vehicles(companyId), page, pageSize, search, status],
    queryFn: () =>
      apiFetch<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(
        `/api/fleet/vehicles?company_id=${companyId}&page=${page}&pageSize=${pageSize}&search=${search}&status=${status}`,
      ),
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: !!companyId,
  });

  // 2. Real-time Subscription
  useEffect(() => {
    if (!companyId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`fleet_vehicles_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicles",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: fleetKeys.vehicles(companyId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

export function useAddVehicle(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/fleet/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to create vehicle");
      }
      return res.json();
    },
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.vehicles(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateVehicle(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/fleet/vehicles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to update vehicle");
      }
      return res.json();
    },
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.vehicles(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteVehicle(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fleet/vehicles?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to delete vehicle");
      }
    },
    ...options,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: fleetKeys.vehicles(companyId) });
      const previous = qc.getQueryData(fleetKeys.vehicles(companyId));
      qc.setQueryData(fleetKeys.vehicles(companyId), (old: any[]) =>
        (old || []).filter((v) => v.id !== id),
      );
      return { previous };
    },
    onError: (err: any, id: any, ctx: any) => {
      qc.setQueryData(fleetKeys.vehicles(companyId), ctx?.previous);
      options?.onError?.(err, id, ctx);
    },
    onSettled: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.vehicles(companyId) });
      options?.onSettled?.(...args);
    },
    onSuccess: (...args: any[]) => {
      options?.onSuccess?.(...args);
    },
  });
}

// ─── DRIVERS ───────────────────────────────────────────────────────────────────

export type DriverParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export function useDrivers(companyId?: string, params: DriverParams = {}) {
  const qc = useQueryClient();
  const { page = 1, pageSize = 20, search = "", status = "all" } = params;

  const query = useQuery({
    queryKey: [...fleetKeys.drivers(companyId), page, pageSize, search, status],
    queryFn: () =>
      apiFetch<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/api/fleet/drivers?company_id=${companyId}&page=${page}&pageSize=${pageSize}&search=${search}&status=${status}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`fleet_drivers_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_assignments",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: fleetKeys.drivers(companyId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

export function useAddDriver(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/fleet/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to create driver assignment");
      }
      return res.json();
    },
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.drivers(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateDriver(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/fleet/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to update driver assignment");
      }
      return res.json();
    },
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.drivers(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteDriver(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fleet/drivers?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to delete driver assignment");
      }
    },
    ...options,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: fleetKeys.drivers(companyId) });
      const previous = qc.getQueryData(fleetKeys.drivers(companyId));
      qc.setQueryData(fleetKeys.drivers(companyId), (old: any[]) =>
        (old || []).filter((d) => d.id !== id),
      );
      return { previous };
    },
    onError: (err: any, id: any, ctx: any) => {
      qc.setQueryData(fleetKeys.drivers(companyId), ctx?.previous);
      options?.onError?.(err, id, ctx);
    },
    onSettled: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.drivers(companyId) });
      options?.onSettled?.(...args);
    },
    onSuccess: (...args: any[]) => {
      options?.onSuccess?.(...args);
    },
  });
}

// ─── MAINTENANCE ───────────────────────────────────────────────────────────────

export type MaintenanceParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
};

export function useMaintenance(companyId?: string, params: MaintenanceParams = {}) {
  const qc = useQueryClient();
  const { page = 1, pageSize = 20, search = "", type = "all" } = params;

  const query = useQuery({
    queryKey: [...fleetKeys.maintenance(companyId), page, pageSize, search, type],
    queryFn: () =>
      apiFetch<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/api/fleet/maintenance?company_id=${companyId}&page=${page}&pageSize=${pageSize}&search=${search}&type=${type}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`fleet_maintenance_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vehicle_maintenance",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: fleetKeys.maintenance(companyId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

export function useAddMaintenance(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/fleet/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to create maintenance record");
      }
      return res.json();
    },
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.maintenance(companyId) });
      // Also invalidate vehicles since maintenance changes vehicle status
      qc.invalidateQueries({ queryKey: fleetKeys.vehicles(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateMaintenance(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/fleet/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to update maintenance record");
      }
      return res.json();
    },
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.maintenance(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteMaintenance(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fleet/maintenance?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || "Failed to delete maintenance record");
      }
    },
    ...options,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: fleetKeys.maintenance(companyId) });
      const previous = qc.getQueryData(fleetKeys.maintenance(companyId));
      qc.setQueryData(fleetKeys.maintenance(companyId), (old: any[]) =>
        (old || []).filter((m) => m.id !== id),
      );
      return { previous };
    },
    onError: (err: any, id: any, ctx: any) => {
      qc.setQueryData(fleetKeys.maintenance(companyId), ctx?.previous);
      options?.onError?.(err, id, ctx);
    },
    onSettled: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: fleetKeys.maintenance(companyId) });
      options?.onSettled?.(...args);
    },
    onSuccess: (...args: any[]) => {
      options?.onSuccess?.(...args);
    },
  });
}

// ─── SUPPORT DATA ──────────────────────────────────────────────────────────────

export function useVehicleTypes() {
  return useQuery({
    queryKey: fleetKeys.vehicleTypes(),
    queryFn: () => apiFetch<any[]>("/api/fleet/vehicle-types").catch(() => []),
    staleTime: 5 * 60_000, // 5 min — vehicle types rarely change
  });
}

export function useEmployees(companyId?: string) {
  return useQuery({
    queryKey: fleetKeys.employees(companyId),
    queryFn: () =>
      apiFetch<any[]>(`/api/hr/employees?company_id=${companyId}`).catch(
        () => [],
      ),
    staleTime: 5 * 60_000,
    enabled: !!companyId,
  });
}

// ─── COLUMN DEFINITIONS ────────────────────────────────────────────────────────

export function useFleetColumnDefs(
  entity: "vehicles" | "drivers" | "maintenance",
  companyId: string | undefined,
) {
  return useQuery({
    queryKey: fleetKeys.columnDefs(entity, companyId ?? ""),
    queryFn: async () => {
      if (!companyId) return [];
      const res = await getFleetTableViewAction({
        companyId,
        table: entity,
        page: 1,
        pageSize: 1,
      });
      return res.success ? (res.data?.columnDefinitions ?? []) : [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60_000,
  });
}

export function useAddFleetColumn(
  entity: "vehicles" | "drivers" | "maintenance",
  companyId: string | undefined,
  options?: any,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      createFleetCustomFieldAction({ companyId: companyId!, ...payload }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({
        queryKey: fleetKeys.columnDefs(entity, companyId ?? ""),
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateFleetColumn(
  entity: "vehicles" | "drivers" | "maintenance",
  companyId: string | undefined,
  options?: any,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      updateFleetCustomFieldAction({
        companyId: companyId!,
        entityType: entity,
        ...payload,
      }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({
        queryKey: fleetKeys.columnDefs(entity, companyId ?? ""),
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteFleetColumn(
  entity: "vehicles" | "drivers" | "maintenance",
  companyId: string | undefined,
  options?: any,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: string) =>
      deleteFleetCustomFieldAction({ companyId: companyId!, fieldId }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({
        queryKey: fleetKeys.columnDefs(entity, companyId ?? ""),
      });
      options?.onSuccess?.(...args);
    },
  });
}
