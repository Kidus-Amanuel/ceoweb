import type { VirtualColumn } from "@/components/shared/table/EditableTable";
import { GenericWorkspaceTable } from "@/components/shared/workspace/GenericWorkspaceTable";
import {
  type InventoryDataTable,
  type InventoryRelationalSets,
  inventoryViewHelpers,
} from "./inventory-workspace.shared";

export type InventoryWorkspaceTableProps = {
  table: InventoryDataTable;
  gridData: Record<string, unknown>[];
  relations: InventoryRelationalSets;
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

export function InventoryWorkspaceTable(props: InventoryWorkspaceTableProps) {
  return (
    <GenericWorkspaceTable
      {...props}
      getColumns={(table, relations) =>
        inventoryViewHelpers.getStandardColumns(
          table,
          relations ?? props.relations,
        )
      }
    />
  );
}
