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
import {
  ensureNoCustomFieldValues,
  findMatchingCustomFields,
} from "@/services/custom-field-guards";

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

type MonthlyTrendPoint = {
  month: string;
  key: string;
  customers: number;
  deals: number;
  activities: number;
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
    | "email"
    | "files"
    | "json"
    | "status";
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
  subject: input.subject,
  notes: input.notes,
  due_date: pickMappedValue(input, "dueDate", "due_date"),
  created_by: pickMappedValue(input, "createdBy", "created_by"),
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phonePattern = /^\+?[0-9 ()-]{7,}$/;
const digitsOnly = (value: string) => value.replace(/\D/g, "");
const isValidEmailAddress = (value: string) => emailPattern.test(value.trim());
const isValidPhoneNumber = (value: string) => {
  if (!phonePattern.test(value.trim())) return false;
  const digits = digitsOnly(value);
  return digits.length >= 7 && digits.length <= 15;
};

const isActivitiesStatusColumnError = (table: CrmTable, errorMessage: string) =>
  table === "activities" &&
  /could not find the 'status' column/i.test(errorMessage);

const buildContactDisplay = (
  email: string | null | undefined,
  phone: string | null | undefined,
) => {
  const safeEmail = String(email ?? "").trim();
  const safePhone = String(phone ?? "").trim();
  if (safeEmail && safePhone) return `${safeEmail} • ${safePhone}`;
  return safeEmail || safePhone || "";
};

const enrichDealsContactDisplay = async ({
  supabase,
  companyId,
  rows,
}: {
  supabase: SupabaseClient;
  companyId: string;
  rows: Record<string, unknown>[];
}): Promise<ServiceResult<Record<string, unknown>[]>> => {
  const contactIds = Array.from(
    new Set(
      rows
        .map((row) => String(row.contact_id ?? ""))
        .filter((value) => !!value && uuidPattern.test(value)),
    ),
  );
  const customerIds = Array.from(
    new Set(
      rows
        .map((row) => String(row.customer_id ?? ""))
        .filter((value) => !!value && uuidPattern.test(value)),
    ),
  );

  const [contactsRes, customersRes] = await Promise.all([
    contactIds.length
      ? supabase
          .from("customer_contacts")
          .select("id,email,phone,mobile")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", contactIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            email: string | null;
            phone: string | null;
            mobile: string | null;
          }>,
          error: null,
        }),
    customerIds.length
      ? supabase
          .from("customers")
          .select("id,email,phone")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", customerIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            email: string | null;
            phone: string | null;
          }>,
          error: null,
        }),
  ]);

  if (contactsRes.error) return { error: contactsRes.error.message };
  if (customersRes.error) return { error: customersRes.error.message };

  const contactMap = new Map(
    (contactsRes.data ?? []).map((row) => [
      row.id,
      buildContactDisplay(row.email, row.mobile || row.phone),
    ]),
  );
  const customerMap = new Map(
    (customersRes.data ?? []).map((row) => [
      row.id,
      buildContactDisplay(row.email, row.phone),
    ]),
  );

  return {
    data: rows.map((row) => {
      const contactId = String(row.contact_id ?? "");
      const customerId = String(row.customer_id ?? "");
      const contactDisplay =
        (contactId ? contactMap.get(contactId) : "") ||
        (customerId ? customerMap.get(customerId) : "") ||
        "";
      return { ...row, contact_display: contactDisplay };
    }),
  };
};

const enrichActivitiesCreatedByFromRelations = async ({
  supabase,
  companyId,
  rows,
}: {
  supabase: SupabaseClient;
  companyId: string;
  rows: Record<string, unknown>[];
}): Promise<ServiceResult<Record<string, unknown>[]>> => {
  const customerIds = Array.from(
    new Set(
      rows
        .filter((row) => row.related_type === "customer")
        .map((row) => String(row.related_id ?? ""))
        .filter(Boolean),
    ),
  );
  const dealIds = Array.from(
    new Set(
      rows
        .filter((row) => row.related_type === "deal")
        .map((row) => String(row.related_id ?? ""))
        .filter(Boolean),
    ),
  );

  const [customersRes, dealsRes] = await Promise.all([
    customerIds.length
      ? supabase
          .from("customers")
          .select("id,assigned_to")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", customerIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; assigned_to: string | null }>,
          error: null,
        }),
    dealIds.length
      ? supabase
          .from("deals")
          .select("id,assigned_to")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", dealIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; assigned_to: string | null }>,
          error: null,
        }),
  ]);

  if (customersRes.error) return { error: customersRes.error.message };
  if (dealsRes.error) return { error: dealsRes.error.message };

  const customerAssignedMap = new Map(
    (customersRes.data ?? []).map((row) => [row.id, row.assigned_to]),
  );
  const dealAssignedMap = new Map(
    (dealsRes.data ?? []).map((row) => [row.id, row.assigned_to]),
  );

  return {
    data: rows.map((row) => {
      const relatedId = String(row.related_id ?? "");
      const derivedAssignedTo =
        row.related_type === "customer"
          ? customerAssignedMap.get(relatedId)
          : row.related_type === "deal"
            ? dealAssignedMap.get(relatedId)
            : undefined;
      return derivedAssignedTo
        ? { ...row, created_by: derivedAssignedTo }
        : row;
    }),
  };
};

const resolveAndValidateDealContact = async ({
  supabase,
  companyId,
  standardData,
}: {
  supabase: SupabaseClient;
  companyId: string;
  standardData: Record<string, unknown>;
}): Promise<ServiceResult<Record<string, unknown>>> => {
  const rawContact = standardData.contact_id;
  if (rawContact === undefined || rawContact === null || rawContact === "") {
    return { data: standardData };
  }

  let contactId = String(rawContact).trim();
  if (!uuidPattern.test(contactId)) {
    if (!isValidEmailAddress(contactId) && !isValidPhoneNumber(contactId)) {
      return {
        error: "Contact must be a valid contact id, email, or phone number.",
      };
    }
    const byEmail = isValidEmailAddress(contactId);
    const contactLookup = byEmail
      ? await supabase
          .from("customer_contacts")
          .select("id")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .ilike("email", contactId)
          .maybeSingle()
      : await supabase
          .from("customer_contacts")
          .select("id")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .or(`phone.eq.${contactId},mobile.eq.${contactId}`)
          .maybeSingle();
    if (contactLookup.error) return { error: contactLookup.error.message };
    if (!contactLookup.data?.id) {
      return { error: "No contact found with the provided email or phone." };
    }
    contactId = contactLookup.data.id;
  }

  const { data: contact, error: contactError } = await supabase
    .from("customer_contacts")
    .select("id,customer_id,email,phone,mobile")
    .eq("company_id", companyId)
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();
  if (contactError) return { error: contactError.message };
  if (!contact) return { error: "Selected contact was not found." };

  const customerId = String(standardData.customer_id ?? "").trim();
  if (customerId && String(contact.customer_id) !== customerId) {
    return {
      error: "Selected contact does not belong to the selected customer.",
    };
  }

  const hasValidEmail =
    !!contact.email && isValidEmailAddress(String(contact.email));
  const hasValidPhone =
    (!!contact.phone && isValidPhoneNumber(String(contact.phone))) ||
    (!!contact.mobile && isValidPhoneNumber(String(contact.mobile)));
  if (!hasValidEmail && !hasValidPhone) {
    return { error: "Contact must have a valid email or phone number." };
  }

  return { data: { ...standardData, contact_id: contactId } };
};

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

const shortMonthLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short" });

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

  async getMonthlyTrend({
    supabase,
    companyId,
    months = 6,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    months?: number;
  }): Promise<ServiceResult<MonthlyTrendPoint[]>> {
    const safeMonths = Number.isFinite(months)
      ? Math.max(1, Math.min(24, Math.trunc(months)))
      : 6;
    const now = new Date();
    const monthBuckets = Array.from({ length: safeMonths }, (_, i) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (safeMonths - 1 - i),
        1,
      );
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        month: shortMonthLabel(date),
        key,
        customers: 0,
        deals: 0,
        activities: 0,
      };
    });
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - (safeMonths - 1),
      1,
      0,
      0,
      0,
      0,
    ).toISOString();
    const seed = new Map(monthBuckets.map((point) => [point.key, point]));

    const [customersRes, dealsRes, activitiesRes] = await Promise.all([
      supabase
        .from("customers")
        .select("created_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .gte("created_at", start),
      supabase
        .from("deals")
        .select("created_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .gte("created_at", start),
      supabase
        .from("activities")
        .select("created_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .gte("created_at", start),
    ]);

    if (customersRes.error) return { error: customersRes.error.message };
    if (dealsRes.error) return { error: dealsRes.error.message };
    if (activitiesRes.error) return { error: activitiesRes.error.message };

    for (const row of customersRes.data ?? []) {
      const createdAt = new Date(String(row.created_at ?? ""));
      if (Number.isNaN(createdAt.getTime())) continue;
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const bucket = seed.get(key);
      if (bucket) bucket.customers += 1;
    }
    for (const row of dealsRes.data ?? []) {
      const createdAt = new Date(String(row.created_at ?? ""));
      if (Number.isNaN(createdAt.getTime())) continue;
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const bucket = seed.get(key);
      if (bucket) bucket.deals += 1;
    }
    for (const row of activitiesRes.data ?? []) {
      const createdAt = new Date(String(row.created_at ?? ""));
      if (Number.isNaN(createdAt.getTime())) continue;
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const bucket = seed.get(key);
      if (bucket) bucket.activities += 1;
    }

    return { data: monthBuckets };
  },

  async getOverviewDashboard({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
  }): Promise<
    ServiceResult<{
      counts: { customers: number; deals: number; activities: number };
      trend: MonthlyTrendPoint[];
      topActivities: Record<string, unknown>[];
      recentDeals: Record<string, unknown>[];
      customerMix: { company: number; person: number };
    }>
  > {
    const now = new Date().toISOString();

    // Aggregate all required data in parallel
    const [
      countsResult,
      trendResult,
      activitiesResult,
      dealsResult,
      companyCountResult,
      personCountResult,
    ] = await Promise.all([
      // 1. Table counts
      this.getTableCounts({ supabase, companyId }),

      // 2. Monthly trend (6 months)
      this.getMonthlyTrend({ supabase, companyId, months: 6 }),

      // 3. Top 6 activities (overdue + upcoming)
      supabase
        .from("activities")
        .select("id,subject,due_date,activity_type")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .is("completed_at", null)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(6),

      // 4. Top 6 recently closed deals
      supabase
        .from("deals")
        .select("id,title,value,stage,updated_at")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .in("stage", ["closed_won", "closed_lost"])
        .order("updated_at", { ascending: false })
        .limit(6),

      // 5. Customer mix counts (company/person) without full row payload
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("type", "company")
        .is("deleted_at", null),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("type", "person")
        .is("deleted_at", null),
    ]);

    // Check for errors
    if (countsResult.error) {
      return { error: countsResult.error };
    }
    if (trendResult.error) {
      return { error: trendResult.error };
    }
    if (activitiesResult.error) {
      return { error: activitiesResult.error.message };
    }
    if (dealsResult.error) {
      return { error: dealsResult.error.message };
    }
    if (companyCountResult.error) {
      return { error: companyCountResult.error.message };
    }
    if (personCountResult.error) {
      return { error: personCountResult.error.message };
    }

    const companyCount = companyCountResult.count ?? 0;
    const personCount = personCountResult.count ?? 0;

    return {
      data: {
        counts: countsResult.data!,
        trend: trendResult.data ?? [],
        topActivities: activitiesResult.data ?? [],
        recentDeals: dealsResult.data ?? [],
        customerMix: {
          company: companyCount,
          person: personCount,
        },
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
      if (table === "deals") {
        const enriched = await enrichDealsContactDisplay({
          supabase,
          companyId,
          rows: (data ?? []) as Record<string, unknown>[],
        });
        if (enriched.error) return { error: enriched.error };
        return { data: { data: enriched.data ?? [], count: count ?? 0 } };
      }
      if (table === "activities") {
        const enriched = await enrichActivitiesCreatedByFromRelations({
          supabase,
          companyId,
          rows: (data ?? []) as Record<string, unknown>[],
        });
        if (enriched.error) return { error: enriched.error };
        return { data: { data: enriched.data ?? [], count: count ?? 0 } };
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
      const enriched = await enrichDealsContactDisplay({
        supabase,
        companyId,
        rows: (data ?? []) as Record<string, unknown>[],
      });
      if (enriched.error) return { error: enriched.error };
      return { data: { data: enriched.data ?? [], count: count ?? 0 } };
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
    const enriched = await enrichActivitiesCreatedByFromRelations({
      supabase,
      companyId,
      rows: (data ?? []) as Record<string, unknown>[],
    });
    if (enriched.error) return { error: enriched.error };
    return { data: { data: enriched.data ?? [], count: count ?? 0 } };
  },

  async createRow({
    supabase,
    companyId,
    userId,
    payload,
  }: UpsertRowParams): Promise<ServiceResult<Record<string, unknown>>> {
    void userId;

    let standardData: Record<string, unknown> = mapStandardByTable(
      payload.table,
      payload.standardData as Record<string, unknown>,
    ) as Record<string, unknown>;
    if (payload.table === "deals") {
      const resolved = await resolveAndValidateDealContact({
        supabase,
        companyId,
        standardData: standardData as Record<string, unknown>,
      });
      if (resolved.error) return { error: resolved.error };
      standardData = resolved.data ?? standardData;
    }
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
      if (isActivitiesStatusColumnError(payload.table, error.message)) {
        const retryPayload = { ...sanitizedStandardData };
        delete retryPayload.status;
        const retry = await supabase
          .from(payload.table)
          .insert({
            company_id: companyId,
            ...retryPayload,
            ...(payload.customData !== undefined
              ? { custom_fields: payload.customData }
              : {}),
          })
          .select("*")
          .single();
        if (retry.error) return { error: retry.error.message };
        if (payload.table === "deals") {
          const enriched = await enrichDealsContactDisplay({
            supabase,
            companyId,
            rows: [retry.data as Record<string, unknown>],
          });
          if (enriched.error) return { error: enriched.error };
          return { data: enriched.data?.[0] };
        }
        return { data: retry.data };
      }
      return { error: error.message };
    }
    if (payload.table === "deals") {
      const enriched = await enrichDealsContactDisplay({
        supabase,
        companyId,
        rows: [data as Record<string, unknown>],
      });
      if (enriched.error) return { error: enriched.error };
      return { data: enriched.data?.[0] };
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

    let standardData: Record<string, unknown> = mapStandardByTable(
      payload.table,
      payload.standardData as Record<string, unknown>,
    ) as Record<string, unknown>;
    if (payload.table === "deals") {
      const resolved = await resolveAndValidateDealContact({
        supabase,
        companyId,
        standardData: standardData as Record<string, unknown>,
      });
      if (resolved.error) return { error: resolved.error };
      standardData = resolved.data ?? standardData;
    }
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
      if (isActivitiesStatusColumnError(payload.table, error.message)) {
        const retryPayload = { ...updatePayload };
        delete retryPayload.status;
        let retryQuery = supabase
          .from(payload.table)
          .update(retryPayload)
          .eq("id", rowId)
          .eq("company_id", companyId);
        if (expectedUpdatedAt) {
          retryQuery = retryQuery.eq("updated_at", expectedUpdatedAt);
        }
        const retry = await retryQuery.select("*");
        if (retry.error) return { error: retry.error.message };
        if (!retry.data || retry.data.length === 0) {
          if (expectedUpdatedAt) {
            return {
              error:
                "This row was updated by someone else. Refresh and retry your change.",
            };
          }
          return { error: "Row not found." };
        }
        if (payload.table === "deals") {
          const enriched = await enrichDealsContactDisplay({
            supabase,
            companyId,
            rows: [retry.data[0] as Record<string, unknown>],
          });
          if (enriched.error) return { error: enriched.error };
          return { data: enriched.data?.[0] };
        }
        return { data: retry.data[0] as Record<string, unknown> };
      }
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

    if (payload.table === "deals") {
      const enriched = await enrichDealsContactDisplay({
        supabase,
        companyId,
        rows: [data[0] as Record<string, unknown>],
      });
      if (enriched.error) return { error: enriched.error };
      return { data: enriched.data?.[0] };
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
    const existingIndex = current.findIndex(
      (entry) => entry.id === next.id || entry.field_name === next.field_name,
    );
    if (existingIndex >= 0) {
      const reordered = [...current];
      reordered[existingIndex] = next;
      metadata[entityType] = reordered;
    } else {
      metadata[entityType] = [...current, next];
    }

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
    const optionBasedType =
      payload.fieldType === "select" ||
      payload.fieldType === "currency" ||
      payload.fieldType === "status";
    const normalizedOptions = optionBasedType
      ? normalizeOptionValues(payload.fieldType, payload.fieldOptions ?? [])
      : [];
    if (optionBasedType && normalizedOptions.length === 0) {
      return {
        error: "At least one option is required for select fields.",
      };
    }

    const response = await this.saveColumnDefinition({
      supabase,
      companyId,
      entityType: payload.entityType,
      column: {
        field_name: payload.fieldName || toSnakeCase(payload.fieldLabel),
        field_label: payload.fieldLabel,
        field_type: payload.fieldType,
        field_options: optionBasedType ? normalizedOptions : null,
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
      payload.fieldType === "select" ||
      payload.fieldType === "currency" ||
      payload.fieldType === "status";
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
      if (incomingOptions.length === 0) {
        return {
          error: "At least one option is required for select fields.",
        };
      }
      const requestedOptions = incomingOptions;
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
    const matchingFields = findMatchingCustomFields(
      metadata,
      ["customers", "deals", "activities"] as const,
      fieldId,
    );
    const inUseError = await ensureNoCustomFieldValues({
      supabase,
      companyId,
      matches: matchingFields,
      hasMeaningfulValue: (value) => hasMeaningfulValue(value),
      errorMessage:
        "Cannot remove options already used by existing rows. Add new options instead.",
    });
    if (inUseError) {
      return { error: inUseError };
    }

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
