import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrKeys, apiFetch } from "../utils/hr-constants";

export function usePositions(companyId?: string) {
  const query = useQuery({
    queryKey: hrKeys.positions(companyId),
    queryFn: () => apiFetch<any[]>(`/api/hr/positions?company_id=${companyId}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  return query;
}

export function useAddPosition(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/hr/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.positions(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdatePosition(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      apiFetch("/api/hr/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ...options,
    onMutate: async (variables: any) => {
      await qc.cancelQueries({ queryKey: hrKeys.positions(companyId) });
      const previousData = qc.getQueryData(hrKeys.positions(companyId));
      return { previousData };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        qc.setQueryData(hrKeys.positions(companyId), context.previousData);
      }
      options?.onError?.(err, variables, context);
    },
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.positions(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeletePosition(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/hr/positions?id=${id}`, { method: "DELETE" }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.positions(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}
