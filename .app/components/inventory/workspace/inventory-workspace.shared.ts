import { createElement } from "react";
import { Boxes, Building2, History, Package, Warehouse } from "lucide-react";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";

export type InventoryDataTable =
  | "products"
  | "suppliers"
  | "warehouses"
  | "stock_levels"
  | "stock_movements";

export type InventoryTable = InventoryDataTable;
export type SelectOption = { label: string; value: string };
export type InventoryRelationalSets = {
  products: SelectOption[];
  warehouses: SelectOption[];
};

export type RawRow = Record<string, unknown> & {
  id: string;
  custom_fields?: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
};

export const VIEW_META = {
  products: {
    title: "Products",
    icon: Package,
    iconClass: "text-blue-500",
  },
  suppliers: {
    title: "Suppliers",
    icon: Building2,
    iconClass: "text-emerald-500",
  },
  warehouses: {
    title: "Warehouses",
    icon: Warehouse,
    iconClass: "text-amber-500",
  },
  stock_levels: {
    title: "Stock Levels",
    icon: Boxes,
    iconClass: "text-violet-500",
  },
  stock_movements: {
    title: "Stock History",
    icon: History,
    iconClass: "text-rose-500",
  },
} as const;

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const toFriendlyInventoryError = (input: string) => {
  const message = String(input || "").trim();
  if (!message) return "Something went wrong. Please try again.";
  if (
    /\b23505\b|unique violation|duplicate key value violates unique constraint/i.test(
      message,
    )
  ) {
    return "This record already exists. Please update the existing one or use a different name.";
  }
  if (
    /\b23503\b|foreign key violation|violates foreign key constraint/i.test(
      message,
    )
  ) {
    return "The related item you selected no longer exists. Please refresh.";
  }
  if (
    /\b23502\b|not-null violation|violates not-null constraint/i.test(message)
  ) {
    return "Please fill in all required fields marked with an asterisk.";
  }
  if (
    /typeerror:\s*fetch failed/i.test(message) ||
    /failed to fetch/i.test(message) ||
    /network\s*error/i.test(message)
  ) {
    return "Network error. Please check your connection and try again.";
  }
  return message;
};

export const normalizeRowForGrid = (row: RawRow): Record<string, unknown> => ({
  ...row,
  customValues: asRecord(row.custom_data ?? row.custom_fields),
});

export const mapFieldType = (value: string): VirtualColumn["type"] => {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (token === "number") return "number";
  if (token === "select" || token === "status") return "select";
  if (token === "boolean") return "boolean";
  if (token === "date") return "date";
  if (token === "datetime" || token === "timestamp") return "datetime";
  if (token === "currency" || token === "money") return "currency";
  if (token === "phone" || token === "email") return "text";
  return "text";
};

export const normalizeFieldOptions = (
  type: VirtualColumn["type"],
  options: { label: string; value: string | number }[] | undefined,
) => {
  const raw = (options ?? [])
    .map((option) => String(option.value ?? option.label).trim())
    .filter(Boolean);
  if (!raw.length) return undefined;
  const seen = new Set<string>();
  return raw
    .map((value) => (type === "currency" ? value.toUpperCase() : value))
    .filter((value) => {
      const key = type === "currency" ? value : value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const inventoryViewHelpers = {
  getStandardColumns: (
    table: InventoryDataTable,
    relations: InventoryRelationalSets = { products: [], warehouses: [] },
  ) => {
    const getOptionLabel = (
      value: unknown,
      options: SelectOption[],
      fallback = "",
    ) => {
      const key = String(value ?? "");
      return options.find((option) => option.value === key)?.label ?? fallback;
    };

    return table === "products"
      ? [
          { header: "SKU", accessorKey: "sku" },
          { header: "Name", accessorKey: "name" },
          { header: "Description", accessorKey: "description" },
          {
            header: "Type",
            accessorKey: "type",
            meta: {
              type: "select",
              options: [
                { label: "Physical", value: "physical" },
                { label: "Service", value: "service" },
                { label: "Digital", value: "digital" },
              ],
            },
          },
          { header: "Unit", accessorKey: "unit" },
          {
            header: "Cost Price",
            accessorKey: "cost_price",
            meta: { type: "number" },
          },
          {
            header: "Selling Price",
            accessorKey: "selling_price",
            meta: { type: "number" },
          },
          {
            header: "Reorder Level",
            accessorKey: "reorder_level",
            meta: { type: "number" },
          },
        ]
      : table === "suppliers"
        ? [
            { header: "Name", accessorKey: "name" },
            { header: "Code", accessorKey: "code" },
            { header: "Contact Person", accessorKey: "contact_person" },
            { header: "Email", accessorKey: "email" },
            { header: "Phone", accessorKey: "phone" },
            { header: "Payment Terms", accessorKey: "payment_terms" },
          ]
        : table === "warehouses"
          ? [
              { header: "Name", accessorKey: "name" },
              { header: "Code", accessorKey: "code" },
              { header: "Location", accessorKey: "location" },
            ]
          : table === "stock_movements"
            ? [
                {
                  header: "Product Name",
                  accessorKey: "product_id",
                  meta: {
                    type: "select",
                    options: relations.products,
                    readOnly: true,
                  },
                  cell: ({
                    row,
                    getValue,
                  }: {
                    row: { original: Record<string, unknown> };
                    getValue: () => unknown;
                  }) => {
                    const product = row.original.product as
                      | { name?: string | null }
                      | undefined;
                    const label =
                      product?.name ??
                      getOptionLabel(
                        getValue(),
                        relations.products,
                        String(getValue() ?? ""),
                      );
                    return createElement("span", null, label);
                  },
                },
                {
                  header: "Warehouse Name",
                  accessorKey: "warehouse_id",
                  meta: {
                    type: "select",
                    options: relations.warehouses,
                    readOnly: true,
                  },
                  cell: ({
                    row,
                    getValue,
                  }: {
                    row: { original: Record<string, unknown> };
                    getValue: () => unknown;
                  }) => {
                    const warehouse = row.original.warehouse as
                      | { name?: string | null }
                      | undefined;
                    const label =
                      warehouse?.name ??
                      getOptionLabel(
                        getValue(),
                        relations.warehouses,
                        String(getValue() ?? ""),
                      );
                    return createElement("span", null, label);
                  },
                },
                { header: "Type", accessorKey: "movement_type" },
                {
                  header: "Quantity Change",
                  accessorKey: "quantity_change",
                  meta: { type: "number", readOnly: true },
                },
                {
                  header: "Date",
                  accessorKey: "movement_date",
                  meta: { type: "datetime", readOnly: true },
                },
              ]
            : [
                {
                  header: "Warehouse",
                  accessorKey: "warehouse_id",
                  meta: {
                    type: "select",
                    options: relations.warehouses,
                    readOnly: false,
                  },
                  cell: ({
                    row,
                    getValue,
                  }: {
                    row: { original: Record<string, unknown> };
                    getValue: () => unknown;
                  }) => {
                    const warehouse = row.original.warehouse as
                      | { name?: string | null }
                      | undefined;
                    const label =
                      warehouse?.name ??
                      getOptionLabel(
                        getValue(),
                        relations.warehouses,
                        String(getValue() ?? ""),
                      );
                    return createElement("span", null, label);
                  },
                },
                {
                  header: "Product",
                  accessorKey: "product_id",
                  meta: {
                    type: "select",
                    options: relations.products,
                    readOnly: false,
                  },
                  cell: ({
                    row,
                    getValue,
                  }: {
                    row: { original: Record<string, unknown> };
                    getValue: () => unknown;
                  }) => {
                    const product = row.original.product as
                      | { name?: string | null }
                      | undefined;
                    const label =
                      product?.name ??
                      getOptionLabel(
                        getValue(),
                        relations.products,
                        String(getValue() ?? ""),
                      );
                    return createElement("span", null, label);
                  },
                },
                {
                  header: "Quantity",
                  accessorKey: "quantity",
                  meta: { type: "number" },
                  cell: ({
                    row,
                    getValue,
                  }: {
                    row: { original: Record<string, unknown> };
                    getValue: () => unknown;
                  }) => {
                    const quantity = Number(getValue() ?? 0);
                    const product = row.original.product as
                      | { reorder_level?: number | null }
                      | undefined;
                    const threshold = Number(product?.reorder_level ?? 10);
                    const low = quantity <= threshold;
                    return low
                      ? createElement(
                          "span",
                          {
                            className:
                              "inline-flex items-center rounded-sm border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700",
                          },
                          `${quantity} Low`,
                        )
                      : createElement("span", null, String(quantity));
                  },
                },
              ];
  },
};
