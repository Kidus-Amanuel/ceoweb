"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  AlertTriangle,
  BarChart3,
  Handshake,
  ListTodo,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import {
  EditableTable,
  VirtualColumn,
} from "@/components/shared/table/EditableTable";
import { Button } from "@/components/shared/ui/button/Button";
import { Input } from "@/components/shared/ui/input/Input";
import { useCompanies } from "@/hooks/use-companies";
import {
  createCrmCustomFieldAction,
  createCrmRowAction,
  deleteCrmCustomFieldAction,
  deleteCrmRowAction,
  getCrmTableViewAction,
  getCrmTablesAction,
  updateCrmCustomFieldAction,
  updateCrmRowAction,
} from "@/app/actions/crm";

type CrmDataTable = "customers" | "deals" | "activities";
type CrmTable = CrmDataTable | "reports";
type CrmEntity = CrmDataTable;

type CrmWorkspaceProps = {
  defaultTable?: CrmTable;
};

type RawRow = Record<string, unknown> & {
  id: string;
  custom_fields?: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
};

type TableCounts = {
  customers: number;
  deals: number;
  activities: number;
};

type SelectOption = { label: string; value: string };
type RelationalSets = {
  users: SelectOption[];
  customers: SelectOption[];
  deals: SelectOption[];
};

const DEFAULT_COUNTS: TableCounts = {
  customers: 0,
  deals: 0,
  activities: 0,
};

const VIEW_META = {
  customers: {
    title: "Customers",
    icon: Users,
    iconClass: "text-blue-500",
  },
  deals: {
    title: "Deals",
    icon: Handshake,
    iconClass: "text-green-500",
  },
  activities: {
    title: "Activities",
    icon: ListTodo,
    iconClass: "text-amber-500",
  },
  reports: {
    title: "Reports",
    icon: BarChart3,
    iconClass: "text-purple-500",
  },
} as const;

const tableToEntity = (table: CrmDataTable): CrmEntity => table;

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);
const pickInput = (
  payload: Record<string, unknown>,
  snake: string,
  camel: string,
) =>
  hasOwn(payload, snake)
    ? payload[snake]
    : hasOwn(payload, camel)
      ? payload[camel]
      : undefined;

const deriveActivityStatus = (row: RawRow): string => {
  if (row.completed_at) {
    return "Completed";
  }

  if (typeof row.due_date === "string") {
    const dueDate = new Date(row.due_date);
    if (!Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now()) {
      return "Overdue";
    }
  }

  return "Pending";
};

const normalizeRowForGrid = (
  table: CrmTable,
  row: RawRow,
): Record<string, unknown> => ({
  ...row,
  status:
    table === "activities"
      ? (row.status ?? deriveActivityStatus(row))
      : row.status,
  customValues: asRecord(row.custom_data ?? row.custom_fields),
});

const mapFieldType = (value: string): VirtualColumn["type"] => {
  if (value === "number") return "number";
  if (value === "select") return "select";
  if (value === "boolean") return "boolean";
  if (value === "date") return "date";
  if (value === "datetime") return "datetime";
  if (value === "currency") return "currency";
  return "text";
};

const crmViewHelpers = {
  getStandardColumns: (table: CrmDataTable, relations: RelationalSets) => {
    const userMeta = relations.users.length
      ? { type: "select", options: relations.users }
      : { type: "text" };
    const customerMeta = relations.customers.length
      ? { type: "select", options: relations.customers }
      : { type: "text" };
    const relatedOptions = [...relations.customers, ...relations.deals];
    const relatedIdMeta = relatedOptions.length
      ? {
          type: "select",
          options: relatedOptions,
          optionsByType: {
            customer: relations.customers,
            deal: relations.deals,
          },
          optionsSourceKey: "related_type",
        }
      : { type: "text" };

    return table === "customers"
      ? [
          { header: "Name", accessorKey: "name" },
          { header: "Email", accessorKey: "email" },
          { header: "Phone", accessorKey: "phone" },
          { header: "Assigned To", accessorKey: "assigned_to", meta: userMeta },
          {
            header: "Type",
            accessorKey: "type",
            meta: {
              type: "select",
              options: [
                { label: "Person", value: "person" },
                { label: "Company", value: "company" },
              ],
            },
          },
          {
            header: "Status",
            accessorKey: "status",
            meta: {
              type: "select",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ],
            },
          },
        ]
      : table === "deals"
        ? [
            { header: "Deal Title", accessorKey: "title" },
            {
              header: "Customer",
              accessorKey: "customer_id",
              meta: customerMeta,
            },
            {
              header: "Assigned To",
              accessorKey: "assigned_to",
              meta: userMeta,
            },
            {
              header: "Stage",
              accessorKey: "stage",
              meta: {
                type: "select",
                options: [
                  { label: "Lead", value: "lead" },
                  { label: "Qualified", value: "qualified" },
                  { label: "Proposal", value: "proposal" },
                  { label: "Negotiation", value: "negotiation" },
                  { label: "Closed Won", value: "closed_won" },
                  { label: "Closed Lost", value: "closed_lost" },
                ],
              },
            },
            { header: "Value", accessorKey: "value", meta: { type: "number" } },
            {
              header: "Probability",
              accessorKey: "probability",
              meta: { type: "number" },
            },
            {
              header: "Expected Close",
              accessorKey: "expected_close_date",
              meta: { type: "date" },
            },
          ]
        : [
            {
              header: "Related ID Type",
              accessorKey: "related_type",
              meta: {
                type: "select",
                options: [
                  { label: "Customer", value: "customer" },
                  { label: "Deal", value: "deal" },
                ],
              },
            },
            {
              header: "Related ID",
              accessorKey: "related_id",
              meta: relatedIdMeta,
            },
            { header: "Subject", accessorKey: "subject" },
            {
              header: "Type",
              accessorKey: "activity_type",
              meta: {
                type: "select",
                options: [
                  { label: "Call", value: "call" },
                  { label: "Email", value: "email" },
                  { label: "Meeting", value: "meeting" },
                  { label: "Note", value: "note" },
                  { label: "Task", value: "task" },
                ],
              },
            },
            {
              header: "Due Date",
              accessorKey: "due_date",
              meta: { type: "datetime" },
            },
            {
              header: "Status",
              accessorKey: "status",
              meta: {
                type: "select",
                options: [
                  { label: "Pending", value: "Pending" },
                  { label: "Completed", value: "Completed" },
                  { label: "Overdue", value: "Overdue" },
                ],
              },
            },
          ];
  },
  serializeStandardData: (
    table: CrmDataTable,
    payload: Record<string, unknown>,
    existingRow?: RawRow,
  ) => {
    if (table === "customers") {
      return {
        ...(hasOwn(payload, "name") ? { name: payload.name } : {}),
        ...(hasOwn(payload, "email") ? { email: payload.email } : {}),
        ...(hasOwn(payload, "phone") ? { phone: payload.phone } : {}),
        ...(hasOwn(payload, "type") ? { type: payload.type } : {}),
        ...(hasOwn(payload, "status") ? { status: payload.status } : {}),
        ...(pickInput(payload, "assigned_to", "assignedTo") !== undefined
          ? { assignedTo: pickInput(payload, "assigned_to", "assignedTo") }
          : {}),
      };
    }

    if (table === "deals") {
      return {
        ...(pickInput(payload, "customer_id", "customerId") !== undefined
          ? { customerId: pickInput(payload, "customer_id", "customerId") }
          : {}),
        ...(pickInput(payload, "contact_id", "contactId") !== undefined
          ? { contactId: pickInput(payload, "contact_id", "contactId") }
          : {}),
        ...(hasOwn(payload, "title") ? { title: payload.title } : {}),
        ...(hasOwn(payload, "description")
          ? { description: payload.description }
          : {}),
        ...(hasOwn(payload, "value") ? { value: payload.value } : {}),
        ...(hasOwn(payload, "stage") ? { stage: payload.stage } : {}),
        ...(hasOwn(payload, "probability")
          ? { probability: payload.probability }
          : {}),
        ...(pickInput(payload, "expected_close_date", "expectedCloseDate") !==
        undefined
          ? {
              expectedCloseDate: pickInput(
                payload,
                "expected_close_date",
                "expectedCloseDate",
              ),
            }
          : {}),
        ...(pickInput(payload, "assigned_to", "assignedTo") !== undefined
          ? { assignedTo: pickInput(payload, "assigned_to", "assignedTo") }
          : {}),
      };
    }

    const dueDateInput = pickInput(payload, "due_date", "dueDate");
    const statusInput = hasOwn(payload, "status")
      ? String(payload.status ?? "")
      : undefined;
    let completedAtInput = pickInput(payload, "completed_at", "completedAt");

    if (
      statusInput?.toLowerCase() === "completed" &&
      completedAtInput === undefined
    ) {
      completedAtInput = existingRow?.completed_at ?? new Date().toISOString();
    }
    if (statusInput && statusInput.toLowerCase() !== "completed") {
      completedAtInput = null;
    }

    return {
      ...(pickInput(payload, "related_type", "relatedType") !== undefined
        ? { relatedType: pickInput(payload, "related_type", "relatedType") }
        : {}),
      ...(pickInput(payload, "related_id", "relatedId") !== undefined
        ? { relatedId: pickInput(payload, "related_id", "relatedId") }
        : {}),
      ...(pickInput(payload, "activity_type", "activityType") !== undefined
        ? { activityType: pickInput(payload, "activity_type", "activityType") }
        : {}),
      ...(hasOwn(payload, "subject") ? { subject: payload.subject } : {}),
      ...(hasOwn(payload, "notes") ? { notes: payload.notes } : {}),
      ...(dueDateInput !== undefined ? { dueDate: dueDateInput } : {}),
      ...(completedAtInput !== undefined
        ? { completedAt: completedAtInput }
        : {}),
    };
  },
};

function CrmReportsView({ tableCounts }: { tableCounts: TableCounts }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-[#787774]">
          Total Customers
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#37352F]">
          {tableCounts.customers}
        </p>
      </div>
      <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-[#787774]">
          Active Deals
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#37352F]">
          {tableCounts.deals}
        </p>
      </div>
      <div className="rounded-xl border border-[#E9E9E7] bg-white px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-[#787774]">
          Pending Activities
        </p>
        <p className="mt-2 text-2xl font-semibold text-[#37352F]">
          {tableCounts.activities}
        </p>
      </div>
    </div>
  );
}

export function CrmWorkspace({
  defaultTable = "customers",
}: CrmWorkspaceProps) {
  const { selectedCompany } = useCompanies();
  const activeTable = defaultTable;
  const activeMeta = VIEW_META[activeTable];
  const ActiveIcon = activeMeta.icon;
  const companyId = selectedCompany?.id;
  const [rows, setRows] = useState<RawRow[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<
    Record<string, unknown>[]
  >([]);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [deals, setDeals] = useState<SelectOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [pageSize] = useState(50);
  const [tableCounts, setTableCounts] = useState<TableCounts>(DEFAULT_COUNTS);
  const [error, setError] = useState<string | null>(null);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadCounts = useCallback(async (companyId: string) => {
    const response = await getCrmTablesAction({ companyId });
    if (!response.success) {
      setError(response.error || "Failed to load CRM table counters.");
      return;
    }

    const counts = (response.data || DEFAULT_COUNTS) as Record<string, number>;
    setTableCounts({
      customers: counts.customers ?? counts.crm_customers ?? 0,
      deals: counts.deals ?? counts.crm_deals ?? 0,
      activities: counts.activities ?? counts.crm_activities ?? 0,
    });
  }, []);

  const loadTableView = useCallback(
    async (
      companyId: string,
      table: CrmDataTable,
      page: number,
      size: number,
    ) => {
      const response = await getCrmTableViewAction({
        companyId,
        table,
        page,
        pageSize: size,
      });
      if (!response.success || !response.data) {
        setError(response.error || "Failed to load CRM table view.");
        return;
      }

      setRows((response.data.rows as RawRow[]) || []);
      setColumnDefinitions(response.data.columnDefinitions || []);
      setTotalRows(response.data.totalRows || 0);
      setUsers(response.data.users || []);
      setCustomers(response.data.customers || []);
      setDeals(response.data.deals || []);
    },
    [],
  );

  const refresh = useCallback(
    (table: CrmTable = activeTable, page: number = currentPage) => {
      if (!companyId) return;

      setError(null);
      startTransition(async () => {
        if (table === "reports") {
          await loadCounts(companyId);
          return;
        }

        await loadTableView(companyId, table, page, pageSize);
      });
    },
    [
      activeTable,
      companyId,
      currentPage,
      loadCounts,
      loadTableView,
      pageSize,
      startTransition,
    ],
  );

  useEffect(() => {
    if (!companyId) return;
    const timer = setTimeout(() => refresh(activeTable, currentPage), 0);
    return () => clearTimeout(timer);
  }, [activeTable, companyId, currentPage, refresh]);

  const gridData = useMemo(
    () => rows.map((row) => normalizeRowForGrid(activeTable, row)),
    [activeTable, rows],
  );

  const virtualColumns = useMemo<VirtualColumn[]>(
    () =>
      columnDefinitions.map((field) => {
        const rawOptions = Array.isArray(field.field_options)
          ? field.field_options
          : [];
        return {
          id: String(field.field_name ?? field.id),
          label: String(field.field_label || field.field_name),
          key: String(field.field_name),
          type: mapFieldType(String(field.field_type || "text")),
          options: rawOptions.map((option: unknown) =>
            option && typeof option === "object" && !Array.isArray(option)
              ? {
                  label: String(
                    (option as { label?: unknown }).label ??
                      (option as { value?: unknown }).value ??
                      "",
                  ),
                  value: String(
                    (option as { value?: unknown }).value ??
                      (option as { label?: unknown }).label ??
                      "",
                  ),
                }
              : {
                  label: String(option),
                  value: String(option),
                },
          ),
        };
      }),
    [columnDefinitions],
  );

  const handleAddRow = async (payload: Record<string, unknown>) => {
    if (!companyId || activeTable === "reports") return;

    const response = await createCrmRowAction({
      companyId,
      table: activeTable,
      standardData: crmViewHelpers.serializeStandardData(activeTable, payload),
      customData:
        activeTable === "customers"
          ? asRecord(payload.customValues)
          : undefined,
    });

    if (!response.success) {
      setError(response.error || "Failed to create CRM row.");
      return;
    }

    refresh(activeTable);
  };

  const handleUpdateRow = async (
    rowId: string,
    payload: Record<string, unknown>,
  ) => {
    if (!companyId || activeTable === "reports") return;
    const existingRow = rows.find((row) => row.id === rowId);

    const nextCustomValues =
      payload.customValues !== undefined
        ? asRecord(payload.customValues)
        : asRecord(existingRow?.custom_data ?? existingRow?.custom_fields);

    const response = await updateCrmRowAction({
      companyId,
      table: activeTable,
      rowId,
      standardData: crmViewHelpers.serializeStandardData(
        activeTable,
        payload,
        existingRow,
      ),
      customData: activeTable === "customers" ? nextCustomValues : undefined,
    });

    if (!response.success) {
      setError(response.error || "Failed to update CRM row.");
      return;
    }

    refresh(activeTable);
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!companyId || activeTable === "reports") return;

    const response = await deleteCrmRowAction({
      companyId,
      table: activeTable,
      rowId,
    });

    if (!response.success) {
      setError(response.error || "Failed to delete CRM row.");
      return;
    }

    refresh(activeTable);
  };

  const handleAddColumn = async (column: Omit<VirtualColumn, "id">) => {
    if (!companyId || activeTable === "reports") return;

    const response = await createCrmCustomFieldAction({
      companyId,
      entityType: tableToEntity(activeTable),
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType: column.type === "json" ? "text" : column.type,
      fieldOptions:
        column.type === "select" || column.type === "currency"
          ? (column.options ?? [])
              .map((option) => String(option.value ?? option.label))
              .filter(Boolean)
          : undefined,
      isRequired: false,
    });

    if (!response.success) {
      setError(response.error || "Failed to create custom field.");
      return;
    }

    if (response.data) {
      const nextField = response.data as Record<string, unknown>;
      const nextFieldName = String(
        nextField.field_name ?? nextField.id ?? column.key,
      );
      setColumnDefinitions((previous) => {
        const exists = previous.some(
          (field) =>
            String(field.field_name ?? field.id ?? "") === nextFieldName,
        );
        if (exists) return previous;
        return [...previous, nextField];
      });
    }
  };

  const handleUpdateColumn = async (
    columnId: string,
    column: Omit<VirtualColumn, "id">,
  ) => {
    if (!companyId || activeTable === "reports") return;

    const response = await updateCrmCustomFieldAction({
      companyId,
      fieldId: columnId,
      entityType: tableToEntity(activeTable),
      fieldLabel: column.label,
      fieldName: column.key,
      fieldType: column.type === "json" ? "text" : column.type,
      fieldOptions:
        column.type === "select" || column.type === "currency"
          ? (column.options ?? [])
              .map((option) => String(option.value ?? option.label))
              .filter(Boolean)
          : undefined,
      isRequired: false,
    });

    if (!response.success || !response.data) {
      setError(response.error || "Failed to update custom field.");
      return;
    }

    const nextField = response.data as Record<string, unknown>;
    setColumnDefinitions((previous) =>
      previous.map((field) =>
        String(field.id ?? field.field_name ?? "") === columnId
          ? nextField
          : field,
      ),
    );
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!companyId || activeTable === "reports") return;

    const response = await deleteCrmCustomFieldAction({
      companyId,
      fieldId: columnId,
    });

    if (!response.success) {
      setError(response.error || "Failed to delete custom field.");
      return;
    }

    setColumnDefinitions((previous) =>
      previous.filter(
        (field) => String(field.id ?? field.field_name ?? "") !== columnId,
      ),
    );
  };

  if (!companyId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" />
        <div>
          <p className="font-semibold">No active company selected</p>
          <p className="text-sm">
            Select a company from the sidebar to load CRM data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ActiveIcon className={`h-5 w-5 ${activeMeta.iconClass}`} />
            {activeMeta.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Showing data for{" "}
            <span className="font-semibold">{selectedCompany.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-[280px] max-w-[48vw]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
            <Input
              value={workspaceSearchQuery}
              onChange={(event) => setWorkspaceSearchQuery(event.target.value)}
              placeholder="Search workspace..."
              className="h-10 pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refresh()}
            disabled={isPending}
            className="gap-2 border"
          >
            <RefreshCw
              className={`w-4 h-4 text-emerald-500 ${isPending ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {activeTable === "customers" ? (
        <EditableTable
          title={undefined}
          data={gridData as any}
          columns={
            crmViewHelpers.getStandardColumns("customers", {
              users,
              customers,
              deals,
            }) as any
          }
          virtualColumns={virtualColumns}
          currentPage={currentPage}
          totalRows={totalRows}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onAdd={(payload) => handleAddRow(payload as Record<string, unknown>)}
          onUpdate={(rowId, payload) =>
            handleUpdateRow(rowId, payload as Record<string, unknown>)
          }
          onDelete={handleDeleteRow}
          onColumnAdd={handleAddColumn}
          onColumnUpdate={handleUpdateColumn}
          onColumnDelete={handleDeleteColumn}
          searchable={false}
          searchQuery={workspaceSearchQuery}
          onSearchQueryChange={setWorkspaceSearchQuery}
        />
      ) : null}

      {activeTable === "deals" ? (
        <EditableTable
          title={undefined}
          data={gridData as any}
          columns={
            crmViewHelpers.getStandardColumns("deals", {
              users,
              customers,
              deals,
            }) as any
          }
          virtualColumns={[]}
          currentPage={currentPage}
          totalRows={totalRows}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onAdd={(payload) => handleAddRow(payload as Record<string, unknown>)}
          onUpdate={(rowId, payload) =>
            handleUpdateRow(rowId, payload as Record<string, unknown>)
          }
          onDelete={handleDeleteRow}
          searchable={false}
          searchQuery={workspaceSearchQuery}
          onSearchQueryChange={setWorkspaceSearchQuery}
        />
      ) : null}

      {activeTable === "activities" ? (
        <EditableTable
          title={undefined}
          data={gridData as any}
          columns={
            crmViewHelpers.getStandardColumns("activities", {
              users,
              customers,
              deals,
            }) as any
          }
          virtualColumns={[]}
          currentPage={currentPage}
          totalRows={totalRows}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onAdd={(payload) => handleAddRow(payload as Record<string, unknown>)}
          onUpdate={(rowId, payload) =>
            handleUpdateRow(rowId, payload as Record<string, unknown>)
          }
          onDelete={handleDeleteRow}
          searchable={false}
          searchQuery={workspaceSearchQuery}
          onSearchQueryChange={setWorkspaceSearchQuery}
        />
      ) : null}

      {activeTable === "reports" ? (
        <CrmReportsView tableCounts={tableCounts} />
      ) : null}
    </div>
  );
}
