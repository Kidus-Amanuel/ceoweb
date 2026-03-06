import {
  createCrmCustomFieldAction,
  createCrmRowAction,
  deleteCrmCustomFieldAction,
  deleteCrmRowAction,
  getCrmCustomFieldsAction,
  getCrmCustomersOptionsAction,
  getCrmDealsOptionsAction,
  getCrmRowsAction,
  getCrmTablesAction,
  getCrmUsersOptionsAction,
  updateCrmCustomFieldAction,
  updateCrmRowAction,
} from "@/app/api/crm/crm";
import type { CrmDataTable } from "../crm-workspace.shared";

export {
  createCrmCustomFieldAction,
  createCrmRowAction,
  deleteCrmCustomFieldAction,
  deleteCrmRowAction,
  getCrmRowsAction,
  getCrmUsersOptionsAction,
  getCrmCustomersOptionsAction,
  getCrmDealsOptionsAction,
  updateCrmCustomFieldAction,
  updateCrmRowAction,
};

export const getCrmColumnsAction = (input: {
  companyId: string;
  table: CrmDataTable;
}) =>
  getCrmCustomFieldsAction({
    companyId: input.companyId,
    entityType: input.table,
  });

export const getCrmCountsAction = (input: { companyId: string }) =>
  getCrmTablesAction(input);
