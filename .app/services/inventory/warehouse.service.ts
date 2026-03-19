import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryCreateRowInput,
  InventoryUpdateRowInput,
} from "@/validators/inventory";

type ServiceResult<T> = { data?: T; error?: string };

const withoutUndefined = (value: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

export const warehouseService = {
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
    let query = supabase
      .from("warehouses")
      .select("*", { count: "exact" })
      .eq("company_id", companyId)
      .is("deleted_at", null);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,code.ilike.%${search}%,location.ilike.%${search}%`,
      );
    }
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
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

  async create({
    supabase,
    companyId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    payload: Extract<InventoryCreateRowInput, { table: "warehouses" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const { data, error } = await supabase
      .from("warehouses")
      .insert(
        withoutUndefined({
          company_id: companyId,
          ...payload.standardData,
          custom_fields: payload.customData ?? {},
        }),
      )
      .select()
      .single();
    if (error) return { error: error.message };
    return { data: data as Record<string, unknown> };
  },

  async update({
    supabase,
    companyId,
    rowId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    rowId: string;
    payload: Extract<InventoryUpdateRowInput, { table: "warehouses" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const next = withoutUndefined({
      ...payload.standardData,
      updated_at: new Date().toISOString(),
    });
    if (payload.customData !== undefined)
      next.custom_fields = payload.customData;
    const { data, error } = await supabase
      .from("warehouses")
      .update(next)
      .eq("id", rowId)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .select()
      .single();
    if (error) return { error: error.message };
    return { data: data as Record<string, unknown> };
  },

  async remove({
    supabase,
    companyId,
    rowId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    rowId: string;
  }): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from("warehouses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("company_id", companyId)
      .is("deleted_at", null);
    if (error) return { error: error.message };
    return { data: null };
  },
};
