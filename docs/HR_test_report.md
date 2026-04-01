HR Module Dependency-Aware Code Review
Dependency Graph
HR Module Entry Point: app/(dashboard)/hr/
│
├── Layout (layout.tsx)
│ └── AuthGuard component (auth protection)
│
├── Dashboard Page (page.tsx) - 474 lines
│ ├── Hooks
│ │ ├── useTranslation (react-i18next)
│ │ ├── useRouter (next/navigation)
│ │ ├── useCompanies (hooks/use-companies)
│ │ ├── useEmployees (hooks/use-hr)
│ │ ├── usePayrollRuns (hooks/use-hr)
│ │ ├── useLeaves (hooks/use-hr)
│ │ ├── useDepartments (hooks/use-hr)
│ │ └── useNotifications (hooks/useNotifications)
│ ├── UI Components
│ │ ├── Badge (shared/ui/badge)
│ │ ├── StatCard (internal component)
│ │ └── Lucide Icons (23 icons imported)
│ └── Utils
│ ├── fmtCurrency (local helper)
│ ├── fmtDate (local helper)
│ └── timeAgo (local helper)
│
├── Employees Page (employees/page.tsx) - 977 lines
│ ├── Hooks (15 custom hooks)
│ │ ├── useRouter, useTranslation
│ │ ├── useCompanies
│ │ ├── useEmployees, useAddEmployee, useUpdateEmployee, useDeleteEmployee
│ │ ├── useDepartments, usePositions
│ │ ├── useHrColumnDefs, useAddHrColumn, useUpdateHrColumn, useDeleteHrColumn
│ │ ├── useLeaves, useAddLeave, useUpdateLeave, useDeleteLeave
│ │ └── useLeaveTypes, useAddLeaveType, useUpdateLeaveType, useDeleteLeaveType
│ ├── UI Components
│ │ ├── EditableTable (shared/table - complex component)
│ │ ├── Button, Badge, Input (shared/ui)
│ │ ├── FleetTableSkeleton (shared/ui/skeleton)
│ │ └── Framer Motion (AnimatePresence, motion)
│ └── Utils
│ ├── calculateDays (table-utils)

│ └── toast (hooks/use-toast)
│
└── HR Hooks Layer (hooks/use-hr.ts) - 1,019 lines
├── React Query (useQuery, useMutation, useQueryClient)
├── Supabase Realtime Subscriptions (13 separate channels)
├── API Fetch Helper (generic wrapper)
└── API Routes (14 endpoints)
├── /api/hr/employees (route.ts)
├── /api/hr/departments (route.ts)
├── /api/hr/positions (route.ts)
├── /api/hr/attendance (route.ts)
├── /api/hr/leaves (route.ts)
├── /api/hr/leave-types (route.ts)
├── /api/hr/payroll-runs (route.ts)
├── /api/hr/payslips (route.ts)
├── /api/hr/roles (route.ts)
├── /api/hr/role-permissions (route.ts)
├── /api/hr/columns (route.ts)
└── /api/hr/hr-actions.ts (Server Actions)
Backend Layer:
│
├── API Routes (employees/route.ts + 13 others)
│ ├── Auth: getFleetAuthContext (lib/auth/api-auth)
│ ├── Supabase Server Client
│ └── Direct Supabase Queries (no service layer)
│
└── Service Layer (services/hr.service.ts) - 244 lines
├── Custom Field Management Only
├── Metadata Normalization
└── Company Settings JSONB Manipulation

Critical Issues
1. ARCHITECTURE: Bypassing Service Layer 🔴
Location: app/api/hr/employees/route.ts (and all other HR API routes)
All API routes directly query Supabase instead of using a service layer:
// app/api/hr/employees/route.ts:21-
const { data, error } = await supabase
.from("employees")

.select(*, department:departments (id, name), position:positions (id, title), leaves:leaves (...))
.eq("id", id)
.eq("company_id", companyId)
.is("deleted_at", null)
.single();
Problems:

Business logic scattered across 14 different route files
No consistent validation
Duplicate query patterns
Difficult to test
No centralized error handling
Compare to AI Agent: The AI agent properly uses readModuleData service, but HR doesn't
follow this pattern.
2. PERFORMANCE: Massive Hooks File 🔴
Location: hooks/use-hr.ts - 1,019 lines
Single monolithic hook file contains:
13 separate Supabase realtime subscriptions
43 exported functions
Duplicate useEffect patterns (13 times)
No code splitting
Impact:
Every HR page imports entire 1,019 line file
13 WebSocket connections per component
Cannot tree-shake unused hooks
~40KB bundle size just for hooks
3. PERFORMANCE: 13 Simultaneous WebSocket Connections 🔴
Location: hooks/use-hr.ts (multiple useEffect blocks)
Each hook creates its own Supabase realtime channel:
// Lines 176-197, 275-296, 361-382, 478-499, 592-613, 679-700, 766-787, 838-859, 909-
useEffect(() => {
if (!companyId) return;
const supabase = createClient();
const channel = supabase
.channel(hr_employees_${companyId})
.on("postgres_changes", {...}, () => {
qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
})
.subscribe();
return () => { supabase.removeChannel(channel); };
}, [companyId, qc]);
Problems:

13 WebSocket connections for a single page (employees page uses 6+ hooks)
Each connection has overhead (~2-5KB/connection)
Redundant invalidations (multiple hooks invalidate on same table change)
Network congestion on slow connections
4. PERFORMANCE: Massive Component Files 🟠
employees/page.tsx: 977 lines (should be ~300-400 max)
page.tsx: 474 lines (dashboard)
Problems:
Difficult to review and maintain
Complex state management (11 useState hooks in employees page)
Missing component extraction
Heavy initial bundle load
5. DATA FLOW: Inconsistent Custom Fields Handling 🟠
Location: employees/page.tsx:430-506 and employees/page.tsx:508-
Custom fields mapping is complex and duplicated:
// Lines 430-506: handleUpdate
const customData = updatedFields.customValues || {};
const standardKeys = view === "list"? [...] : view === "leaves"? [...] : [...];
Object.keys(updatedFields).forEach((key) => {
if (standardKeys.includes(key)) { /* map standard */ }
});
const mergedCustom = { ...(existing?.custom_fields || {}), ...customData };
Problems:
Same logic duplicated in handleAdd (lines 508-580)
No validation before merging
Fragile hardcoded field lists
Currency object handling buried in mapping logic
**Performance Improvements
Split Hooks File (HIGH IMPACT)**
Current: 1,019 line monolithic file
Target: Multiple focused files
// hooks/use-hr/index.ts (re-export barrel)
export * from './employees';
export * from './departments';
export * from './leaves';
export * from './payroll';
export * from './realtime';
// hooks/use-hr/employees.ts (~150 lines)
export function useEmployees(companyId, params) { ... }
export function useEmployee(companyId, employeeId) { ... }
// ... employee-specific hooks only
// hooks/use-hr/realtime.ts (centralized subscriptions)
export function useHRRealtime(companyId, tables: string[]) {
// Single subscription with table filter
}
**Benefits:
Tree-shaking: Load only needed hooks
Reduced bundle: ~20KB savings per page
Better code organization
Easier to test individual modules
Consolidate Realtime Subscriptions (HIGH IMPACT)**
Current: 13 separate WebSocket connections
Target: 1-2 connections with smart filtering
// hooks/use-hr/realtime.ts
export function useHRRealtime(
companyId: string,
config: { employees?: boolean; departments?: boolean; leaves?: boolean }
) {
const qc = useQueryClient();
useEffect(() => {
if (!companyId) return;
const supabase = createClient();
const tables = Object.keys(config).filter(k => config[k]);
const channel = supabase
.channel(hr_${companyId})
.on("postgres_changes", {
event: "*",
schema: "public",
table: tables.join('|'), // Filter pattern
filter: company_id=eq.${companyId}
}, (payload) => {
// Smart invalidation based on table
if (payload.table === 'employees') {
qc.invalidateQueries({ queryKey: hrKeys.employees(companyId) });
}
// ... other tables
})
.subscribe();
return () => { supabase.removeChannel(channel); };
}, [companyId, JSON.stringify(config), qc]);
}
// Usage in component
useHRRealtime(companyId, { employees: true, departments: true, leaves: true });
Benefits:

**- 1 WebSocket connection instead of 13

~90% reduction in connection overhead
Simpler cleanup logic
Better resource management
Extract Employees Page Sub-components (MEDIUM IMPACT)**
Current: 977-line monolithic component
Target: Composition of focused components
// employees/page.tsx (main orchestrator ~150 lines)
export default function EmployeesPage() {
return (

); } // employees/components/EmployeesHeader.tsx (~200 lines) // employees/components/EmployeesTable.tsx (~400 lines) // employees/components/EmployeesFooter.tsx (~50 lines) // employees/utils/customFieldsMapper.ts (extract mapping logic) **Benefits:**
**- Easier code review

Component reusability
Independent testing
Clearer separation of concerns
Memoize Expensive Computations (MEDIUM IMPACT)**
Location: employees/page.tsx:206-218, page.tsx:179-
// Current: Recomputes on every render
const mappedEmployees = useMemo(
() => employees.map((e) => ({ ...e, customValues: e.custom_fields || {} })),
[employees],
);
// Problem: Shallow dependency, triggers even when employees array ref changes but data
hasn't
Improvement:
// Use stable reference comparison
const mappedEmployees = useMemo(
() => employees.map((e) => ({ ...e, customValues: e.custom_fields || {} })),
[employees.length, employees[0]?.updated_at] // Stable keys
);
// Or use react-tracked / immer for deep comparison
5. Implement Request Deduplication (LOW IMPACT)
Location: hooks/use-hr.ts API calls
// Current: Multiple components can trigger same fetch
export function useEmployees(companyId, params) {
return useQuery({
queryKey: [...hrKeys.employees(companyId), page, pageSize, search, status],
queryFn: () => apiFetch(...),
staleTime: 30_000,
});
}
// Problem: If 2 components mount simultaneously, 2 requests fire
Improvement:
// React Query already deduplicates by default, but increase staleTime
staleTime: 60_000, // 1 minute instead of 30 seconds
gcTime: 5 * 60_000, // Keep in cache for 5 minutes

Architecture Improvements
1. Create Service Layer for HR Operations (CRITICAL)
Current: Direct Supabase queries in API routes
Target: Consistent service layer like other modules
// services/hr/employee.service.ts
export const employeeService = {
async listRows({ supabase, companyId, page, pageSize, search, status }):
Promise<ServiceResult<...>> {
// Validation
if (!companyId) return { error: "Company ID required" };
// Business logic
const today = new Date().toISOString().split("T")[0];
// Query construction
let query = supabase.from("employees")
.select("*, department:departments(...), position:positions(...)")
.eq("company_id", companyId)
.is("deleted_at", null);
if (search) query = query.or(first_name.ilike.%${search}%,...);

if (status !== "all") query = query.eq("status", status);
const from = (page - 1) * pageSize;
const { data, error, count } = await query.range(from, from + pageSize - 1);
if (error) return { error: error.message };
// Enrichment
const enriched = data.map(emp => ({
...emp,
on_active_leave: /* calculation */
}));
return { data: { data: enriched, total: count, page, pageSize } };
},
async createRow({ supabase, companyId, payload }): Promise<ServiceResult<...>> {
// Validation with Zod
const validated = HrCreateEmployeeSchema.parse(payload);
// Generate employee code if missing
if (!validated.employee_code) {
validated.employee_code = await generateEmployeeCode(supabase, companyId);
}
// Insert
const { data, error } = await supabase
.from("employees")
.insert({ ...validated, company_id: companyId })
.select()
.single();
if (error) return { error: error.message };
return { data };
},
// ... updateRow, deleteRow, etc.
};
API Route becomes thin:
// app/api/hr/employees/route.ts
export async function GET(req: Request) {
const auth = await getFleetAuthContext();
if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const { searchParams } = new URL(req.url);
const params = {
page: parseInt(searchParams.get("page") || "1"),
pageSize: parseInt(searchParams.get("pageSize") || "50"),
search: searchParams.get("search") || "",
status: searchParams.get("status") || "all",
};
const result = await employeeService.listRows({
supabase: auth.supabase,
companyId: auth.companyId,
...params,
});
if (result.error) {
return NextResponse.json({ error: result.error }, { status: 400 });
}
return NextResponse.json(result.data);
}
Benefits:

Consistent validation across all endpoints
Testable business logic
Reusable across API routes and server actions
Follows existing CRM/Fleet patterns
2. Extract Custom Fields Logic to Utility (HIGH PRIORITY)
Location: employees/page.tsx:430-580 (duplicated mapping)
// utils/hr-custom-fields.ts
export class HRCustomFieldMapper {
private standardFieldsByEntity: Record<string, string[]> = {
employees: ["first_name", "last_name", "email", "employee_code", "department_id", ...],
leaves: ["leave_type_id", "start_date", "end_date", "days_taken", ...],
leave_types: ["name", "paid", "days_per_year", "carry_over"],
};
mapForUpdate(entityType: string, updatedFields: any, existingData: any) {
const payload: any = { id: updatedFields.id };
const standardKeys = this.standardFieldsByEntity[entityType];
// Map standard fields
Object.keys(updatedFields).forEach(key => {
if (standardKeys.includes(key)) {
let val = updatedFields[key];
// Handle currency objects
if (val && typeof val === "object" && "amount" in val) {
val = val.amount;
}
payload[key] = val;
}
});
// Merge custom fields
const customData = updatedFields.customValues || {};
payload.custom_fields = {
...(existingData?.custom_fields || {}),
...customData,
};
return payload;
}
mapForCreate(entityType: string, newItem: any, companyId: string) {
// Similar logic
}
}
// Usage in component
const mapper = new HRCustomFieldMapper();
const handleUpdate = async (id: string, updatedFields: any) => {
const existing = employees.find(e => e.id === id);
const payload = mapper.mapForUpdate("employees", updatedFields, existing);
await updateEmp.mutateAsync(payload);
};

3. Implement Zod Validation (MEDIUM PRIORITY)
Current: No validation before API calls
Target: Type-safe validation with Zod
// validators/hr.ts (add to existing file)
export const HrCreateEmployeeSchema = z.object({
first_name: z.string().min(1, "First name required"),
last_name: z.string().min(1, "Last name required"),

email: z.string().email().optional(),
employee_code: z.string().optional(),
department_id: z.string().uuid().optional(),
position_id: z.string().uuid().optional(),
status: z.enum(["active", "on_leave", "terminated"]).default("active"),
basic_salary: z.number().positive().optional(),
hire_date: z.string().date().optional(),
custom_fields: z.record(z.any()).optional(),
});
export const HrUpdateEmployeeSchema = HrCreateEmployeeSchema.partial().extend({
id: z.string().uuid(),
});

Security Risks

1. Missing Input Validation 🔴
Location: All API routes (e.g., app/api/hr/employees/route.ts:104-122)
// POST handler
const body = await req.json();
const { data, error } = await supabase
.from("employees")
.insert({ ...body, company_id: companyId }) // No validation!
.select()
.single();
Risks:

Users can inject arbitrary fields
Type coercion vulnerabilities
Could bypass required field checks
Potential JSONB injection in custom_fields
Fix: Use Zod validation before database operations.
2. No Rate Limiting 🟠
Location: All API routes
No rate limiting on HR endpoints. Users could:
Spam employee creation
Export massive datasets
DoS the API
Fix: Add rate limiting middleware (same as needed for AI agent).
3. Soft Delete Not Cascade Checked 🟠
Location: app/api/hr/employees/route.ts:150-
// DELETE handler
const { error } = await supabase
.from("employees")
.update({ deleted_at: new Date().toISOString() })
.eq("id", id)
.eq("company_id", companyId);
Problem: No check for dependent records (leaves, attendance, payroll).
Deleting an employee with active leaves or payroll runs could cause referential integrity issues.
Fix: Check for dependencies before soft delete (like CRM module does).
4. No Audit Logging 🟡
HR operations (create/update/delete employees, approve leaves) have no audit trail.
Fix: Add audit logging service to track who/when/what changes.
**Next.js Best Practices Issues
Client-Side Data Fetching Only**
Location: employees/page.tsx, page.tsx
All pages use "use client" with client-side fetching:
"use client";
const { data: employeeRes, isLoading } = useEmployees(companyId, { ... });
**Problems:
No Server Components benefits
Slower initial page load (waterfall requests)
No static optimization
SEO issues (if applicable)**
Better approach (if data isn't highly dynamic):
// app/(dashboard)/hr/page.tsx (Server Component)
import { getHRDashboardData } from '@/services/hr/dashboard.service';
export default async function HRPage() {
const data = await getHRDashboardData();
return ;
}
// components/HRDashboard.tsx (Client Component for interactivity)
"use client";
export function HRDashboard({ initialData }: { initialData: ... }) {
const { data } = useEmployees(companyId, {
initialData, // Hydrate from server
});
// ...
}

2. Missing Suspense Boundaries
No Suspense boundaries for loading states. All handled imperatively with isLoading checks.
// Better pattern
<Suspense fallback={}>


3. Large Client Bundle
Current bundle estimate (rough):

lucide-react icons: ~40 icons × 1KB = 40KB
framer-motion: ~25KB
EditableTable: ~30KB (estimated)
hooks/use-hr.ts: ~40KB
Total: ~135KB just for employees page (uncompressed)
Optimization:
Code split EditableTable
Lazy load framer-motion animations
Dynamic imports for heavy components
Data Flow Issues

1. Prop Drilling for Company ID
companyId passed through multiple layers:
Page → useCompanies hook → selectedCompany?.id → pass to every hook
Better: Use React Context or Zustand store for company context.
// context/company-context.tsx
const CompanyContext = createContext<{ companyId: string }>(null!);
export function useCompanyContext() {
const ctx = useContext(CompanyContext);
if (!ctx) throw new Error("useCompanyContext must be used within CompanyProvider");
return ctx;
}
// hooks/use-hr/employees.ts
import { useCompanyContext } from '@/context/company-context';
export function useEmployees(params: EmployeeParams = {}) {
const { companyId } = useCompanyContext(); // Auto-injected
// ...
}
2. Confusing State Ownership (employees/page.tsx)
Multiple states for same concept:
const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null);
Lines 418-427: Complex logic to keep them in sync.
Lines 619-633: Manual synchronization on view change.
Better: Single state machine.
type ViewState =
| { view: "list"; selectedId: string | null }
| { view: "leaves"; employeeId: string }
| { view: "types" };
const [viewState, setViewState] = useState({ view: "list", selectedId: null });

// No manual sync needed

API and Server Actions Issues
1. Redundant Calls on Mount
Location: page.tsx:117-
Dashboard page makes 4 parallel API calls on mount:
const { data: employeesRes } = useEmployees(companyId);
const { data: payrollRunsRes } = usePayrollRuns(companyId);
const { data: leavesRes } = useLeaves(companyId);
const { data: departmentsRes } = useDepartments(companyId);
Better: Single dashboard endpoint.
// /api/hr/dashboard?company_id=xxx
{
employees: { total: 100, active: 85, on_leave: 5 },
payroll: { monthly_total: 150000, runs_count: 12 },
leaves: { active: 5, pending: 3 },
departments: { count: 8 },
recent_hires: [...],
notifications: [...]
}
Reduces 4 round trips to 1.
2. Poor Error Handling
Location: employees/page.tsx:503-505, 577-
} catch (err) {
console.error("[EmployeesPage] Update error:", err);
}
Errors silently logged, no user feedback.
Fix: Throw errors and let React Error Boundary handle, or show toast notifications.

Missing Optimistic Updates
React Query mutations don't use optimistic updates.
// Current
const updateEmp = useUpdateEmployee(companyId, {
onSuccess: () => toast.success(t("hr.toast_employee_update")),
});
// Better
const updateEmp = useUpdateEmployee(companyId, {
onMutate: async (variables) => {
await queryClient.cancelQueries({ queryKey: hrKeys.employees(companyId) });
const previous = queryClient.getQueryData(hrKeys.employees(companyId));
queryClient.setQueryData(hrKeys.employees(companyId), (old: any) => ({
...old,
data: old.data.map((emp: any) =>
emp.id === variables.id? { ...emp, ...variables } : emp
),
}));
return { previous };
},
onError: (err, variables, context) => {
queryClient.setQueryData(hrKeys.employees(companyId), context.previous);
toast.error("Failed to update employee");
},
onSuccess: () => toast.success(t("hr.toast_employee_update")),
});

Code Quality Issues
1. Naming Inconsistency

employeeRes vs employeesRes vs employees
addEmp vs updateEmp vs deleteEmp (abbreviated)
handleUpdate vs handleAdd vs handleColumnAdd (mixed patterns)
2. Magic Numbers
Location: Multiple places
const pageSize = 25; // Why 25?
staleTime: 30_000, // Why 30 seconds?
staleTime: 60_000, // Why 60 seconds?
Fix: Extract to constants file.
// constants/hr.ts
export const HR_TABLE_PAGE_SIZE_DEFAULT = 25;
export const HR_CACHE_STALE_TIME = 30_000;
export const HR_CACHE_LONG_STALE_TIME = 60_000;

3. TODO Comments
Location: employees/page.tsx:
// useEffect(() => { setPage(1); }, [view]); // Removed to fix cascading render warning
Commented code should be removed, not left in.

Top 7 Fixes (Priority Order)
🔴 1. Create Service Layer for All HR Operations
Files: services/hr/employee.service.ts (new), all API routes
Effort: High
Impact: Critical
Move all database logic from API routes to services. This will:

Enable proper validation with Zod
Centralize business logic
Make code testable
Prevent security vulnerabilities
Follow existing architecture patterns
Estimated time: 2-3 days for all 8 entities.
🔴 2. Split Monolithic Hooks File
File: hooks/use-hr.ts (1,019 lines → ~250 lines)
Effort: Medium
Impact: High
hooks/use-hr/
├── index.ts (barrel export)

├── employees.ts (~150 lines)
├── departments.ts (~100 lines)
├── leaves.ts (~150 lines)
├── payroll.ts (~100 lines)
├── attendance.ts (~100 lines)
├── roles.ts (~100 lines)
├── custom-fields.ts (~100 lines)
└── realtime.ts (~150 lines - centralized)
Benefits:

Tree-shaking: 20KB bundle reduction
Better organization
Faster compilation
Easier testing
Estimated time: 1 day.
🟠 3. Consolidate Realtime Subscriptions
File: hooks/use-hr/realtime.ts (new)
Effort: Medium
Impact: High
Replace 13 separate WebSocket connections with 1-2 unified channels.
Benefits:

90% reduction in network overhead
Reduced memory usage
Simpler cleanup
Better mobile performance
Estimated time: 4 hours.
🟠 4. Refactor Employees Page
File: employees/page.tsx (977 lines → ~200 lines)
Effort: High
Impact: Medium
Extract to composition:

EmployeesHeader.tsx (~200 lines)
EmployeesTable.tsx (~400 lines)
EmployeesFooter.tsx (~50 lines)
utils/hr-custom-fields-mapper.ts (~150 lines)
Benefits:
Maintainability
Testability
Reusability
Code review ease
Estimated time: 1 day.
🟠 5. Add Input Validation with Zod
Files: validators/hr.ts (extend), all API routes
Effort: Medium
Impact: High (Security)
Create Zod schemas for all HR entities:

HrCreateEmployeeSchema
HrUpdateEmployeeSchema
HrCreateLeaveSchema
etc.
Validate in service layer before database operations.
Benefits:
Type safety
Security (prevent injection)
Better error messages
API documentation (auto-generated)
Estimated time: 1 day.
🟡 6. Create Unified Dashboard Endpoint
File: app/api/hr/dashboard/route.ts (new)
Effort: Low
Impact: Medium (Performance)
Replace 4 separate API calls with 1:
// GET /api/hr/dashboard?company_id=xxx

{
summary: { employees: {...}, payroll: {...}, leaves: {...}, departments: {...} },
recent_hires: [...],
notifications: [...],
alerts: [...]
}
Benefits:

75% reduction in requests
Faster page load
Reduced server load
Better mobile performance
Estimated time: 3 hours.
🟡 7. Implement Audit Logging
File: services/audit-log.service.ts (new)
Effort: Medium
Impact: Medium (Compliance)
Log all HR operations:

Employee create/update/delete
Leave approve/reject
Payroll changes
Permission changes
Store in audit_logs table with:
user_id, company_id, action, entity_type, entity_id, old_value, new_value, timestamp
Benefits:
Compliance (GDPR, labor laws)
Security forensics
User accountability
Debugging complex issues
Estimated time: 1 day.
Summary
The HR module has a solid foundation with React Query and real-time subscriptions, but
suffers from:

Architectural issues: No service layer, bypassing existing patterns
Performance problems: 1,019-line hooks file, 13 WebSocket connections, 977-line
components
Security gaps: No validation, no audit logging, no rate limiting
Maintainability challenges: Monolithic files, duplicated logic, complex state management
Immediate priorities:
Create service layer (matches CRM/Fleet architecture)
Split hooks file (bundle size + organization)
Consolidate real-time subscriptions (performance)
Add Zod validation (security)
Once refactored, the HR module will be production-ready with proper separation of concerns,
consistent patterns, and optimal performance.