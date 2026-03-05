import {
  getCrmCustomFieldsAction,
  getCrmCustomersOptionsAction,
  getCrmDealsOptionsAction,
  getCrmRowsAction,
  getCrmTablesAction,
  getCrmUsersOptionsAction,
} from "@/app/api/crm/crm";
import type { CrmDataTable } from "../crm-workspace.shared";

export {
  getCrmRowsAction,
  getCrmUsersOptionsAction,
  getCrmCustomersOptionsAction,
  getCrmDealsOptionsAction,
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
