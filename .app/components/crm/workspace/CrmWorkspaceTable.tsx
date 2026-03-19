import type { VirtualColumn } from "@/components/shared/table/EditableTable";
import { GenericWorkspaceTable } from "@/components/shared/workspace/GenericWorkspaceTable";
import {
  type CrmDataTable,
  type RelationalSets,
  crmViewHelpers,
} from "./crm-workspace.shared";

export type CrmWorkspaceTableProps = {
  table: CrmDataTable;
  gridData: Record<string, unknown>[];
  relations: RelationalSets;
  virtualColumns: VirtualColumn[];
  currentPage: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onAdd?: (payload: Record<string, unknown>) => void;
  onUpdate?: (rowId: string, payload: Record<string, unknown>) => void;
  onDelete?: (rowId: string) => void;
  onColumnAdd?: (column: Omit<VirtualColumn, "id">) => void;
  onColumnUpdate?: (
    columnId: string,
    column: Omit<VirtualColumn, "id">,
  ) => void;
  onColumnDelete?: (columnId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedRowId: string | null;
  onSelectionChange?: (rowIds: string[]) => void;
  pagination?: boolean;
  onReachBottom?: () => void;
  hasMoreRows?: boolean;
  isFetchingMoreRows?: boolean;
};

export function CrmWorkspaceTable(props: CrmWorkspaceTableProps) {
  return (
    <GenericWorkspaceTable
      {...props}
      getColumns={(table, relations) =>
        crmViewHelpers.getStandardColumns(table, relations ?? props.relations)
      }
    />
  );
}
