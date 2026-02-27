import {
  EditableTable,
  VirtualColumn,
} from "@/components/shared/table/EditableTable";
import {
  CrmDataTable,
  RelationalSets,
  crmViewHelpers,
} from "./crm-workspace.shared";

type CrmWorkspaceTableProps = {
  table: CrmDataTable;
  gridData: Record<string, unknown>[];
  relations: RelationalSets;
  virtualColumns: VirtualColumn[];
  currentPage: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onAdd: (payload: Record<string, unknown>) => void;
  onUpdate: (rowId: string, payload: Record<string, unknown>) => void;
  onDelete: (rowId: string) => void;
  onColumnAdd: (column: Omit<VirtualColumn, "id">) => void;
  onColumnUpdate: (columnId: string, column: Omit<VirtualColumn, "id">) => void;
  onColumnDelete: (columnId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedRowId: string | null;
};

export function CrmWorkspaceTable({
  table,
  gridData,
  relations,
  virtualColumns,
  currentPage,
  totalRows,
  pageSize,
  onPageChange,
  onAdd,
  onUpdate,
  onDelete,
  onColumnAdd,
  onColumnUpdate,
  onColumnDelete,
  searchQuery,
  onSearchQueryChange,
  selectedRowId,
}: CrmWorkspaceTableProps) {
  return (
    <EditableTable
      title={undefined}
      data={gridData as any}
      columns={crmViewHelpers.getStandardColumns(table, relations) as any}
      virtualColumns={virtualColumns}
      currentPage={currentPage}
      totalRows={totalRows}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onAdd={(payload) => onAdd(payload as Record<string, unknown>)}
      onUpdate={(rowId, payload) =>
        onUpdate(rowId, payload as Record<string, unknown>)
      }
      onDelete={onDelete}
      onColumnAdd={onColumnAdd}
      onColumnUpdate={onColumnUpdate}
      onColumnDelete={onColumnDelete}
      searchable={false}
      searchQuery={searchQuery}
      onSearchQueryChange={onSearchQueryChange}
      selectedRowId={selectedRowId}
    />
  );
}
