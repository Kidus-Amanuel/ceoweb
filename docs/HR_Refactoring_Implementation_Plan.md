# HR Module Refactoring Implementation Plan

Based on the detailed `HR_test_report.md` analysis, here is the comprehensive, production-ready refactoring strategy that addresses the architectural bottlenecks, massive payload overheads, and code organization issues while preserving backward compatibility.

## 1. Refactored Folder Structure

To resolve the monolithic structures scattered across the codebase, implement a clean, domain-driven module structure:

```text
app/
 ├── (dashboard)/hr/
 │    ├── page.tsx                     # Thin Dashboard Orchestrator
 │    └── employees/
 │         ├── page.tsx                # Thin Employees Orchestrator
 │         └── components/             # Broken down UI Components
 │              ├── EmployeesHeader.tsx
 │              ├── EmployeesTable.tsx
 │              └── EmployeeFormSlideOut.tsx
 │
 ├── api/hr/
 │    └── employees/route.ts           # Clean, thin API wrapper
 │
hooks/use-hr/                          # Replaces 1,019-line use-hr.ts
 ├── index.ts                          # Barrel export
 ├── use-employees.ts                  # Employee specific queries/mutations
 ├── use-departments.ts
 └── use-hr-realtime.ts                # Consolidated realtime subscriptions
 │
services/hr/                           # NEW: Isolated Business Logic
 ├── employee.service.ts
 └── types.ts                          # ServiceResult<T> definitions
 │
utils/hr/
 └── custom-fields-mapper.ts           # Reusable mapping logic
 │
validators/
 └── hr.validator.ts                   # Centralized Zod Schemas
```

---

## 2. Service Layer Implementation

The Service Layer manages all business logic, removing it from API routes. Implement predictable responses using a standard `ServiceResult<T>` pattern.

```typescript
// services/hr/types.ts
export type ServiceResult<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string; status?: number };

// services/hr/employee.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { HrCreateEmployeeSchema, HrUpdateEmployeeSchema } from '@/validators/hr.validator';
import { ServiceResult } from './types';
import { HRCustomFieldMapper } from '@/utils/hr/custom-fields-mapper';

export const employeeService = {
  async listRows({ 
    supabase, companyId, page = 1, pageSize = 25, search, status 
  }: { 
    supabase: SupabaseClient; companyId: string; page?: number; pageSize?: number; search?: string; status?: string 
  }): Promise<ServiceResult<{ data: any[]; total: number }>> {
    
    if (!companyId) return { error: "Company ID is required", status: 400 };

    let query = supabase
      .from("employees")
      .select("*, department:departments(id, name), position:positions(id, title)", { count: 'exact' })
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    if (status && status !== "all") query = query.eq("status", status);

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);

    if (error) return { error: error.message, status: 500 };

    return { data: { data, total: count || 0 } };
  },

  async createRow({ 
    supabase, companyId, payload 
  }: { 
    supabase: SupabaseClient; companyId: string; payload: unknown 
  }): Promise<ServiceResult<any>> {
    // 1. Zod Validation
    const validated = HrCreateEmployeeSchema.safeParse(payload);
    if (!validated.success) {
      return { error: validated.error.errors[0].message, status: 400 };
    }

    const insertPayload = { 
      ...validated.data, 
      company_id: companyId,
      custom_fields: HRCustomFieldMapper.sanitizeCustomFields(validated.data.custom_fields)
    };

    // 2. Database Operation
    const { data, error } = await supabase
      .from("employees")
      .insert(insertPayload)
      .select()
      .single();

    if (error) return { error: error.message, status: 500 };
    return { data };
  }
};
```

---

## 3. API Route Refactor Example

**❌ BEFORE (Fragile, Bloated, Unvalidated):**
```typescript
// app/api/hr/employees/route.ts
export async function POST(req: Request) {
  const body = await req.json(); // Unsafe any
  const { data, error } = await supabase
    .from("employees")
    .insert({ ...body, company_id: companyId }) // No validation, SQL Injection risk for JSONB
    .select()
    .single();
    
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
}
```

**✅ AFTER (Secure, Thin Wrapper):**
```typescript
// app/api/hr/employees/route.ts
import { employeeService } from '@/services/hr/employee.service';
import { getFleetAuthContext } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const auth = await getFleetAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  
  const result = await employeeService.createRow({
    supabase: auth.supabase,
    companyId: auth.companyId,
    payload: body
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 });
  }

  return NextResponse.json(result.data);
}
```

---

## 4. Realtime Optimization

Replaces 13 individual connection setups with a single master hook utilizing smart schema filtering.

```typescript
// hooks/use-hr/use-hr-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

type HRTables = 'employees' | 'departments' | 'leaves' | 'payroll_runs';

export function useHRRealtime(companyId: string | undefined, tablesToWatch: HRTables[] = []) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!companyId || tablesToWatch.length === 0) return;
    
    const supabase = createClient();
    // Using RegExp-like filter to watch only requested tables using Supabase's table filters
    const tableFilter = tablesToWatch.join('|');

    const channel = supabase
      .channel(`hr-master-${companyId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        // Smart query invalidation only if the updated table is in our watch list
        if (tablesToWatch.includes(payload.table as HRTables)) {
           // Standardize your query keys to efficiently invalidate
           qc.invalidateQueries({ queryKey: ['hr', payload.table, companyId] });
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [companyId, JSON.stringify(tablesToWatch), qc]);
}
```
**Usage:** `useHRRealtime(companyId, ['employees', 'departments']);`

---

## 5. Hook Refactoring

Splitting up `use-hr.ts` into individual modular spaces, applying correct `staleTime` and Optimistic UI.

```typescript
// hooks/use-hr/use-employees.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrKeys, HR_CACHE_STALE_TIME } from '@/utils/hr/constants';

// Data Fetching
export function useEmployees(companyId: string, params: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: hrKeys.employeesList(companyId, params),
    queryFn: async () => {
      const qs = new URLSearchParams(params as any).toString();
      const res = await fetch(`/api/hr/employees?${qs}`);
      if (!res.ok) throw new Error('Failed to fetch employees');
      return res.json();
    },
    enabled: !!companyId,
    staleTime: HR_CACHE_STALE_TIME, // e.g., 60_000 (1 minute) Request deduplication!
  });
}

// Optimistic Updates
export function useUpdateEmployee(companyId: string) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/hr/employees/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onMutate: async (updatedEmployee) => {
      await qc.cancelQueries({ queryKey: hrKeys.employees(companyId) });
      const previousData = qc.getQueryData(hrKeys.employees(companyId));
      
      // Optimitic update logic
      qc.setQueryData(hrKeys.employees(companyId), (old: any) => ({
        ...old,
        data: old?.data?.map((emp: any) => emp.id === updatedEmployee.id ? { ...emp, ...updatedEmployee } : emp)
      }));

      return { previousData };
    },
    onError: (err, variables, context) => {
      qc.setQueryData(hrKeys.employees(companyId), context?.previousData);
      // Fire error toast here
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
    }
  });
}
```

---

## 6. Component Refactor Example

Refactoring `employees/page.tsx` from ~977 lines down to an orchestrator component (~100 lines).

```tsx
// app/(dashboard)/hr/employees/page.tsx
"use client";

import { useCompanyContext } from '@/context/company-context';
import { useEmployees } from '@/hooks/use-hr/use-employees';
import { useHRRealtime } from '@/hooks/use-hr/use-hr-realtime';
import EmployeesTable from './components/EmployeesTable';
import EmployeesHeader from './components/EmployeesHeader';

export default function EmployeesPage() {
  const { companyId } = useCompanyContext(); // Removes prop drilling
  const { data, isLoading } = useEmployees(companyId);
  
  // Single web socket connection tailored to this view
  useHRRealtime(companyId, ['employees', 'departments']);

  return (
    <div className="flex flex-col space-y-6 p-6">
      <EmployeesHeader />
      
      {isLoading ? (
        <TableSkeleton /> 
      ) : (
        <EmployeesTable data={data?.data} total={data?.total} />
      )}
    </div>
  );
}
```

---

## 7. Custom Fields Utility

Creating a rugged schema and utility mapper to replace duplicated lines `430-580`.

```typescript
// utils/hr/custom-fields-mapper.ts
export class HRCustomFieldMapper {
  private static standardEmployeeKeys = [
    "first_name", "last_name", "email", "employee_code", 
    "department_id", "status"
  ];

  /**
   * Separates a flat UI form payload into standard DB columns and a JSONB custom_fields payload.
   */
  static splitPayload(uiPayload: Record<string, any>) {
    const standardPayload: Record<string, any> = {};
    const customFields: Record<string, any> = {};

    Object.keys(uiPayload).forEach((key) => {
      if (this.standardEmployeeKeys.includes(key)) {
        standardPayload[key] = uiPayload[key];
      } else {
        customFields[key] = uiPayload[key];
      }
    });

    return { standardPayload, customFields };
  }

  /**
   * Deep merges current custom fields gracefully avoiding overwrites
   */
  static mergeForUpdate(existingCustomData: Record<string, any> = {}, newCustomData: Record<string, any> = {}) {
    return { ...existingCustomData, ...newCustomData };
  }

  static sanitizeCustomFields(fields?: Record<string, any>) {
     // Optional: Add logic here to parse unwieldy objects like nested currencies if the UI sends them
     return fields || {};
  }
}
```

---

## 8. Performance Improvements

**1. Memoization of Heavy Computations**
```tsx
// Avoid shallow array dependency rendering (fixes lines 206-218 in report)
const mappedEmployees = useMemo(() => {
  return employees.map((e) => ({ 
    ...e, 
    customValues: HRCustomFieldMapper.sanitizeCustomFields(e.custom_fields) 
  }));
}, [employees.length, employees[0]?.updated_at]); // Stable dependencies
```

**2. React Query Constants (`utils/hr/constants.ts`)**
```typescript
export const HR_CACHE_STALE_TIME = 60_000; // 1 minute
export const HR_CACHE_GC_TIME = 5 * 60_000; // 5 minutes

export const hrKeys = {
  all: ['hr'] as const,
  employees: (companyId: string) => [...hrKeys.all, 'employees', companyId] as const,
  employeesList: (companyId: string, filters: any) => [...hrKeys.employees(companyId), { filters }] as const,
};
```

---

## 9. Migration Plan (Zero-Downtime Rollout Strategy)

**Phase 1: Foundation (Zero Risk)**
- Introduce `Zod` schemas in `validators/hr.validator.ts`.
- Introduce `ServiceResult<T>` and create `employee.service.ts` alongside existing API code.
- Implement `HRCustomFieldMapper` utility. Add Jest tests to ensure output exactly matches the current inline payload behavior.

**Phase 2: Hooks & Infrastructure (Low Risk)**
- Construct `hooks/use-hr/*` files. Route them through the existing API.
- Switch to the new `useHRRealtime` master subscription, confirming it invalidates correctly without breaking components.
- Delete the 13 legacy subscriptions inside the giant `use-hr.ts` file.

**Phase 3: Service Layer Over API (Medium Risk)**
- Gradually replace API direct Queries: Rewrite the `employees/route.ts` API route fully utilizing `employee.service.ts`.
- Push to staging environment. Run payload verifications to ensure the JSON contracts between the front end and backend did not shift. 

**Phase 4: Component Decoupling (Medium Risk)**
- Break the 977-line `employees/page.tsx` into smaller components.
- Swap over to modular `use-employees.ts` hooks instead of importing the monolithic `use-hr.ts` hook. 
- Implement Context API (`useCompanyContext`) to drop prop drilling.

**Phase 5: Cleanup & Monitoring**
- Delete the old `hooks/use-hr.ts`.
- Ensure React strict mode doesn't reveal any multiple-render logic.
- Add Datadog/Sentry log wrappers to the new `ServiceResult<T>` error catchers to observe new API failures or Zod Validation traps that were previously unhandled gracefully.
