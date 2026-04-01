/**
 * HR React Query Hooks
 *
 * Centralizes all HR data fetching (Employees, Departments, Positions, Attendance, Leaves, Payroll) with:
 * - Real-time synchronization via Supabase channels
 * - Optimized caching and stale-time management
 * - Typed mutations for full CRUD operations
 * - Support for Custom Field Metadata (Virtual Columns)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createHRCustomFieldAction,
  updateHRCustomFieldAction,
  deleteHRCustomFieldAction,
} from "@/app/api/hr/hr-actions";

import { hrKeys, apiFetch, HR_CACHE_STALE_TIME } from "../utils/hr-constants";
export { hrKeys };

// ─── COLUMN DEFINITIONS ────────────────────────────────────────────────────────

export function useHrColumnDefs(entity: string, companyId: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: hrKeys.columnDefs(entity, companyId ?? ""),
    queryFn: async () => {
      if (!companyId) return [];
      // We fetch column definitions from a generic endpoint or a service action
      // For simplicity/consistency with fleet, I'll assume we have a similar helper or just inline the fetch
      const res = await fetch(
        `/api/hr/columns?entity=${entity}&company_id=${companyId}`,
      ).then((r) => r.json());
      return res || [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60_000,
  });
}

export function useAddHrColumn(
  entity: string,
  companyId: string | undefined,
  options?: any,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      createHRCustomFieldAction({
        companyId: companyId!,
        entityType: entity,
        ...payload,
      }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({
        queryKey: hrKeys.columnDefs(entity, companyId ?? ""),
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateHrColumn(
  entity: string,
  companyId: string | undefined,
  options?: any,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      updateHRCustomFieldAction({
        companyId: companyId!,
        entityType: entity,
        ...payload,
      }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({
        queryKey: hrKeys.columnDefs(entity, companyId ?? ""),
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteHrColumn(
  entity: string,
  companyId: string | undefined,
  options?: any,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: string) =>
      deleteHRCustomFieldAction({
        companyId: companyId!,
        fieldId,
        entityType: entity,
      }),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({
        queryKey: hrKeys.columnDefs(entity, companyId ?? ""),
      });
      options?.onSuccess?.(...args);
    },
  });
}

// ─── EMPLOYEES ──────────────────────────────────────────────────────────────────

export * from "./use-hr-employees";

// ─── DEPARTMENTS ───────────────────────────────────────────────────────────────

export * from "./use-hr-departments";

// ─── POSITIONS ──────────────────────────────────────────────────────────────────

export * from "./use-hr-positions";

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

export type AttendanceParams = {
  page?: number;
  pageSize?: number;
  employee_id?: string;
  start_date?: string;
  end_date?: string;
};

export function useAttendance(
  companyId?: string,
  params: AttendanceParams = {},
) {
  const qc = useQueryClient();
  const { page = 1, pageSize = 50, employee_id, start_date, end_date } = params;

  let url = `/api/hr/attendance?company_id=${companyId}&page=${page}&pageSize=${pageSize}`;
  if (employee_id) url += `&employee_id=${employee_id}`;
  if (start_date) url += `&start_date=${start_date}`;
  if (end_date) url += `&end_date=${end_date}`;

  const query = useQuery({
    queryKey: [
      ...hrKeys.attendance(companyId),
      page,
      pageSize,
      employee_id,
      start_date,
      end_date,
    ],
    queryFn: () =>
      apiFetch<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(url),
    staleTime: 30_000,
    enabled: !!companyId,
  });

  

  return query;
}

export function useAddAttendance(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.attendance(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateAttendance(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.attendance(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteAttendance(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/hr/attendance?id=${id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.attendance(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

// ─── LEAVES ────────────────────────────────────────────────────────────────────

export * from "./use-hr-leaves";

// ─── LEAVE TYPES ───────────────────────────────────────────────────────────────

export function useLeaveTypes(companyId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: hrKeys.leaveTypes(companyId),
    queryFn: () =>
      apiFetch<any[]>(`/api/hr/leave-types?company_id=${companyId}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  

  return query;
}

export function useAddLeaveType(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/leave-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.leaveTypes(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateLeaveType(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/leave-types", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.leaveTypes(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteLeaveType(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/hr/leave-types?id=${id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.leaveTypes(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

// ─── PAYROLL ───────────────────────────────────────────────────────────────────

export function usePayrollRuns(companyId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: hrKeys.payrollRuns(companyId),
    queryFn: () =>
      apiFetch<any[]>(`/api/hr/payroll-runs?company_id=${companyId}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  

  return query;
}

export function useAddPayrollRun(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/payroll-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.payrollRuns(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdatePayrollRun(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/payroll-runs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.payrollRuns(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function usePayslips(companyId?: string, runId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: hrKeys.payslips(runId),
    queryFn: () =>
      apiFetch<any[]>(
        `/api/hr/payslips?company_id=${companyId}&payroll_run_id=${runId || ""}`,
      ),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  

  return query;
}

export function useRoles(companyId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: hrKeys.roles(companyId),
    queryFn: () => apiFetch<any[]>(`/api/hr/roles?company_id=${companyId}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  return query;
}

export function useRolePermissions(roleId?: string) {
  return useQuery({
    queryKey: hrKeys.rolePermissions(roleId),
    queryFn: () =>
      apiFetch<any[]>(`/api/hr/role-permissions?role_id=${roleId}`),
    staleTime: 60_000,
    enabled: !!roleId,
  });
}

export function useAddRole(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.roles(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateRole(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.roles(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteRole(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/hr/roles?id=${id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.roles(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateRolePermissions(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      permissions,
    }: {
      roleId: string;
      permissions: any[];
    }) =>
      fetch(`/api/hr/role-permissions?role_id=${roleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (data: any, variables: any, context: any) => {
      qc.invalidateQueries({
        queryKey: hrKeys.rolePermissions(variables.roleId),
      });
      qc.invalidateQueries({ queryKey: hrKeys.roles(companyId) });
      options?.onSuccess?.(data, variables, context);
    },
  });
}
