import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrKeys, HR_CACHE_STALE_TIME, apiFetch } from "../utils/hr-constants";

export type LeaveParams = {
  page?: number;
  pageSize?: number;
  employee_id?: string;
  status?: string;
  search?: string;
};

// Data Fetching
export function useLeaves(companyId?: string, params: LeaveParams = {}) {
  const { page = 1, pageSize = 50, employee_id, status, search = "" } = params;

  let url = `/api/hr/leaves?companyId=${companyId}&page=${page}&pageSize=${pageSize}`;
  if (employee_id) url += `&employee_id=${employee_id}`;
  if (status) url += `&status=${status}`;
  if (search) url += `&search=${search}`;

  return useQuery({
    queryKey: [
      ...hrKeys.leaves(companyId),
      page,
      pageSize,
      employee_id,
      status,
      search,
    ],
    queryFn: () =>
      apiFetch<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(url),
    staleTime: HR_CACHE_STALE_TIME,
    enabled: !!companyId,
  });
}

// Optimistic Updates
export function useAddLeave(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.leaves(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateLeave(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/hr/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ...options,
    onMutate: async (variables: any) => {
      await qc.cancelQueries({ queryKey: hrKeys.leaves(companyId) });
      const previousData = qc.getQueryData(hrKeys.leaves(companyId));
      return { previousData };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        qc.setQueryData(hrKeys.leaves(companyId), context.previousData);
      }
      options?.onError?.(err, variables, context);
    },
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.leaves(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteLeave(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/hr/leaves?id=${id}`, { method: "DELETE" }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.leaves(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}
