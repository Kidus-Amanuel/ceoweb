import { SupabaseClient } from "@supabase/supabase-js";
import logger from "@/lib/utils/logger";
import {
  CRM_SELECT_PAGE_SIZE_DEFAULT,
  CRM_SELECT_PAGE_SIZE_MAX,
} from "@/lib/constants/crm-pagination";
import type {
  CrmCreateRowInput,
  CrmEntityType,
  CrmTable,
  CrmUpdateRowInput,
} from "@/validators/crm";
import {
  ensureNoCustomFieldValues,
  findMatchingCustomFields,
} from "@/services/custom-field-guards";
import { customerService } from "./customer.service";
import { dealService } from "./deal.service";
import { activityService } from "./activity.service";
import { overviewService } from "./overview.service";

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

const routeByTable = (table: CrmTable) => {
  switch (table) {
    case "customers":
      return customerService;
    case "deals":
      return dealService;
    case "activities":
      return activityService;
    default:
      return activityService;
  }
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const toSnakeCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

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

const normalizeMetadata = (value: unknown): CrmMetadata => {
  const raw = asRecord(value);
  const metadata: CrmMetadata = {};

  for (const entityType of ["customers", "deals", "activities"] as const) {
    const values = raw[entityType];
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

const getCrmMetadata = async ({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}) => {
  const { data, error } = await supabase
    .from("companies")
    .select("settings->crm_metadata")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return { error };
  return { data: normalizeMetadata(asRecord(data).crm_metadata) };
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

      if (membershipError) return { error: membershipError.message };
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

    if (companyError) return { error: companyError.message };
    if (!company?.id) {
      return { error: "Company tenant context could not be resolved." };
    }

    return { data: { companyId: company.id } };
  },

  getTableCounts: overviewService.getTableCounts,
  getMonthlyTrend: overviewService.getMonthlyTrend,
  getOverviewDashboard: overviewService.getOverviewDashboard,

  async listRows({
    supabase,
    table,
    companyId,
    page,
    pageSize,
    search,
  }: {
    supabase: SupabaseClient;
    table: CrmTable;
    companyId: string;
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<
    ServiceResult<{ data: Record<string, unknown>[]; count: number }>
  > {
    if (table === "customers") {
      return customerService.listRows({
        supabase,
        companyId,
        page,
        pageSize,
        search,
      });
    }
    if (table === "deals") {
      return dealService.listRows({
        supabase,
        companyId,
        page,
        pageSize,
        search,
      });
    }

    const searchTerm = search?.trim();
    if (!searchTerm) {
      return activityService.listRows({ supabase, companyId, page, pageSize });
    }

    const customersResult = await customerService.searchCustomerIds({
      supabase,
      companyId,
      search: searchTerm,
    });
    if (customersResult.error) return { error: customersResult.error };

    const dealsResult = await dealService.searchDealIds({
      supabase,
      companyId,
      search: searchTerm,
      customerIds: customersResult.data ?? [],
    });
    if (dealsResult.error) return { error: dealsResult.error };

    return activityService.listRows({
      supabase,
      companyId,
      page,
      pageSize,
      search: searchTerm,
      customerIds: customersResult.data ?? [],
      dealIds: dealsResult.data ?? [],
    });
  },

  async createRow({
    supabase,
    companyId,
    userId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    userId: string;
    payload: CrmCreateRowInput;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    void userId;
    return routeByTable(payload.table).createRow({
      supabase,
      companyId,
      payload: payload as never,
    });
  },

  async updateRow({
    supabase,
    companyId,
    userId,
    payload,
    rowId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    userId: string;
    payload: CrmUpdateRowInput;
    rowId: string;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    void userId;
    return routeByTable(payload.table).updateRow({
      supabase,
      companyId,
      rowId,
      payload: payload as never,
    });
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
    return routeByTable(table).deleteRow({ supabase, companyId, rowId });
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
    const { data, error } = await getCrmMetadata({ supabase, companyId });
    if (error) {
      logger.error(
        { error, companyId, entityType, context: "crm-metadata" },
        "Load CRM metadata failed",
      );
      return { error: error.message };
    }
    return {
      data: (data?.[entityType] ?? []).filter((entry) => entry.is_active),
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
    const fieldName =
      column.field_name || toSnakeCase(column.field_label || "");
    if (!fieldName) {
      return {
        error: "Field name is required to save a CRM column definition.",
      };
    }

    const metadataResult = await getCrmMetadata({ supabase, companyId });
    if (metadataResult.error) {
      logger.error(
        {
          error: metadataResult.error,
          companyId,
          entityType,
          context: "crm-metadata",
        },
        "Load CRM metadata failed",
      );
      return { error: metadataResult.error.message };
    }

    const metadata = metadataResult.data ?? {};
    const current = metadata[entityType] ?? [];
    const next = toColumnDefinition({
      ...column,
      entity_type: entityType,
      field_name: fieldName,
    });
    const existingIndex = current.findIndex(
      (entry) => entry.id === next.id || entry.field_name === next.field_name,
    );
    const nextMetadata =
      existingIndex >= 0
        ? current.map((entry, index) =>
            index === existingIndex ? next : entry,
          )
        : [...current, next];

    const { error } = await supabase.rpc("update_entity_metadata", {
      p_company_id: companyId,
      p_module: "crm_metadata",
      p_entity: entityType,
      p_metadata: nextMetadata,
    });

    if (error) {
      logger.error(
        { error, companyId, entityType, context: "crm-metadata" },
        "Persist CRM metadata failed",
      );
      return { error: error.message };
    }

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
    if (response.error) return { error: response.error };
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
      return { error: "At least one option is required for select fields." };
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
    if (defs.error) return { error: defs.error };

    const existing = (defs.data ?? []).find(
      (entry) => entry.id === fieldId || entry.field_name === fieldId,
    );
    if (!existing) return { error: "Custom field definition was not found." };

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
    if (rowsError) return { error: rowsError.message };

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
        return { error: "At least one option is required for select fields." };
      }
      const requestedKeys = new Set(
        incomingOptions.map((value) => value.toLowerCase()),
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
      nextOptions = incomingOptions;
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
    const metadataResult = await getCrmMetadata({ supabase, companyId });
    if (metadataResult.error) return { error: metadataResult.error.message };

    const metadata = metadataResult.data ?? {};
    const matches = findMatchingCustomFields(
      metadata,
      ["customers", "deals", "activities"] as const,
      fieldId,
    );
    const inUseError = await ensureNoCustomFieldValues({
      supabase,
      companyId,
      matches,
      hasMeaningfulValue,
      errorMessage:
        "Cannot remove options already used by existing rows. Add new options instead.",
    });
    if (inUseError) return { error: inUseError };

    for (const entityType of ["customers", "deals", "activities"] as const) {
      const nextMetadata = (metadata[entityType] ?? []).filter(
        (entry) => entry.id !== fieldId && entry.field_name !== fieldId,
      );
      const { error } = await supabase.rpc("update_entity_metadata", {
        p_company_id: companyId,
        p_module: "crm_metadata",
        p_entity: entityType,
        p_metadata: nextMetadata,
      });
      if (error) return { error: error.message };
    }

    return { data: null };
  },

  async listUsersForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = CRM_SELECT_PAGE_SIZE_DEFAULT,
  }: SelectListParams): Promise<ServiceResult<SelectOption[]>> {
    const safePage = Math.max(1, Math.trunc(page || 1));
    const safePageSize = Math.min(
      CRM_SELECT_PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(pageSize || CRM_SELECT_PAGE_SIZE_DEFAULT)),
    );
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true })
      .range(from, to);
    if (error) return { error: error.message };
    return {
      data:
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
        }) ?? [],
    };
  },

  async listCustomersForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = CRM_SELECT_PAGE_SIZE_DEFAULT,
  }: SelectListParams): Promise<ServiceResult<SelectOption[]>> {
    const safePage = Math.max(1, Math.trunc(page || 1));
    const safePageSize = Math.min(
      CRM_SELECT_PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(pageSize || CRM_SELECT_PAGE_SIZE_DEFAULT)),
    );
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(from, to);
    if (error) return { error: error.message };
    return {
      data: (data ?? []).map((customer) => ({
        label: customer.name || "Unnamed Customer",
        value: customer.id,
      })),
    };
  },

  async listDealsForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = CRM_SELECT_PAGE_SIZE_DEFAULT,
  }: SelectListParams): Promise<ServiceResult<SelectOption[]>> {
    const safePage = Math.max(1, Math.trunc(page || 1));
    const safePageSize = Math.min(
      CRM_SELECT_PAGE_SIZE_MAX,
      Math.max(1, Math.trunc(pageSize || CRM_SELECT_PAGE_SIZE_DEFAULT)),
    );
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    const { data, error } = await supabase
      .from("deals")
      .select("id, title")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("title", { ascending: true })
      .range(from, to);
    if (error) return { error: error.message };
    return {
      data:
        data?.map((deal) => ({
          label: deal.title || "Untitled Deal",
          value: deal.id,
        })) ?? [],
    };
  },
};
