import { SupabaseClient } from "@supabase/supabase-js";
import logger from "@/lib/utils/logger";
import { findMatchingCustomFields } from "@/services/custom-field-guards";
import {
  InventoryCreateRowInput,
  InventoryCustomFieldType,
  InventoryEntityType,
  InventoryTable,
  InventoryUpdateRowInput,
} from "@/validators/inventory";
import { productService } from "./product.service";
import { supplierService } from "./supplier.service";
import { warehouseService } from "./warehouse.service";
import { stockService } from "./stock.service";
import { overviewService } from "./overview.service";

type ServiceResult<T> = { data?: T; error?: string };

type TenantContextParams = {
  supabase: SupabaseClient;
  companyId: string;
  userId: string;
  isSuperAdmin: boolean;
};

type TenantContext = {
  companyId: string;
};

type InventoryCustomFieldPayload = {
  entityType: InventoryEntityType;
  fieldName: string;
  fieldLabel: string;
  fieldType: InventoryCustomFieldType;
  fieldOptions?: string[];
  isRequired?: boolean;
};

type ColumnDefinition = {
  id: string;
  entity_type: InventoryEntityType;
  field_name: string;
  field_label: string;
  field_type: InventoryCustomFieldPayload["fieldType"];
  field_options: string[] | null;
  is_required: boolean;
  is_active: boolean;
};

type InventoryMetadata = Partial<
  Record<InventoryEntityType, ColumnDefinition[]>
>;
type SelectOption = { label: string; value: string };
type SelectListParams = {
  supabase: SupabaseClient;
  companyId: string;
  page?: number;
  pageSize?: number;
};

const buildPagedRange = (page: number, pageSize: number) => {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(500, Math.max(1, Math.trunc(pageSize)))
    : 200;
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  return { from, to };
};

const stockMovementsService = {
  async list({
    supabase,
    companyId,
    page,
    pageSize,
    search,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<
    ServiceResult<{ data: Record<string, unknown>[]; count: number }>
  > {
    const { from, to } = buildPagedRange(page, pageSize);
    let query = supabase
      .from("stock_movements")
      .select("*, product:product_id(name), warehouse:warehouse_id(name)", {
        count: "exact",
      })
      .eq("company_id", companyId);

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `movement_type.ilike.${term},product.name.ilike.${term},warehouse.name.ilike.${term}`,
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return { error: error.message };
    return {
      data: {
        data: (data ?? []) as Record<string, unknown>[],
        count: count ?? 0,
      },
    };
  },

  async create(): Promise<ServiceResult<Record<string, unknown>>> {
    return {
      error:
        "Stock History is an immutable audit trail and cannot be modified.",
    };
  },

  async update(): Promise<ServiceResult<Record<string, unknown>>> {
    return {
      error:
        "Stock History is an immutable audit trail and cannot be modified.",
    };
  },

  async remove(): Promise<ServiceResult<null>> {
    return {
      error:
        "Stock History is an immutable audit trail and cannot be modified.",
    };
  },
};

const routeByTable = (
  table: InventoryTable | "stock_movements" | "overviews",
) => {
  switch (table) {
    case "products":
      return productService;
    case "suppliers":
      return supplierService;
    case "warehouses":
      return warehouseService;
    case "stock_levels":
      return stockService;
    case "stock_movements":
      return stockMovementsService;
    case "overviews":
      return overviewService;
    default:
      return stockService;
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

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return Object.keys(asRecord(value)).length > 0;
};

const normalizeOptionValues = (
  fieldType: InventoryCustomFieldType,
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

const normalizeMetadata = (value: unknown): InventoryMetadata => {
  const raw = asRecord(value);
  const metadata: InventoryMetadata = {};
  for (const entityType of [
    "products",
    "suppliers",
    "warehouses",
    "stock_levels",
  ] as const) {
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

const getInventoryMetadata = async ({
  supabase,
  companyId,
}: {
  supabase: SupabaseClient;
  companyId: string;
}) => {
  const { data, error } = await supabase
    .from("companies")
    .select("settings->inventory_metadata")
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return { error };
  return { data: normalizeMetadata(asRecord(data).inventory_metadata) };
};

const hasCustomFieldValueInEntity = async ({
  supabase,
  companyId,
  entityType,
  fieldName,
}: {
  supabase: SupabaseClient;
  companyId: string;
  entityType: InventoryEntityType;
  fieldName: string;
}) => {
  let query = supabase
    .from(entityType)
    .select("custom_fields")
    .eq("company_id", companyId);
  if (entityType !== "stock_levels") {
    query = query.is("deleted_at", null);
  }
  const { data, error } = await query;
  if (error) return { error: error.message, hasValue: false };
  const hasValue = (data ?? []).some((row) =>
    hasMeaningfulValue(
      asRecord((row as { custom_fields?: unknown }).custom_fields)[fieldName],
    ),
  );
  return { hasValue, error: null as string | null };
};

export const inventoryService = {
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

  async listRows({
    supabase,
    table,
    companyId,
    page,
    pageSize,
    search,
  }: {
    supabase: SupabaseClient;
    table: InventoryTable | "stock_movements";
    companyId: string;
    page: number;
    pageSize: number;
    search?: string;
  }) {
    const response = await routeByTable(table).list({
      supabase,
      companyId,
      page,
      pageSize,
      search,
    });
    if (response.error) {
      logger.error(
        { companyId, table, error: response.error },
        "Inventory listRows failed",
      );
    }
    return response;
  },

  async createRow({
    supabase,
    companyId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    userId: string;
    payload: InventoryCreateRowInput;
  }) {
    const response = await routeByTable(payload.table).create({
      supabase,
      companyId,
      payload: payload as never,
    });
    if (response.error) {
      logger.error(
        { companyId, table: payload.table, error: response.error },
        "Inventory createRow failed",
      );
    }
    return response;
  },

  async updateRow({
    supabase,
    companyId,
    payload,
    rowId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    userId: string;
    payload: InventoryUpdateRowInput;
    rowId: string;
  }) {
    const response = await routeByTable(payload.table).update({
      supabase,
      companyId,
      rowId,
      payload: payload as never,
    });
    if (response.error) {
      logger.error(
        { companyId, table: payload.table, rowId, error: response.error },
        "Inventory updateRow failed",
      );
    }
    return response;
  },

  async deleteRow({
    supabase,
    table,
    rowId,
    companyId,
  }: {
    supabase: SupabaseClient;
    table: InventoryTable | "stock_movements";
    rowId: string;
    companyId: string;
  }) {
    const response = await routeByTable(table).remove({
      supabase,
      companyId,
      rowId,
    });
    if (response.error) {
      logger.error(
        { companyId, table, rowId, error: response.error },
        "Inventory deleteRow failed",
      );
    }
    return response;
  },

  async getColumnDefinitions({
    supabase,
    companyId,
    entityType,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: InventoryEntityType;
  }): Promise<ServiceResult<ColumnDefinition[]>> {
    const { data, error } = await getInventoryMetadata({ supabase, companyId });
    if (error) {
      logger.error(
        { error, companyId, entityType, context: "inventory-metadata" },
        "Load inventory metadata failed",
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
    entityType: InventoryEntityType;
    column: Partial<ColumnDefinition> & {
      field_name?: string;
      field_label?: string;
      field_type?: InventoryCustomFieldType;
      field_options?: string[] | null;
      is_required?: boolean;
      is_active?: boolean;
    };
  }): Promise<ServiceResult<ColumnDefinition>> {
    const fieldName =
      column.field_name || toSnakeCase(column.field_label || "");
    if (!fieldName) {
      return {
        error: "Field name is required to save an inventory column definition.",
      };
    }

    const metadataResult = await getInventoryMetadata({ supabase, companyId });
    if (metadataResult.error) {
      logger.error(
        {
          error: metadataResult.error,
          companyId,
          entityType,
          context: "inventory-metadata",
        },
        "Load inventory metadata failed",
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
      p_module: "inventory_metadata",
      p_entity: entityType,
      p_metadata: nextMetadata,
    });

    if (error) {
      logger.error(
        { error, companyId, entityType, context: "inventory-metadata" },
        "Persist inventory metadata failed",
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
    entityType: InventoryEntityType;
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
    payload: InventoryCustomFieldPayload;
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
    payload: InventoryCustomFieldPayload;
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
        ...existing,
        id: existing.id,
        field_name: payload.fieldName || existing.field_name,
        field_label: payload.fieldLabel,
        field_type: payload.fieldType,
        field_options: optionBasedType ? normalizedOptions : null,
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
    const metadataResult = await getInventoryMetadata({ supabase, companyId });
    if (metadataResult.error) return { error: metadataResult.error.message };

    const metadata = metadataResult.data ?? {};
    const matches = findMatchingCustomFields(
      metadata,
      ["products", "suppliers", "warehouses", "stock_levels"] as const,
      fieldId,
    );
    if (!matches.length) return { data: null };

    for (const match of matches) {
      const { hasValue, error } = await hasCustomFieldValueInEntity({
        supabase,
        companyId,
        entityType: match.entityType,
        fieldName: match.fieldName,
      });
      if (error) return { error };
      if (hasValue) {
        return {
          error:
            "Custom field values exist. Clear the data before deleting the field.",
        };
      }
    }

    for (const match of matches) {
      const current = metadata[match.entityType] ?? [];
      const nextMetadata = current.filter(
        (entry) => entry.id !== fieldId && entry.field_name !== fieldId,
      );
      const { error } = await supabase.rpc("update_entity_metadata", {
        p_company_id: companyId,
        p_module: "inventory_metadata",
        p_entity: match.entityType,
        p_metadata: nextMetadata,
      });
      if (error) {
        logger.error(
          {
            error,
            companyId,
            entityType: match.entityType,
            context: "inventory-metadata",
          },
          "Delete inventory metadata failed",
        );
        return { error: error.message };
      }
    }

    return { data: null };
  },

  async listProductsForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = 200,
  }: SelectListParams): Promise<ServiceResult<SelectOption[]>> {
    const { from, to } = buildPagedRange(page, pageSize);
    const { data, error } = await supabase
      .from("products")
      .select("id,name")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(from, to);
    if (error) return { error: error.message };
    return {
      data: (data ?? []).map((row) => ({
        label: row.name || "Unnamed Product",
        value: row.id,
      })),
    };
  },

  async listWarehousesForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = 200,
  }: SelectListParams): Promise<ServiceResult<SelectOption[]>> {
    const { from, to } = buildPagedRange(page, pageSize);
    const { data, error } = await supabase
      .from("warehouses")
      .select("id,name")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(from, to);
    if (error) return { error: error.message };
    return {
      data: (data ?? []).map((row) => ({
        label: row.name || "Unnamed Warehouse",
        value: row.id,
      })),
    };
  },

  async listSuppliersForSelect({
    supabase,
    companyId,
    page = 1,
    pageSize = 200,
  }: SelectListParams): Promise<ServiceResult<SelectOption[]>> {
    const { from, to } = buildPagedRange(page, pageSize);
    const { data, error } = await supabase
      .from("suppliers")
      .select("id,name")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(from, to);
    if (error) return { error: error.message };
    return {
      data: (data ?? []).map((row) => ({
        label: row.name || "Unnamed Supplier",
        value: row.id,
      })),
    };
  },

  async getInventoryOverview({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
  }) {
    return overviewService.getInventoryOverview({
      supabase,
      companyId,
    });
  },
};
