import { describe, expect, it, vi } from "vitest";
import { inventoryService } from "@/services/inventory/inventory.service";

type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
};

const createSupabaseMock = () => {
  const queryBuilder: MockQueryBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.is.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.range.mockResolvedValue({ data: [], count: 0, error: null });

  const supabase = {
    from: vi.fn().mockReturnValue(queryBuilder),
  };

  return { supabase, queryBuilder };
};

describe("inventoryService.listRows", () => {
  it("calculates range correctly for first page", async () => {
    const { supabase, queryBuilder } = createSupabaseMock();

    await inventoryService.listRows({
      supabase: supabase as any,
      table: "products",
      companyId: "company-1",
      page: 1,
      pageSize: 50,
    });

    expect(supabase.from).toHaveBeenCalledWith("products");
    expect(queryBuilder.range).toHaveBeenCalledWith(0, 49);
  });

  it("calculates range correctly for later pages", async () => {
    const { queryBuilder, supabase } = createSupabaseMock();

    await inventoryService.listRows({
      supabase: supabase as any,
      table: "stock_movements",
      companyId: "company-1",
      page: 3,
      pageSize: 25,
    });

    expect(supabase.from).toHaveBeenCalledWith("stock_movements");
    expect(queryBuilder.range).toHaveBeenCalledWith(50, 74);
  });
});
