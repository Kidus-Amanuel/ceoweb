import * as z from "zod";
import {
  companyScopeSchema,
  createCustomFieldSchema,
  customDataSchema,
  deleteCustomFieldSchema,
  optionalInput,
  customFieldTypeSchema,
} from "./shared";

export const inventoryTableSchema = z.enum([
  "products",
  "suppliers",
  "warehouses",
  "stock_levels",
  "stock_movements",
]);

export const inventoryEntityTypeSchema = inventoryTableSchema;
export const inventoryCompanyScopeSchema = companyScopeSchema;
export const inventoryCustomDataSchema = customDataSchema;
export const inventoryCustomFieldTypeSchema = customFieldTypeSchema;

export const inventoryProductStandardSchema = z.object({
  sku: optionalInput(z.string().min(1).max(120)),
  name: optionalInput(z.string().min(1).max(255)),
  description: optionalInput(z.string().max(5000)),
  category_id: optionalInput(z.string().uuid().nullable()),
  type: optionalInput(z.enum(["physical", "service", "digital"])),
  unit: optionalInput(z.string().max(60)),
  cost_price: optionalInput(z.coerce.number().nonnegative()),
  selling_price: optionalInput(z.coerce.number().nonnegative()),
  reorder_level: optionalInput(z.coerce.number().int().nonnegative()),
  is_active: optionalInput(z.boolean()),
});

export const inventorySupplierStandardSchema = z.object({
  name: optionalInput(z.string().min(1).max(255)),
  code: optionalInput(z.string().max(120)),
  contact_person: optionalInput(z.string().max(255)),
  email: optionalInput(z.string().email()),
  phone: optionalInput(z.string().max(120)),
  address: optionalInput(z.record(z.string(), z.unknown())),
  payment_terms: optionalInput(z.string().max(255)),
  is_active: optionalInput(z.boolean()),
});

export const inventoryWarehouseStandardSchema = z.object({
  name: optionalInput(z.string().min(1).max(255)),
  code: optionalInput(z.string().max(120)),
  location: optionalInput(z.string().max(500)),
  is_active: optionalInput(z.boolean()),
});

export const inventoryStockLevelStandardSchema = z.object({
  warehouse_id: optionalInput(z.string().uuid()),
  product_id: optionalInput(z.string().uuid()),
  quantity: optionalInput(z.coerce.number().int()),
});

export const inventoryTableViewInputSchema = inventoryCompanyScopeSchema.extend(
  {
    table: inventoryTableSchema,
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce
      .number()
      .int()
      .positive()
      .max(200)
      .optional()
      .default(50),
    search: optionalInput(z.string().max(120)),
  },
);

export const inventoryCreateCustomFieldInputSchema = createCustomFieldSchema(
  inventoryEntityTypeSchema,
);

export const inventoryUpdateCustomFieldInputSchema =
  inventoryCreateCustomFieldInputSchema.extend({
    fieldId: z.string().min(1, "Invalid custom field id"),
  });

export const inventoryDeleteCustomFieldInputSchema = deleteCustomFieldSchema(
  inventoryEntityTypeSchema,
);

export const inventoryCreateRowInputSchema = z.discriminatedUnion("table", [
  inventoryCompanyScopeSchema.extend({
    table: z.literal("products"),
    standardData: inventoryProductStandardSchema,
    customData: inventoryCustomDataSchema.optional(),
  }),
  inventoryCompanyScopeSchema.extend({
    table: z.literal("suppliers"),
    standardData: inventorySupplierStandardSchema,
    customData: inventoryCustomDataSchema.optional(),
  }),
  inventoryCompanyScopeSchema.extend({
    table: z.literal("warehouses"),
    standardData: inventoryWarehouseStandardSchema,
    customData: inventoryCustomDataSchema.optional(),
  }),
  inventoryCompanyScopeSchema.extend({
    table: z.literal("stock_levels"),
    standardData: inventoryStockLevelStandardSchema,
    customData: inventoryCustomDataSchema.optional(),
  }),
]);

export const inventoryUpdateRowInputSchema = z.discriminatedUnion("table", [
  inventoryCompanyScopeSchema.extend({
    table: z.literal("products"),
    rowId: z.string().uuid("Invalid row id"),
    standardData: inventoryProductStandardSchema.partial(),
    customData: inventoryCustomDataSchema.optional(),
  }),
  inventoryCompanyScopeSchema.extend({
    table: z.literal("suppliers"),
    rowId: z.string().uuid("Invalid row id"),
    standardData: inventorySupplierStandardSchema.partial(),
    customData: inventoryCustomDataSchema.optional(),
  }),
  inventoryCompanyScopeSchema.extend({
    table: z.literal("warehouses"),
    rowId: z.string().uuid("Invalid row id"),
    standardData: inventoryWarehouseStandardSchema.partial(),
    customData: inventoryCustomDataSchema.optional(),
  }),
  inventoryCompanyScopeSchema.extend({
    table: z.literal("stock_levels"),
    rowId: z.string().uuid("Invalid row id"),
    standardData: inventoryStockLevelStandardSchema.partial(),
    customData: inventoryCustomDataSchema.optional(),
  }),
]);

export const inventoryDeleteRowInputSchema = inventoryCompanyScopeSchema.extend(
  {
    table: inventoryTableSchema,
    rowId: z.string().uuid("Invalid row id"),
  },
);

export type InventoryTable = z.infer<typeof inventoryTableSchema>;
export type InventoryEntityType = z.infer<typeof inventoryEntityTypeSchema>;
export type InventoryCustomFieldType = z.infer<
  typeof inventoryCustomFieldTypeSchema
>;
export type InventoryCreateRowInput = z.infer<
  typeof inventoryCreateRowInputSchema
>;
export type InventoryUpdateRowInput = z.infer<
  typeof inventoryUpdateRowInputSchema
>;
