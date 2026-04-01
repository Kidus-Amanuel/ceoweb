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

export const HR_CACHE_STALE_TIME = 30_000;
export const HR_CACHE_GC_TIME = 5 * 60_000;

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err?.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
