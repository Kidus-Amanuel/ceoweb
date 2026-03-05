import { SupabaseClient } from "@supabase/supabase-js";
import logger from "@/lib/utils/logger";
import {
  CRM_SEARCH_MATCH_LIMIT,
  CRM_SELECT_PAGE_SIZE_DEFAULT,
  CRM_SELECT_PAGE_SIZE_MAX,
  CRM_TABLE_PAGE_SIZE_MAX,
} from "@/lib/constants/crm-pagination";
import {
  CrmCreateRowInput,
  CrmEntityType,
  CrmTable,
  CrmUpdateRowInput,
} from "@/validators/crm";

type ServiceResult<T> = {
  data?: T;
  error?: string;
};

type TenantContextParams = {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
  isSuperAdmin: boolean;
};

type TenantContext = {
  companyId: string;
};

type ListRowsParams = {
  supabase: SupabaseClient;
  table: CrmTable;
  companyId: string;
  page: number;
  pageSize: number;
  search?: string;
};

type UpsertRowParams = {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
  payload: CrmCreateRowInput | CrmUpdateRowInput;
  rowId?: string;
};

type SelectOption = { label: string; value: string };
type SelectListParams = {
  supabase: SupabaseClient;
  companyId: string;
  page?: number;
  pageSize?: number;
};

type CustomFieldPayload = {
  entityType: CrmEntityType;
  fieldName: string;
  fieldLabel: string;
  fieldType:
    | "text"
    | "number"
    | "date"
    | "datetime"
    | "select"
    | "boolean"
    | "currency"
    | "phone"
    | "email";
  fieldOptions?: string[];
  isRequired?: boolean;
};

type ColumnDefinition = {
  id: string;
  entity_type: CrmEntityType;
  field_name: string;
  field_label: string;
  field_type: CustomFieldPayload["fieldType"];
  field_options: string[] | null;
  is_required: boolean;
  is_active: boolean;
};

type CrmMetadata = Partial<Record<CrmEntityType, ColumnDefinition[]>>;

const buildPagedRange = (
  page: number,
  pageSize: number,
  maxPageSize: number,
) => {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(maxPageSize, Math.max(1, Math.trunc(pageSize)))
    : maxPageSize;
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  return { from, to, safePage, safePageSize };
};

const toSnakeCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const mapCustomerStandard = (input: Record<string, unknown>) => ({
  name: input.name,
  email: input.email,
  phone: input.phone,
  type: input.type,
  status: input.status,
  assigned_to: input.assignedTo ?? input.assigned_to,
});

const mapDealStandard = (input: Record<string, unknown>) => ({
  customer_id: input.customerId ?? input.customer_id,
  contact_id: input.contactId ?? input.contact_id,
  title: input.title,
  description: input.description,
  value: input.value,
  stage: input.stage,
  probability: input.probability,
  expected_close_date: input.expectedCloseDate ?? input.expected_close_date,
  assigned_to: input.assignedTo ?? input.assigned_to,
});

const pickMappedValue = (
  input: Record<string, unknown>,
  camel: string,
  snake: string,
) =>
  Object.prototype.hasOwnProperty.call(input, camel)
    ? input[camel]
    : Object.prototype.hasOwnProperty.call(input, snake)
      ? input[snake]
      : undefined;

const mapActivityStandard = (input: Record<string, unknown>) => ({
  related_type: pickMappedValue(input, "relatedType", "related_type"),
  related_id: pickMappedValue(input, "relatedId", "related_id"),
  activity_type: pickMappedValue(input, "activityType", "activity_type"),
  status: pickMappedValue(input, "status", "status"),
  subject: input.subject,
  notes: input.notes,
  due_date: pickMappedValue(input, "dueDate", "due_date"),
  completed_at: pickMappedValue(input, "completedAt", "completed_at"),
});

const mapStandardByTable = (
  table: CrmTable,
  standardData: Record<string, unknown>,
) =>
  table === "customers"
    ? mapCustomerStandard(standardData)
    : table === "deals"
      ? mapDealStandard(standardData)
      : mapActivityStandard(standardData);

const withoutUndefined = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const dealStageValues = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

const normalizeSearchToken = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const getMatchingDealStages = (searchTerm: string) => {
  const token = normalizeSearchToken(searchTerm);
  if (!token) return [] as string[];
  return dealStageValues.filter((stage) => {
    const stageToken = stage.replace(/_/g, "");
    return stageToken.includes(token) || token.includes(stageToken);
  });
};

const normalizeOptionValues = (
  fieldType: CustomFieldPayload["fieldType"],
  values: string[] | undefined,
) => {
  const normalized = (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (fieldType === "currency" ? value.toUpperCase() : value));
  const seen = new Set<string>();
  return normalized.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("amount" in obj || "currency" in obj) {
      const amount = obj.amount;
      const currency = String(obj.currency ?? "").trim();
      return (
        (amount !== null &&
          amount !== undefined &&
          String(amount).trim() !== "") ||
        currency.length > 0
      );
    }
    return Object.keys(obj).length > 0;
  }
  return false;
};

const getUsedOptionValue = (
  fieldType: CustomFieldPayload["fieldType"],
  value: unknown,
): string | null => {
  if (!hasMeaningfulValue(value)) return null;
  if (fieldType === "currency") {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const currency = String((value as Record<string, unknown>).currency ?? "")
        .trim()
        .toUpperCase();
      return currency || null;
    }
    return null;
  }
  return String(value).trim();
};

const titleCase = (value: string) =>
  value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const toColumnDefinition = (
  input: Partial<ColumnDefinition> &
    Pick<ColumnDefinition, "entity_type" | "field_name">,
): ColumnDefinition => ({
  id: input.id && input.id.length > 0 ? input.id : crypto.randomUUID(),
  entity_type: input.entity_type,
  field_name: input.field_name,
  field_label:
    input.field_label && input.field_label.length > 0
      ? input.field_label
      : input.field_name,
  field_type: input.field_type ?? "text",
  field_options: Array.isArray(input.field_options)
    ? input.field_options
    : null,
  is_required: Boolean(input.is_required),
  is_active: input.is_active ?? true,
});

const normalizeMetadata = (settings: unknown): CrmMetadata => {
  const parsedSettings =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  const rawMetadata =
    parsedSettings.crm_metadata &&
    typeof parsedSettings.crm_metadata === "object" &&
    !Array.isArray(parsedSettings.crm_metadata)
      ? (parsedSettings.crm_metadata as Record<string, unknown>)
      : {};

  const metadata: CrmMetadata = {};
  for (const entityType of ["customers", "deals", "activities"] as const) {
    const values = rawMetadata[entityType];
    if (!Array.isArray(values)) {
      metadata[entityType] = [];
      continue;
    }

    metadata[entityType] = values
      .map((entry) =>
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? toColumnDefinition({
              ...(entry as Partial<ColumnDefinition>),
              entity_type: entityType,
              field_name:
                typeof (entry as Partial<ColumnDefinition>).field_name ===
                "string"
                  ? (entry as Partial<ColumnDefinition>).field_name!
                  : "",
            })
          : null,
      )
      .filter((entry): entry is ColumnDefinition =>
        Boolean(entry && entry.field_name),
      );
  }

  return metadata;
};

const applyMetadataToSettings = (settings: unknown, metadata: CrmMetadata) => {
  const parsedSettings =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  return {
    ...parsedSettings,
    crm_metadata: {
      ...(parsedSettings.crm_metadata &&
      typeof parsedSettings.crm_metadata === "object" &&
      !Array.isArray(parsedSettings.crm_metadata)
        ? (parsedSettings.crm_metadata as Record<string, unknown>)
        : {}),
      ...metadata,
    },
  };
};

export const crmService = {
  async resolveTenantContext({
    supabase,
    companyId,
    userId,
    isSuperAdmin,
  }: TenantContextParams): Promise<ServiceResult<TenantContext>> {
    if (!isSuperAdmin) {
      const { data: membership, error: membershipError } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError) {
        return { error: membershipError.message };
      }

      if (!membership?.company_id) {
        return { error: "You do not have access to this company." };
      }
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (companyError) {
      return { error: companyError.message };
    }

    if (!company?.id) {
      return { error: "Company tenant context could not be resolved." };
    }

    return {
      data: {
        companyId: company.id,
      },
    };
  },

  async getTableCounts({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
  }): Promise<
    ServiceResult<{ customers: number; deals: number; activities: number }>
  > {
    const [customersResult, dealsResult, activitiesResult] = await Promise.all([
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null),
      supabase
        .from("activities")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("activity_type", "task")
        .is("completed_at", null)
        .is("deleted_at", null),
    ]);

    if (customersResult.error) {
      return { error: customersResult.error.message };
    }
    if (dealsResult.error) {
      return { error: dealsResult.error.message };
    }
    if (activitiesResult.error) {
      return { error: activitiesResult.error.message };
    }

    return {
      data: {
        customers: customersResult.count ?? 0,
        deals: dealsResult.count ?? 0,
        activities: activitiesResult.count ?? 0,
      },
    };
  },

  async listRows({
    supabase,
    table,
    companyId,
    page,
    pageSize,
    search,
  }: ListRowsParams): Promise<
    ServiceResult<{ data: Record<string, unknown>[]; count: number }>
  > {
    const { from, to } = buildPagedRange(
      page,
      pageSize,
      CRM_TABLE_PAGE_SIZE_MAX,
    );
    const searchTerm = search?.trim();
    if (!searchTerm) {
      const { data, error, count } = await supabase
        .from(table)
        .select("*", { count: "exact" })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        return { error: error.message };
      }

      return { data: { data: data ?? [], count: count ?? 0 } };
    }

    const q = `%${searchTerm}%`;
    if (table === "customers") {
      const { data, error, count } = await supabase
        .from("customers")
        .select("*", { count: "exact" })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        return { error: error.message };
      }

      return { data: { data: data ?? [], count: count ?? 0 } };
    }

    const { data: matchedCustomers, error: matchedCustomersError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
        .limit(CRM_SEARCH_MATCH_LIMIT);

    if (matchedCustomersError) {
      return { error: matchedCustomersError.message };
    }

    const customerIds = (matchedCustomers ?? []).map((row) => row.id);
    const stageMatches = getMatchingDealStages(searchTerm);

    if (table === "deals") {
      const orParts = [`title.ilike.${q}`, `description.ilike.${q}`];
      if (customerIds.length) {
        orParts.push(`customer_id.in.(${customerIds.join(",")})`);
      }
      stageMatches.forEach((stage) => orParts.push(`stage.eq.${stage}`));

      const { data, error, count } = await supabase
        .from("deals")
        .select("*", { count: "exact" })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .or(orParts.join(","))
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        return { error: error.message };
      }

      return { data: { data: data ?? [], count: count ?? 0 } };
    }

    const dealSearchParts = [`title.ilike.${q}`, `description.ilike.${q}`];
    if (customerIds.length) {
      dealSearchParts.push(`customer_id.in.(${customerIds.join(",")})`);
    }
    stageMatches.forEach((stage) => dealSearchParts.push(`stage.eq.${stage}`));

    const { data: matchedDeals, error: matchedDealsError } = await supabase
      .from("deals")
      .select("id")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .or(dealSearchParts.join(","))
      .limit(CRM_SEARCH_MATCH_LIMIT);

    if (matchedDealsError) {
      return { error: matchedDealsError.message };
    }

    const dealIds = (matchedDeals ?? []).map((row) => row.id);
    const activityOrParts = [
      `subject.ilike.${q}`,
      `notes.ilike.${q}`,
      `activity_type.ilike.${q}`,
    ];
    if (customerIds.length) {
      activityOrParts.push(
        `and(related_type.eq.customer,related_id.in.(${customerIds.join(",")}))`,
      );
    }
    if (dealIds.length) {
      activityOrParts.push(
        `and(related_type.eq.deal,related_id.in.(${dealIds.join(",")}))`,
      );
    }

    const { data, error, count } = await supabase
      .from("activities")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .or(activityOrParts.join(","))
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return { error: error.message };
    }

    return { data: { data: data ?? [], count: count ?? 0 } };
  },

  async createRow({
    supabase,
    companyId,
    userId,
    payload,
  }: UpsertRowParams): Promise<ServiceResult<Record<string, unknown>>> {
    void userId;

    const standardData = mapStandardByTable(
      payload.table,
      payload.standardData as Record<string, unknown>,
    );
    const sanitizedStandardData = withoutUndefined(standardData);
    const { data, error } = await supabase
      .from(payload.table)
      .insert({
        company_id: companyId,
        ...sanitizedStandardData,
        ...(payload.customData !== undefined
          ? { custom_fields: payload.customData }
          : {}),
      })
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  },

  async updateRow({
    supabase,
    companyId,
    userId,
    payload,
    rowId,
  }: UpsertRowParams): Promise<ServiceResult<Record<string, unknown>>> {
    void userId;
    if (!rowId) {
      return { error: "Row id is required for updates." };
    }

    const standardData = mapStandardByTable(
      payload.table,
      payload.standardData as Record<string, unknown>,
    );
    let mergedCustomFields: Record<string, unknown> | undefined;
    if (payload.customData !== undefined) {
      const { data: existingRow, error: existingRowError } = await supabase
        .from(payload.table)
        .select("*")
        .eq("id", rowId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (existingRowError) {
        return { error: existingRowError.message };
      }
      if (
        existingRow &&
        Object.prototype.hasOwnProperty.call(existingRow, "custom_fields")
      ) {
        mergedCustomFields = {
          ...asRecord((existingRow as Record<string, unknown>).custom_fields),
          ...asRecord(payload.customData),
        };
      }
    }

    let updatePayload = withoutUndefined({
      ...standardData,
      ...(mergedCustomFields !== undefined
        ? { custom_fields: mergedCustomFields }
        : {}),
    });

    if (Object.keys(updatePayload).length === 0) {
      // Avoid PostgREST single() coercion errors on no-op updates.
      updatePayload = {
        updated_at: new Date().toISOString(),
      };
    }
    const expectedUpdatedAt =
      typeof (payload as { expectedUpdatedAt?: unknown }).expectedUpdatedAt ===
      "string"
        ? String((payload as { expectedUpdatedAt?: unknown }).expectedUpdatedAt)
        : undefined;
    let updateQuery = supabase
      .from(payload.table)
      .update(updatePayload)
      .eq("id", rowId)
      .eq("company_id", companyId);
    if (expectedUpdatedAt) {
      updateQuery = updateQuery.eq("updated_at", expectedUpdatedAt);
    }
    const { data, error } = await updateQuery.select("*");

    if (error) {
      return { error: error.message };
    }
    if (!data || data.length === 0) {
      if (expectedUpdatedAt) {
        return {
          error:
            "This row was updated by someone else. Refresh and retry your change.",
        };
      }
      return { error: "Row not found." };
    }

    return { data: data[0] as Record<string, unknown> };
  },

  async deleteRow({
    supabase,
    table,
    rowId,
    companyId,
  }: {
    supabase: SupabaseClient;
    table: CrmTable;
    rowId: string;
    companyId: string;
  }): Promise<ServiceResult<null>> {
    if (table === "customers") {
      const relatedChecks = [
        {
          label: "customer contacts",
          run: () =>
            supabase
              .from("customer_contacts")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("customer_id", rowId)
              .is("deleted_at", null),
        },
        {
          label: "deals",
          run: () =>
            supabase
              .from("deals")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("customer_id", rowId)
              .is("deleted_at", null),
        },
        {
          label: "quotes",
          run: () =>
            supabase
              .from("quotes")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("customer_id", rowId)
              .is("deleted_at", null),
        },
        {
          label: "sales orders",
          run: () =>
            supabase
              .from("sales_orders")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("customer_id", rowId)
              .is("deleted_at", null),
        },
        {
          label: "support tickets",
          run: () =>
            supabase
              .from("support_tickets")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("customer_id", rowId)
              .is("deleted_at", null),
        },
        {
          label: "activities",
          run: () =>
            supabase
              .from("activities")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("related_type", "customer")
              .eq("related_id", rowId)
              .is("deleted_at", null),
        },
      ];
      const relatedResults = await Promise.all(
        relatedChecks.map((check) => check.run()),
      );
      const dependencyErrors = relatedResults.find((result) => result.error);
      if (dependencyErrors?.error) {
        return { error: dependencyErrors.error.message };
      }
      const dependencies = relatedResults
        .map((result, index) => ({
          label: relatedChecks[index].label,
          count: result.count ?? 0,
        }))
        .filter((entry) => entry.count > 0);
      if (dependencies.length > 0) {
        return {
          error: `Cannot delete customer. Remove related data first: ${dependencies.map((entry) => `${entry.label} (${entry.count})`).join(", ")}.`,
        };
      }
    }

    if (table === "deals") {
      const relatedChecks = [
        {
          label: "quotes",
          run: () =>
            supabase
              .from("quotes")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("deal_id", rowId)
              .is("deleted_at", null),
        },
        {
          label: "activities",
          run: () =>
            supabase
              .from("activities")
              .select("id", { count: "exact", head: true })
              .eq("company_id", companyId)
              .eq("related_type", "deal")
              .eq("related_id", rowId)
              .is("deleted_at", null),
        },
      ];
      const relatedResults = await Promise.all(
        relatedChecks.map((check) => check.run()),
      );
      const dependencyErrors = relatedResults.find((result) => result.error);
      if (dependencyErrors?.error) {
        return { error: dependencyErrors.error.message };
      }
      const dependencies = relatedResults
        .map((result, index) => ({
          label: relatedChecks[index].label,
          count: result.count ?? 0,
        }))
        .filter((entry) => entry.count > 0);
      if (dependencies.length > 0) {
        return {
          error: `Cannot delete deal. Remove related data first: ${dependencies.map((entry) => `${entry.label} (${entry.count})`).join(", ")}.`,
        };
      }
    }

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", rowId)
      .eq("company_id", companyId);

    if (error) {
      return { error: error.message };
    }

    return { data: null };
  },

  async getColumnDefinitions({
    supabase,
    companyId,
    entityType,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: CrmEntityType;
  }): Promise<ServiceResult<ColumnDefinition[]>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      logger.error(
        { error, companyId, entityType, context: "crm-metadata" },
        "Load CRM metadata failed",
      );
      return { error: error.message };
    }

    if (!company) {
      logger.warn(
        { companyId, entityType, context: "crm-metadata" },
        "Company not found while loading CRM metadata",
      );
      return { data: [] };
    }

    const metadata = normalizeMetadata(company.settings);
    return {
      data: (metadata[entityType] ?? []).filter((entry) => entry.is_active),
    };
  },

  async saveColumnDefinition({
    supabase,
    companyId,
    entityType,
    column,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: CrmEntityType;
    column: Partial<ColumnDefinition> & {
      field_name?: string;
      field_label?: string;
      field_type?: CustomFieldPayload["fieldType"];
      field_options?: string[] | null;
      is_required?: boolean;
      is_active?: boolean;
    };
  }): Promise<ServiceResult<ColumnDefinition>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      logger.error(
        { error, companyId, entityType, context: "crm-metadata" },
        "Load company settings failed",
      );
      return { error: error.message };
    }

    if (!company) {
      return { error: "Company settings were not found." };
    }

    const fieldName =
      column.field_name || toSnakeCase(column.field_label || "");
    if (!fieldName) {
      return {
        error: "Field name is required to save a CRM column definition.",
      };
    }

    const metadata = normalizeMetadata(company.settings);
    const current = metadata[entityType] ?? [];
    const next = toColumnDefinition({
      ...column,
      entity_type: entityType,
      field_name: fieldName,
    });
    metadata[entityType] = [
      ...current.filter(
        (entry) => entry.id !== next.id && entry.field_name !== next.field_name,
      ),
      next,
    ];

    const nextSettings = applyMetadataToSettings(company.settings, metadata);
    const { error: updateError } = await supabase
      .from("companies")
      .update({ settings: nextSettings })
      .eq("id", companyId)
      .is("deleted_at", null);

    if (updateError) {
      logger.error(
        { error: updateError, companyId, entityType, context: "crm-metadata" },
        "Persist CRM metadata failed",
      );
      return { error: updateError.message };
    }

    logger.info(
      {
        companyId,
        entityType,
        field: next.field_name,
        context: "crm-metadata",
      },
      "CRM column definition saved",
    );
    return { data: next };
  },

  async listCustomFields({
    supabase,
    companyId,
    entityType,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: CrmEntityType;
  }): Promise<ServiceResult<Record<string, unknown>[]>> {
    const response = await this.getColumnDefinitions({
      supabase,
      companyId,
      entityType,
    });
    if (response.error) {
      return { error: response.error };
    }
    return { data: (response.data ?? []) as Record<string, unknown>[] };
  },

  async createCustomField({
    supabase,
    companyId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    payload: CustomFieldPayload;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const response = await this.saveColumnDefinition({
      supabase,
      companyId,
      entityType: payload.entityType,
      column: {
        field_name: payload.fieldName || toSnakeCase(payload.fieldLabel),
        field_label: payload.fieldLabel,
        field_type: payload.fieldType,
        field_options:
          payload.fieldType === "select" || payload.fieldType === "currency"
            ? normalizeOptionValues(
                payload.fieldType,
                payload.fieldOptions ?? [],
              )
            : null,
        is_required: payload.isRequired ?? false,
        is_active: true,
      },
    });

    if (response.error || !response.data) {
      return {
        error: response.error || "Failed to save custom field definition.",
      };
    }

    return { data: response.data };
  },

  async updateCustomField({
    supabase,
    companyId,
    fieldId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    fieldId: string;
    payload: CustomFieldPayload;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const defs = await this.getColumnDefinitions({
      supabase,
      companyId,
      entityType: payload.entityType,
    });
    if (defs.error) {
      return { error: defs.error };
    }

    const existing = (defs.data ?? []).find(
      (entry) => entry.id === fieldId || entry.field_name === fieldId,
    );
    if (!existing) {
      return { error: "Custom field definition was not found." };
    }

    const isTypeChange = existing.field_type !== payload.fieldType;
    const optionBasedType =
      payload.fieldType === "select" || payload.fieldType === "currency";
    const existingOptions = normalizeOptionValues(
      payload.fieldType,
      existing.field_options ?? [],
    );
    const incomingOptions = optionBasedType
      ? normalizeOptionValues(payload.fieldType, payload.fieldOptions ?? [])
      : [];

    const { data: rowsWithCustomFields, error: rowsError } = await supabase
      .from(payload.entityType)
      .select("custom_fields")
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (rowsError) {
      return { error: rowsError.message };
    }

    const usedValues = new Set<string>();
    const hasAnyValue = (rowsWithCustomFields ?? []).some((row) => {
      const fieldValue = asRecord(row.custom_fields)[existing.field_name];
      const used = getUsedOptionValue(payload.fieldType, fieldValue);
      if (used) usedValues.add(used.toLowerCase());
      return hasMeaningfulValue(fieldValue);
    });

    if (isTypeChange && hasAnyValue) {
      return {
        error:
          "Cannot change this column data type because existing row values are present.",
      };
    }

    let nextOptions: string[] | null = null;
    if (optionBasedType) {
      const requestedOptions =
        incomingOptions.length > 0 ? incomingOptions : existingOptions;
      const requestedKeys = new Set(
        requestedOptions.map((value) => value.toLowerCase()),
      );
      const missingUsed = Array.from(usedValues).filter(
        (value) => !requestedKeys.has(value),
      );
      if (missingUsed.length > 0) {
        return {
          error:
            "Cannot remove options already used by existing rows. Add new options instead.",
        };
      }
      nextOptions = requestedOptions;
    }

    const response = await this.saveColumnDefinition({
      supabase,
      companyId,
      entityType: payload.entityType,
      column: {
        ...existing,
        id: existing.id,
        field_name: payload.fieldName || existing.field_name,
        field_label: payload.fieldLabel,
        field_type: payload.fieldType,
        field_options: nextOptions,
        is_required: payload.isRequired ?? false,
        is_active: true,
      },
    });

    if (response.error || !response.data) {
      return {
        error: response.error || "Failed to update custom field definition.",
      };
    }

    return { data: response.data };
  },

  async deleteCustomField({
    supabase,
    companyId,
    fieldId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    fieldId: string;
  }): Promise<ServiceResult<null>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }
    if (!company) {
      return { data: null };
    }

    const metadata = normalizeMetadata(company.settings);
    for (const entityType of ["customers", "deals", "activities"] as const) {
      const values = metadata[entityType] ?? [];
      metadata[entityType] = values.filter(
        (entry) => entry.id !== fieldId && entry.field_name !== fieldId,
      );
    }

    const nextSettings = applyMetadataToSettings(company.settings, metadata);
    const { error: updateError } = await supabase
      .from("companies")
      .update({ settings: nextSettings })
      .eq("id", companyId)
      .is("deleted_at", null);

    if (updateError) {
      return { error: updateError.message };
    }

    return { data: null };
  },

  async listUsersForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = CRM_SELECT_PAGE_SIZE_DEFAULT,
  }: SelectListParams): Promise<
    ServiceResult<{ label: string; value: string }[]>
  > {
    const { from, to } = buildPagedRange(
      page,
      pageSize,
      CRM_SELECT_PAGE_SIZE_MAX,
    );
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .range(from, to);

    if (error) {
      return { error: error.message };
    }

    const options =
      data?.map((profile) => {
        const fullName = profile.full_name || "";
        const email = profile.email || "";
        const fallbackFromEmail = email.includes("@")
          ? titleCase(email.split("@")[0] || "")
          : "";
        return {
          label:
            fullName && !fullName.includes("@")
              ? fullName
              : fallbackFromEmail || email || "Unnamed User",
          value: profile.id,
        };
      }) ?? [];

    return { data: options };
  },

  async listCustomersForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = CRM_SELECT_PAGE_SIZE_DEFAULT,
  }: SelectListParams): Promise<
    ServiceResult<{ label: string; value: string }[]>
  > {
    const { from, to } = buildPagedRange(
      page,
      pageSize,
      CRM_SELECT_PAGE_SIZE_MAX,
    );
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      return { error: error.message };
    }

    const options =
      (data ?? []).map((customer) => ({
        label: customer.name || "Unnamed Customer",
        value: customer.id,
      })) ?? [];

    return { data: options };
  },

  async listDealsForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = CRM_SELECT_PAGE_SIZE_DEFAULT,
  }: SelectListParams): Promise<ServiceResult<SelectOption[]>> {
    const { from, to } = buildPagedRange(
      page,
      pageSize,
      CRM_SELECT_PAGE_SIZE_MAX,
    );
    const { data, error } = await supabase
      .from("deals")
      .select("id, title")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("title", { ascending: true })
      .range(from, to);

    if (error) {
      return { error: error.message };
    }

    const options =
      data?.map((deal) => ({
        label: deal.title || "Untitled Deal",
        value: deal.id,
      })) ?? [];

    return { data: options };
  },
};
