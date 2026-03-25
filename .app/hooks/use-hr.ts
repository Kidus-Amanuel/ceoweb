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

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const hrKeys = {
  all: ["hr"] as const,
  employees: (companyId?: string) =>
    ["hr", "employees", companyId || "global"] as const,
  departments: (companyId?: string) =>
    ["hr", "departments", companyId || "global"] as const,
  positions: (companyId?: string) =>
    ["hr", "positions", companyId || "global"] as const,
  attendance: (companyId?: string) =>
    ["hr", "attendance", companyId || "global"] as const,
  leaves: (companyId?: string) =>
    ["hr", "leaves", companyId || "global"] as const,
  leaveTypes: (companyId?: string) =>
    ["hr", "leave-types", companyId || "global"] as const,
  payrollRuns: (companyId?: string) =>
    ["hr", "payroll-runs", companyId || "global"] as const,
  payslips: (runId?: string) => ["hr", "payslips", runId || "all"] as const,
  roles: (companyId?: string) =>
    ["hr", "roles", companyId || "global"] as const,
  rolePermissions: (roleId?: string) =>
    ["hr", "role-permissions", roleId || "all"] as const,
  columnDefs: (entity: string, companyId: string) =>
    ["hr", "column-defs", entity, companyId] as const,
};

// ─── Generic fetch helper ───────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

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

export type EmployeeParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export function useEmployees(companyId?: string, params: EmployeeParams = {}) {
  const qc = useQueryClient();
  const { page = 1, pageSize = 50, search = "", status = "all" } = params;

  const query = useQuery({
    queryKey: [...hrKeys.employees(companyId), page, pageSize, search, status],
    queryFn: () =>
      apiFetch<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(
        `/api/hr/employees?company_id=${companyId}&page=${page}&pageSize=${pageSize}&search=${search}&status=${status}`,
      ),
    staleTime: 30_000,
    enabled: !!companyId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_employees_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employees",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

export function useEmployee(companyId?: string, employeeId?: string) {
  return useQuery({
    queryKey: ["hr", "employee", companyId, employeeId],
    queryFn: () =>
      apiFetch<any>(
        `/api/hr/employees?company_id=${companyId}&id=${employeeId}`,
      ),
    enabled: !!companyId && !!employeeId,
    staleTime: 30_000,
  });
}

export function useAddEmployee(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
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
      fetch("/api/hr/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
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
      fetch(`/api/hr/employees?id=${id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

// ─── DEPARTMENTS ───────────────────────────────────────────────────────────────

export function useDepartments(companyId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: hrKeys.departments(companyId),
    queryFn: () =>
      apiFetch<any[]>(`/api/hr/departments?company_id=${companyId}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_departments_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "departments",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.departments(companyId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

export function useAddDepartment(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
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
      fetch("/api/hr/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
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
      fetch(`/api/hr/departments?id=${id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.departments(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

// ─── POSITIONS ──────────────────────────────────────────────────────────────────

export function usePositions(companyId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: hrKeys.positions(companyId),
    queryFn: () => apiFetch<any[]>(`/api/hr/positions?company_id=${companyId}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_positions_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "positions",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.positions(companyId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

export function useAddPosition(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
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
      fetch("/api/hr/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
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
      fetch(`/api/hr/positions?id=${id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.positions(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

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

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_attendance_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.attendance(companyId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

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

export type LeaveParams = {
  page?: number;
  pageSize?: number;
  employee_id?: string;
  status?: string;
  search?: string;
};

export function useLeaves(companyId?: string, params: LeaveParams = {}) {
  const qc = useQueryClient();
  const { page = 1, pageSize = 50, employee_id, status, search = "" } = params;

  let url = `/api/hr/leaves?company_id=${companyId}&page=${page}&pageSize=${pageSize}`;
  if (employee_id) url += `&employee_id=${employee_id}`;
  if (status) url += `&status=${status}`;
  if (search) url += `&search=${search}`;

  const query = useQuery({
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
    staleTime: 30_000,
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_leaves_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leaves",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.leaves(companyId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

  return query;
}

export function useAddLeave(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
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
      fetch("/api/hr/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
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
      fetch(`/api/hr/leaves?id=${id}`, { method: "DELETE" }).then((r) =>
        r.json(),
      ),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.leaves(companyId) });
      options?.onSuccess?.(...args);
    },
  });
}

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

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_leave_types_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_types",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.leaveTypes(companyId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

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

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_payroll_runs_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payroll_runs",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.payrollRuns(companyId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

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

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_payslips_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payslips",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.payslips(runId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc, runId]);

  return query;
}

export function useAddPayslip(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.payslips() });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdatePayslip(companyId?: string, options?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      fetch("/api/hr/payslips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    ...options,
    onSuccess: (...args: any[]) => {
      qc.invalidateQueries({ queryKey: hrKeys.payslips() });
      options?.onSuccess?.(...args);
    },
  });
}

// ─── ROLES & PERMISSIONS ───────────────────────────────────────────────────────

export function useRoles(companyId?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: hrKeys.roles(companyId),
    queryFn: () => apiFetch<any[]>(`/api/hr/roles?company_id=${companyId}`),
    staleTime: 60_000,
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`hr_roles_${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roles",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: hrKeys.roles(companyId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, qc]);

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
