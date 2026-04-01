import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrKeys, apiFetch } from "../utils/hr-constants";

export function useDepartments(companyId?: string) {
  const query = useQuery({
    queryKey: hrKeys.departments(companyId),
    queryFn: () =>
      apiFetch<any[]>(`/api/hr/departments?company_id=${companyId}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  return query;
}

export function useAddDepartment(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/hr/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.departments(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateDepartment(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/hr/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ...options,
    onMutate: async (variables: any) => {
      await qc.cancelQueries({ queryKey: hrKeys.departments(companyId) });
      const previousData = qc.getQueryData(hrKeys.departments(companyId));
      return { previousData };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        qc.setQueryData(hrKeys.departments(companyId), context.previousData);
      }
      options?.onError?.(err, variables, context);
    },
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.departments(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteDepartment(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/hr/departments?id=${id}`, { method: "DELETE" }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.departments(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}
