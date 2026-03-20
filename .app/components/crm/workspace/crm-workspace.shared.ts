import { createElement } from "react";
import { BarChart3, Handshake, ListTodo, Users } from "lucide-react";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";

export type CrmDataTable = "customers" | "deals" | "activities";
export type CrmTable = CrmDataTable | "overviews";
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
  overviews: {
    title: "Overviews",
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
  if (
    /\b23505\b|unique violation|duplicate key value violates unique constraint/i.test(
      message,
    )
  ) {
    return "This record already exists. Please update the existing one or use a different name.";
  }
  if (
    /\b23503\b|foreign key violation|violates foreign key constraint/i.test(
      message,
    )
  ) {
    return "The related item you selected no longer exists. Please refresh.";
  }
  if (
    /\b23502\b|not-null violation|violates not-null constraint/i.test(message)
  ) {
    return "Please fill in all required fields marked with an asterisk.";
  }
  if (
    /typeerror:\s*fetch failed/i.test(message) ||
    /failed to fetch/i.test(message) ||
    /network\s*error/i.test(message) ||
    /net::err_/i.test(message) ||
    /econnrefused|enotfound|etimedout|econnreset/i.test(message)
  ) {
    return "Network error. Please check your internet connection and try again.";
  }
  if (/an unexpected response was received from the server/i.test(message)) {
    return "Server returned an unexpected response. Please try again.";
  }

  if (/(standardData|customData|customValues|payload|data)\./i.test(message)) {
    const toTitle = (value: string) =>
      value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "Field";
    const toLabel = (path: string) =>
      toTitle(
        path
          .replace(
            /^(standardData|customData|customValues|payload|data)\.?/i,
            "",
          )
          .replace(/\[[0-9]+\]/g, "")
          .split(".")
          .filter(Boolean)
          .map((segment) => segment.replace(/_/g, " "))
          .join(" "),
      );
    const normalized = message
      .split("|")
      .map((chunk) => chunk.trim())
      .map((chunk) => {
        const match = chunk.match(/^([a-zA-Z0-9_.[\]-]+)\s*:\s*(.+)$/);
        if (!match) return chunk;
        const fieldLabel = toLabel(match[1]);
        const issue = match[2].trim();
        if (
          /invalid input: expected .* received undefined/i.test(issue) ||
          /required/i.test(issue) ||
          /too_small/i.test(issue)
        ) {
          return `${fieldLabel} is required.`;
        }
        if (/email/i.test(fieldLabel) && /invalid/i.test(issue)) {
          return "Please enter a valid email address.";
        }
        if (
          /phone|mobile|tel/i.test(fieldLabel) &&
          /invalid|pattern/i.test(issue)
        ) {
          return "Please enter a valid phone number.";
        }
        return `${fieldLabel}: ${issue.replace(/^invalid input:\s*/i, "")}`;
      })
      .join(" ");
    return normalized;
  }

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
  if (
    /updated by someone else|conflict|stale data|precondition failed/i.test(
      message,
    )
  ) {
    return "This row changed in the background. Refresh and try again.";
  }
  return message;
};

export const normalizeRowForGrid = (
  _table: CrmTable,
  row: RawRow,
): Record<string, unknown> => ({
  ...row,
  customValues: asRecord(row.custom_data ?? row.custom_fields),
});

export const mapFieldType = (value: string): VirtualColumn["type"] => {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (token === "number") return "number";
  if (token === "select") return "select";
  if (token === "status") return "status";
  if (token === "boolean") return "boolean";
  if (token === "date") return "date";
  if (token === "datetime" || token === "date_time" || token === "timestamp")
    return "datetime";
  if (token === "currency" || token === "money") return "currency";
  if (token === "phone" || token === "tel" || token === "telephone")
    return "phone";
  if (token === "email" || token === "e_mail") return "email";
  if (token === "files") return "files";
  if (token === "json") return "json";
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
    const getOptionLabel = (
      value: unknown,
      options: SelectOption[],
      fallback = "",
    ) => {
      const key = String(value ?? "");
      return options.find((option) => option.value === key)?.label ?? fallback;
    };

    const userMeta = {
      type: "select",
      options: relations.users,
    };
    const customerMeta = {
      type: "select",
      options: relations.customers,
    };
    const relatedOptions = [...relations.customers, ...relations.deals];
    const relatedIdMeta = {
      type: "select",
      options: relatedOptions,
      optionsByType: {
        customer: relations.customers,
        customers: relations.customers,
        deal: relations.deals,
        deals: relations.deals,
      },
      optionsSourceKey: "related_type",
    };

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
              meta: {
                ...customerMeta,
              },
              cell: ({
                row,
                getValue,
              }: {
                row: { original: Record<string, unknown> };
                getValue: () => unknown;
              }) => {
                const customer = row.original.customer as
                  | { name?: string | null }
                  | undefined;
                const label =
                  customer?.name ??
                  getOptionLabel(
                    getValue(),
                    relations.customers,
                    String(getValue() ?? ""),
                  );
                return createElement("span", null, label);
              },
            },
            {
              header: "Contact",
              accessorKey: "contact_display",
              meta: { type: "text", readOnly: true },
            },
            {
              header: "Description",
              accessorKey: "description",
            },
            {
              header: "Assigned To",
              accessorKey: "assigned_to",
              meta: {
                ...userMeta,
              },
              cell: ({
                row,
                getValue,
              }: {
                row: { original: Record<string, unknown> };
                getValue: () => unknown;
              }) => {
                const assignedUser = row.original.assigned_user as
                  | { full_name?: string | null; email?: string | null }
                  | undefined;
                const label =
                  assignedUser?.full_name ??
                  assignedUser?.email ??
                  getOptionLabel(
                    getValue(),
                    relations.users,
                    String(getValue() ?? ""),
                  );
                return createElement("span", null, label);
              },
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
              meta: {
                ...relatedIdMeta,
              },
              cell: ({
                row,
                getValue,
              }: {
                row: { original: Record<string, unknown> };
                getValue: () => unknown;
              }) => {
                const customer = row.original.customer as
                  | { name?: string | null }
                  | undefined;
                const deal = row.original.deal as
                  | { title?: string | null; name?: string | null }
                  | undefined;
                const label =
                  customer?.name ??
                  deal?.title ??
                  deal?.name ??
                  getOptionLabel(
                    getValue(),
                    relatedOptions,
                    String(getValue() ?? ""),
                  );
                return createElement("span", null, label);
              },
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
              header: "Notes",
              accessorKey: "notes",
            },
            {
              header: "Completed At",
              accessorKey: "completed_at",
              meta: { type: "datetime" },
            },
            {
              header: "Created By",
              accessorKey: "created_by",
              meta: userMeta,
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
    let completedAtInput = pickInput(payload, "completed_at", "completedAt");
    if (
      completedAtInput === undefined &&
      existingRow?.completed_at !== undefined
    ) {
      completedAtInput = existingRow.completed_at;
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
      ...(pickInput(payload, "created_by", "createdBy") !== undefined
        ? { createdBy: pickInput(payload, "created_by", "createdBy") }
        : {}),
      ...(completedAtInput !== undefined
        ? { completedAt: completedAtInput }
        : {}),
    };
  },
};
