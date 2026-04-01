import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrKeys, HR_CACHE_STALE_TIME, apiFetch } from "../utils/hr-constants";

export type EmployeeParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

// Data Fetching
export function useEmployees(companyId?: string, params: EmployeeParams = {}) {
  const { page = 1, pageSize = 50, search = "", status = "all" } = params;

  // Realtime subscription logic is completely stripped!
  // It is now handled by the global `useHRRealtime` hook perfectly safely.
  
  return useQuery({
    queryKey: [...hrKeys.employees(companyId), page, pageSize, search, status],
    queryFn: () =>
      apiFetch<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(
        `/api/hr/employees?companyId=${companyId}&page=${page}&pageSize=${pageSize}&search=${search}&status=${status}`,
      ),
    staleTime: HR_CACHE_STALE_TIME,
    enabled: !!companyId,
  });
}

export function useEmployee(companyId?: string, employeeId?: string) {
  return useQuery({
    queryKey: ["hr", "employee", companyId, employeeId],
    queryFn: () =>
      apiFetch<any>(
        `/api/hr/employees?companyId=${companyId}&id=${employeeId}`,
      ),
    enabled: !!companyId && !!employeeId,
    staleTime: HR_CACHE_STALE_TIME,
  });
}

// Optimistic Updates
export function useAddEmployee(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateEmployee(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/hr/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ...options,
    onMutate: async (variables: any) => {
      // Implement UI optimism so dashboard feels instantaneous
      await qc.cancelQueries({ queryKey: hrKeys.employees(companyId) });
      const previousData = qc.getQueryData(hrKeys.employees(companyId));
      return { previousData };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        qc.setQueryData(hrKeys.employees(companyId), context.previousData);
      }
      options?.onError?.(err, variables, context);
    },
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteEmployee(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/hr/employees?id=${id}`, { method: "DELETE" }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}
