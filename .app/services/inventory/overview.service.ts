import type { SupabaseClient } from "@supabase/supabase-js";

type ServiceResult<T> = { data?: T; error?: string };

type OverviewMetric = {
  totalInventoryValue: number;
  lowStockAlertCount: number;
  totalActiveSuppliers: number;
  recentStockMovements: Record<string, unknown>[];
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const overviewService = {
  async getInventoryOverview({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
  }): Promise<ServiceResult<OverviewMetric>> {
    const [
      stockLevelsResult,
      suppliersResult,
      recentMovementsResult,
    ] = await Promise.all([
      supabase
        .from("stock_levels")
        .select(
          "quantity, product:product_id(selling_price, reorder_level)",
        )
        .eq("company_id", companyId),
      supabase
        .from("suppliers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .eq("is_active", true),
      supabase
        .from("stock_movements")
        .select(
          "*, product:product_id(name), warehouse:warehouse_id(name)",
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (stockLevelsResult.error) {
      return { error: stockLevelsResult.error.message };
    }
    if (suppliersResult.error) {
      return { error: suppliersResult.error.message };
    }
    if (recentMovementsResult.error) {
      return { error: recentMovementsResult.error.message };
    }

    const stockRows = (stockLevelsResult.data ?? []) as Array<{
      quantity?: unknown;
      product?: { selling_price?: unknown; reorder_level?: unknown } | null;
    }>;

    const totalInventoryValue = stockRows.reduce((sum, row) => {
      const quantity = toNumber(row.quantity);
      const sellingPrice = toNumber(row.product?.selling_price);
      return sum + quantity * sellingPrice;
    }, 0);

    const lowStockAlertCount = stockRows.reduce((count, row) => {
      const quantity = toNumber(row.quantity);
      const reorderLevel = toNumber(row.product?.reorder_level);
      return quantity <= reorderLevel ? count + 1 : count;
    }, 0);

    return {
      data: {
        totalInventoryValue,
        lowStockAlertCount,
        totalActiveSuppliers: suppliersResult.count ?? 0,
        recentStockMovements:
          (recentMovementsResult.data ?? []) as Record<string, unknown>[],
      },
    };
  },

  async list({
    supabase,
    companyId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<ServiceResult<{ data: Record<string, unknown>[]; count: number }>> {
    const overview = await this.getInventoryOverview({ supabase, companyId });
    if (overview.error || !overview.data) {
      return { error: overview.error ?? "Failed to load inventory overview." };
    }

    return {
      data: {
        data: [overview.data as Record<string, unknown>],
        count: 1,
      },
    };
  },

  async create(): Promise<ServiceResult<Record<string, unknown>>> {
    return { error: "Inventory overview is read-only." };
  },

  async update(): Promise<ServiceResult<Record<string, unknown>>> {
    return { error: "Inventory overview is read-only." };
  },

  async remove(): Promise<ServiceResult<null>> {
    return { error: "Inventory overview is read-only." };
  },
};
