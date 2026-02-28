import { BarChart3, Handshake, ListTodo, Users } from "lucide-react";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";

export type CrmDataTable = "customers" | "deals" | "activities";
export type CrmTable = CrmDataTable | "reports";
export type CrmEntity = CrmDataTable;

export type RawRow = Record<string, unknown> & {
  id: string;
  custom_fields?: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
};

export type TableCounts = {
  customers: number;
  deals: number;
  activities: number;
};

export type SelectOption = { label: string; value: string };
export type RelationalSets = {
  users: SelectOption[];
  customers: SelectOption[];
  deals: SelectOption[];
};

export const DEFAULT_COUNTS: TableCounts = {
  customers: 0,
  deals: 0,
  activities: 0,
};

export const VIEW_META = {
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

export const tableToEntity = (table: CrmDataTable): CrmEntity => table;

export const asRecord = (value: unknown): Record<string, unknown> =>
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

export const toFriendlyCrmError = (input: string) => {
  const message = String(input || "").trim();
  if (!message) return "Something went wrong. Please try again.";

  if (/violates not-null constraint/i.test(message)) {
    const match = message.match(/column "([^"]+)"/i);
    const field = (match?.[1] ?? "required field").replace(/_/g, " ");
    return `${field.charAt(0).toUpperCase()}${field.slice(1)} is required.`;
  }
  if (/column .* does not exist/i.test(message)) {
    return "CRM database schema is out of date. Please run the latest migration and retry.";
  }
  if (/invalid input syntax for type uuid/i.test(message)) {
    return "Please select a valid related record.";
  }
  if (/Cannot coerce the result to a single JSON object/i.test(message)) {
    return "Could not save this update. Please retry.";
  }
  if (/violates foreign key constraint/i.test(message)) {
    return "The selected related record no longer exists.";
  }
  if (/duplicate key value violates unique constraint/i.test(message)) {
    return "A record with the same value already exists.";
  }
  return message;
};

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

export const normalizeRowForGrid = (
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

export const mapFieldType = (value: string): VirtualColumn["type"] => {
  if (value === "number") return "number";
  if (value === "select") return "select";
  if (value === "status") return "status";
  if (value === "boolean") return "boolean";
  if (value === "date") return "date";
  if (value === "datetime") return "datetime";
  if (value === "currency") return "currency";
  return "text";
};

export const normalizeFieldOptions = (
  type: VirtualColumn["type"],
  options: { label: string; value: string | number }[] | undefined,
) => {
  const raw = (options ?? [])
    .map((option) => String(option.value ?? option.label).trim())
    .filter(Boolean);
  if (!raw.length) return undefined;
  if (type === "currency") {
    const seen = new Set<string>();
    return raw
      .map((value) => value.toUpperCase())
      .filter((value) => {
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
  }
  const seen = new Set<string>();
  return raw.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const crmViewHelpers = {
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
            customers: relations.customers,
            deal: relations.deals,
            deals: relations.deals,
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
                  { label: "Cancelled", value: "Cancelled" },
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
      ...(hasOwn(payload, "status") ? { status: payload.status } : {}),
      ...(hasOwn(payload, "subject") ? { subject: payload.subject } : {}),
      ...(hasOwn(payload, "notes") ? { notes: payload.notes } : {}),
      ...(dueDateInput !== undefined ? { dueDate: dueDateInput } : {}),
      ...(completedAtInput !== undefined
        ? { completedAt: completedAtInput }
        : {}),
    };
  },
};
