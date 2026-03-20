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

const logStockMovement = async ({
  supabase,
  companyId,
  productId,
  warehouseId,
  movementType,
  quantityChange,
}: {
  supabase: SupabaseClient;
  companyId: string;
  productId: string | null | undefined;
  warehouseId: string | null | undefined;
  movementType: "receive" | "adjustment";
  quantityChange: number;
}) => {
  if (!productId || !warehouseId || quantityChange === 0)
    return { error: null };

  const { error } = await supabase.from("stock_movements").insert({
    company_id: companyId,
    product_id: productId,
    warehouse_id: warehouseId,
    movement_type: movementType,
    quantity_change: quantityChange,
  });

  return { error };
};

export const stockService = {
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
      .from("stock_levels")
      .select(
        "*, product:product_id(name, reorder_level), warehouse:warehouse_id(name)",
        { count: "exact" },
      )
      .eq("company_id", companyId);
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
    payload: Extract<InventoryCreateRowInput, { table: "stock_levels" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const warehouseId = String(payload.standardData.warehouse_id ?? "");
    const productId = String(payload.standardData.product_id ?? "");
    const incomingQuantity = Number(payload.standardData.quantity ?? 0);

    const { data: existingRow, error: existingError } = await supabase
      .from("stock_levels")
      .select("id, product_id, warehouse_id, quantity")
      .eq("company_id", companyId)
      .eq("warehouse_id", warehouseId)
      .eq("product_id", productId)
      .maybeSingle();
    if (existingError) return { error: existingError.message };

    const existingQuantity = Number(existingRow?.quantity ?? 0);
    const newTotal = existingQuantity + incomingQuantity;

    const upsertPayload = withoutUndefined({
      id: existingRow?.id,
      company_id: companyId,
      warehouse_id: warehouseId,
      product_id: productId,
      quantity: newTotal,
      custom_fields: payload.customData ?? {},
      updated_at: new Date().toISOString(),
    });

    const { data, error } = await supabase
      .from("stock_levels")
      .upsert(upsertPayload, { onConflict: "warehouse_id,product_id" })
      .select(
        "*, product:product_id(name, reorder_level), warehouse:warehouse_id(name)",
      )
      .single();
    if (error) return { error: error.message };

    const movementResult = await logStockMovement({
      supabase,
      companyId,
      productId,
      warehouseId,
      movementType: "receive",
      quantityChange: newTotal - existingQuantity,
    });
    if (movementResult.error) return { error: movementResult.error.message };

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
    payload: Extract<InventoryUpdateRowInput, { table: "stock_levels" }>;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const { data: currentRow, error: currentError } = await supabase
      .from("stock_levels")
      .select("id, product_id, warehouse_id, quantity")
      .eq("id", rowId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (currentError) return { error: currentError.message };
    if (!currentRow) return { error: "Row not found." };

    const next = withoutUndefined({
      ...payload.standardData,
      updated_at: new Date().toISOString(),
    });
    if (payload.customData !== undefined)
      next.custom_fields = payload.customData;

    const oldQuantity = Number(currentRow.quantity ?? 0);
    const newQuantity = Number(
      next.quantity !== undefined ? next.quantity : (currentRow.quantity ?? 0),
    );
    const quantityChange = newQuantity - oldQuantity;

    const { data, error } = await supabase
      .from("stock_levels")
      .update(next)
      .eq("id", rowId)
      .eq("company_id", companyId)
      .select(
        "*, product:product_id(name, reorder_level), warehouse:warehouse_id(name)",
      )
      .single();
    if (error) return { error: error.message };

    const movementResult = await logStockMovement({
      supabase,
      companyId,
      productId: String(next.product_id ?? currentRow.product_id ?? ""),
      warehouseId: String(next.warehouse_id ?? currentRow.warehouse_id ?? ""),
      movementType: "adjustment",
      quantityChange,
    });
    if (movementResult.error) return { error: movementResult.error.message };

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
      .from("stock_levels")
      .delete()
      .eq("id", rowId)
      .eq("company_id", companyId);
    if (error) return { error: error.message };
    return { data: null };
  },
};
