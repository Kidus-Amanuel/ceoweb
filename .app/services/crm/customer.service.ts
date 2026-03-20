import { SupabaseClient } from "@supabase/supabase-js";
import {
  CRM_SEARCH_MATCH_LIMIT,
  CRM_TABLE_PAGE_SIZE_MAX,
} from "@/lib/constants/crm-pagination";
import type { CrmCreateRowInput, CrmUpdateRowInput } from "@/validators/crm";

type ServiceResult<T> = {
  data?: T;
  error?: string;
};

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
  return { from, to };
};

const withoutUndefined = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const mapCustomerStandard = (input: Record<string, unknown>) => ({
  name: input.name,
  email: input.email,
  phone: input.phone,
  type: input.type,
  status: input.status,
  assigned_to: input.assignedTo ?? input.assigned_to,
});

export const customerService = {
  async listRows({
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
    const { from, to } = buildPagedRange(
      page,
      pageSize,
      CRM_TABLE_PAGE_SIZE_MAX,
    );
    const searchTerm = search?.trim();
    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (searchTerm) {
      const q = `%${searchTerm}%`;
      query = query.or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return { error: error.message };
    return { data: { data: data ?? [], count: count ?? 0 } };
  },

  async createRow({
    supabase,
    companyId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    payload: Extract<CrmCreateRowInput, { table: "customers" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const standardData = withoutUndefined(
      mapCustomerStandard(payload.standardData as Record<string, unknown>),
    );
    const { data, error } = await supabase
      .from("customers")
      .insert({
        company_id: companyId,
        ...standardData,
        ...(payload.customData !== undefined
          ? { custom_fields: payload.customData }
          : {}),
      })
      .select("*")
      .single();

    if (error) return { error: error.message };
    return { data };
  },

  async updateRow({
    supabase,
    companyId,
    rowId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    rowId: string;
    payload: Extract<CrmUpdateRowInput, { table: "customers" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    let mergedCustomFields: Record<string, unknown> | undefined;

    if (payload.customData !== undefined) {
      const { data: existingRow, error: existingRowError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", rowId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (existingRowError) return { error: existingRowError.message };
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
      ...mapCustomerStandard(payload.standardData as Record<string, unknown>),
      ...(mergedCustomFields !== undefined
        ? { custom_fields: mergedCustomFields }
        : {}),
    });

    if (Object.keys(updatePayload).length === 0) {
      updatePayload = { updated_at: new Date().toISOString() };
    }

    const expectedUpdatedAt =
      typeof payload.expectedUpdatedAt === "string"
        ? payload.expectedUpdatedAt
        : undefined;

    let query = supabase
      .from("customers")
      .update(updatePayload)
      .eq("id", rowId)
      .eq("company_id", companyId);

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data, error } = await query.select("*");

    if (error) return { error: error.message };
    if (!data || data.length === 0) {
      return expectedUpdatedAt
        ? {
            error:
              "This row was updated by someone else. Refresh and retry your change.",
          }
        : { error: "Row not found." };
    }

    return { data: data[0] as Record<string, unknown> };
  },

  async deleteRow({
    supabase,
    companyId,
    rowId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    rowId: string;
  }): Promise<ServiceResult<null>> {
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
    const dependencyError = relatedResults.find((result) => result.error);
    if (dependencyError?.error) return { error: dependencyError.error.message };

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

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", rowId)
      .eq("company_id", companyId);

    if (error) return { error: error.message };
    return { data: null };
  },

  async searchCustomerIds({
    supabase,
    companyId,
    search,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    search: string;
  }): Promise<ServiceResult<string[]>> {
    const q = `%${search}%`;
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .or(`name.ilike.${q},email.ilike.${q},phone.ilike.${q}`)
      .limit(CRM_SEARCH_MATCH_LIMIT);

    if (error) return { error: error.message };
    return { data: (data ?? []).map((row) => row.id) };
  },
};
