import { describe, expect, it } from "vitest";
import {
  inventoryCreateCustomFieldInputSchema,
  inventoryCreateRowInputSchema,
  inventoryDeleteRowInputSchema,
} from "@/validators/inventory";

const companyId = "11111111-1111-4111-8111-111111111111";
const rowId = "22222222-2222-4222-8222-222222222222";

describe("Inventory validators", () => {
  it("accepts valid product row payload", () => {
    const parsed = inventoryCreateRowInputSchema.safeParse({
      companyId,
      table: "products",
      standardData: {
        sku: "SKU-001",
        name: "Widget",
        type: "physical",
      },
      customData: {
        fragile: true,
        rating: 4,
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts valid table name for delete row payload", () => {
    const parsed = inventoryDeleteRowInputSchema.safeParse({
      companyId,
      rowId,
      table: "stock_movements",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts select custom fields without options", () => {
    const parsed = inventoryCreateCustomFieldInputSchema.safeParse({
      companyId,
      entityType: "products",
      fieldLabel: "Storage Tier",
      fieldType: "select",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts date custom field type", () => {
    const parsed = inventoryCreateCustomFieldInputSchema.safeParse({
      companyId,
      entityType: "warehouses",
      fieldLabel: "Audit Date",
      fieldName: "audit_date",
      fieldType: "date",
    });

    expect(parsed.success).toBe(true);
  });
});
