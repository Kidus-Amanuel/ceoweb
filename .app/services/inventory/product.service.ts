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

const productSelect =
  "id, company_id, sku, name, description, category_id, supplier_id, type, unit, units_per_package, cost_price, selling_price, reorder_level, is_active, custom_fields, created_at, updated_at, supplier:supplier_id(id,name)";

export const productService = {
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
      .from("products")
      .select(productSelect, { count: "exact" })
      .eq("company_id", companyId)
      .is("deleted_at", null);
    if (search) {
      query = query.or(
        `sku.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`,
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
    payload: Extract<InventoryCreateRowInput, { table: "products" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const standardData = payload.standardData as Record<string, unknown>;
    const { data, error } = await supabase
      .from("products")
      .insert(
        withoutUndefined({
          company_id: companyId,
          ...standardData,
          supplier_id: standardData.supplier_id,
          units_per_package: standardData.units_per_package,
          custom_fields: payload.customData ?? {},
        }),
      )
      .select(productSelect)
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
    payload: Extract<InventoryUpdateRowInput, { table: "products" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const standardData = payload.standardData as Record<string, unknown>;
    const next = withoutUndefined({
      ...standardData,
      supplier_id: standardData.supplier_id,
      units_per_package: standardData.units_per_package,
      updated_at: new Date().toISOString(),
    });
    if (payload.customData !== undefined)
      next.custom_fields = payload.customData;
    const { data, error } = await supabase
      .from("products")
      .update(next)
      .eq("id", rowId)
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .select(productSelect)
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
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("company_id", companyId)
      .is("deleted_at", null);
    if (error) return { error: error.message };
    return { data: null };
  },
};
