import {
  createInventoryCustomFieldAction,
  createInventoryRowAction,
  deleteInventoryCustomFieldAction,
  deleteInventoryRowAction,
  getInventoryCustomFieldsAction,
  getInventoryProductsOptionsAction,
  getInventoryRowsAction,
  getInventoryWarehousesOptionsAction,
  updateInventoryCustomFieldAction,
  updateInventoryRowAction,
} from "@/app/api/inventory/inventory";
import type { InventoryDataTable } from "../inventory-workspace.shared";

export {
  createInventoryCustomFieldAction,
  createInventoryRowAction,
  deleteInventoryCustomFieldAction,
  deleteInventoryRowAction,
  getInventoryProductsOptionsAction,
  getInventoryRowsAction,
  getInventoryWarehousesOptionsAction,
  updateInventoryCustomFieldAction,
  updateInventoryRowAction,
};

export const getInventoryColumnsAction = (input: {
  companyId: string;
  table: InventoryDataTable;
}) =>
  getInventoryCustomFieldsAction({
    companyId: input.companyId,
    entityType: input.table,
  });
