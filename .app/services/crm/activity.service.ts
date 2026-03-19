import { SupabaseClient } from "@supabase/supabase-js";
import {
  CRM_SEARCH_MATCH_LIMIT,
  CRM_TABLE_PAGE_SIZE_MAX,
} from "@/lib/constants/crm-pagination";
import type {
  CrmCreateRowInput,
  CrmTable,
  CrmUpdateRowInput,
} from "@/validators/crm";

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

const isActivitiesStatusColumnError = (table: CrmTable, errorMessage: string) =>
  table === "activities" &&
  /could not find the 'status' column/i.test(errorMessage);

export const mapActivityStandard = (input: Record<string, unknown>) => ({
  related_type: pickMappedValue(input, "relatedType", "related_type"),
  related_id: pickMappedValue(input, "relatedId", "related_id"),
  activity_type: pickMappedValue(input, "activityType", "activity_type"),
  status: input.status,
  subject: input.subject,
  notes: input.notes,
  due_date: pickMappedValue(input, "dueDate", "due_date"),
  created_by: pickMappedValue(input, "createdBy", "created_by"),
  completed_at: pickMappedValue(input, "completedAt", "completed_at"),
});

export const enrichActivitiesRelations = async ({
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
  const userIds = Array.from(
    new Set(rows.map((row) => String(row.created_by ?? "")).filter(Boolean)),
  );

  const [customersRes, dealsRes, usersRes] = await Promise.all([
    customerIds.length
      ? supabase
          .from("customers")
          .select("id,name,assigned_to")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", customerIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            name: string | null;
            assigned_to: string | null;
          }>,
          error: null,
        }),
    dealIds.length
      ? supabase
          .from("deals")
          .select("id,title,assigned_to")
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .in("id", dealIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            title: string | null;
            assigned_to: string | null;
          }>,
          error: null,
        }),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id,full_name,email")
          .eq("company_id", companyId)
          .in("id", userIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            full_name: string | null;
            email: string | null;
          }>,
          error: null,
        }),
  ]);

  if (customersRes.error) return { error: customersRes.error.message };
  if (dealsRes.error) return { error: dealsRes.error.message };
  if (usersRes.error) return { error: usersRes.error.message };

  const customerMap = new Map(
    (customersRes.data ?? []).map((row) => [row.id, row]),
  );
  const dealMap = new Map((dealsRes.data ?? []).map((row) => [row.id, row]));
  const userMap = new Map((usersRes.data ?? []).map((row) => [row.id, row]));

  return {
    data: rows.map((row) => {
      const relatedId = String(row.related_id ?? "");
      const customer =
        row.related_type === "customer"
          ? customerMap.get(relatedId)
          : undefined;
      const deal =
        row.related_type === "deal" ? dealMap.get(relatedId) : undefined;
      const derivedAssignedTo = customer?.assigned_to ?? deal?.assigned_to;
      const createdById = String(row.created_by ?? derivedAssignedTo ?? "");
      const createdByUser = userMap.get(createdById);
      return {
        ...row,
        ...(customer ? { customer: { name: customer.name } } : {}),
        ...(deal ? { deal: { title: deal.title } } : {}),
        ...(createdById ? { created_by: createdById } : {}),
        ...(createdByUser
          ? {
              assigned_user: {
                full_name: createdByUser.full_name,
                email: createdByUser.email,
              },
            }
          : {}),
      };
    }),
  };
};

export const activityService = {
  async listRows({
    supabase,
    companyId,
    page,
    pageSize,
    search,
    customerIds = [],
    dealIds = [],
  }: {
    supabase: SupabaseClient;
    companyId: string;
    page: number;
    pageSize: number;
    search?: string;
    customerIds?: string[];
    dealIds?: string[];
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
      .from("activities")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (searchTerm) {
      const q = `%${searchTerm}%`;
      const orParts = [
        `subject.ilike.${q}`,
        `notes.ilike.${q}`,
        `activity_type.ilike.${q}`,
      ];
      if (customerIds.length) {
        orParts.push(
          `and(related_type.eq.customer,related_id.in.(${customerIds.join(",")}))`,
        );
      }
      if (dealIds.length) {
        orParts.push(
          `and(related_type.eq.deal,related_id.in.(${dealIds.join(",")}))`,
        );
      }
      query = query.or(orParts.join(","));
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return { error: error.message };
    const enriched = await enrichActivitiesRelations({
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
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    payload: Extract<CrmCreateRowInput, { table: "activities" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const standardData = withoutUndefined(
      mapActivityStandard(payload.standardData as Record<string, unknown>),
    );

    const runInsert = (values: Record<string, unknown>) =>
      supabase
        .from("activities")
        .insert({
          company_id: companyId,
          ...values,
          ...(payload.customData !== undefined
            ? { custom_fields: payload.customData }
            : {}),
        })
        .select("*")
        .single();

    let result = await runInsert(standardData);
    if (
      result.error &&
      isActivitiesStatusColumnError("activities", result.error.message)
    ) {
      const retryPayload = { ...standardData };
      delete retryPayload.status;
      result = await runInsert(retryPayload);
    }

    if (result.error) return { error: result.error.message };
    const enriched = await enrichActivitiesRelations({
      supabase,
      companyId,
      rows: [result.data as Record<string, unknown>],
    });
    if (enriched.error) return { error: enriched.error };
    return { data: enriched.data?.[0] };
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
    payload: Extract<CrmUpdateRowInput, { table: "activities" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    let mergedCustomFields: Record<string, unknown> | undefined;

    if (payload.customData !== undefined) {
      const { data: existingRow, error: existingRowError } = await supabase
        .from("activities")
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
      ...mapActivityStandard(payload.standardData as Record<string, unknown>),
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

    const runUpdate = (values: Record<string, unknown>) => {
      let query = supabase
        .from("activities")
        .update(values)
        .eq("id", rowId)
        .eq("company_id", companyId);
      if (expectedUpdatedAt) {
        query = query.eq("updated_at", expectedUpdatedAt);
      }
      return query.select("*");
    };

    let result = await runUpdate(updatePayload);
    if (
      result.error &&
      isActivitiesStatusColumnError("activities", result.error.message)
    ) {
      const retryPayload = { ...updatePayload };
      delete retryPayload.status;
      result = await runUpdate(retryPayload);
    }

    if (result.error) return { error: result.error.message };
    if (!result.data || result.data.length === 0) {
      return expectedUpdatedAt
        ? {
            error:
              "This row was updated by someone else. Refresh and retry your change.",
          }
        : { error: "Row not found." };
    }

    const enriched = await enrichActivitiesRelations({
      supabase,
      companyId,
      rows: [result.data[0] as Record<string, unknown>],
    });
    if (enriched.error) return { error: enriched.error };
    return { data: enriched.data?.[0] };
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
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", rowId)
      .eq("company_id", companyId);

    if (error) return { error: error.message };
    return { data: null };
  },

  async searchActivityRows({
    supabase,
    companyId,
    search,
    customerIds = [],
    dealIds = [],
  }: {
    supabase: SupabaseClient;
    companyId: string;
    search: string;
    customerIds?: string[];
    dealIds?: string[];
  }): Promise<ServiceResult<string[]>> {
    const q = `%${search}%`;
    const orParts = [
      `subject.ilike.${q}`,
      `notes.ilike.${q}`,
      `activity_type.ilike.${q}`,
    ];
    if (customerIds.length) {
      orParts.push(
        `and(related_type.eq.customer,related_id.in.(${customerIds.join(",")}))`,
      );
    }
    if (dealIds.length) {
      orParts.push(
        `and(related_type.eq.deal,related_id.in.(${dealIds.join(",")}))`,
      );
    }

    const { data, error } = await supabase
      .from("activities")
      .select("id")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .or(orParts.join(","))
      .limit(CRM_SEARCH_MATCH_LIMIT);

    if (error) return { error: error.message };
    return { data: (data ?? []).map((row) => row.id) };
  },
};
