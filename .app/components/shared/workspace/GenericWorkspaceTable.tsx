import {
  EditableTable,
  VirtualColumn,
} from "@/components/shared/table/EditableTable";

export type GenericWorkspaceTableProps<
  TTable extends string,
  TRelations = void,
> = {
  table: TTable;
  gridData: Record<string, unknown>[];
  relations?: TRelations;
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
  getColumns: (table: TTable, relations?: TRelations) => unknown[];
};

export function GenericWorkspaceTable<
  TTable extends string,
  TRelations = void,
>({
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
  onSelectionChange,
  pagination = true,
  onReachBottom,
  hasMoreRows = false,
  isFetchingMoreRows = false,
  getColumns,
}: GenericWorkspaceTableProps<TTable, TRelations>) {
  return (
    <div className="h-full min-h-0 min-w-0">
      <EditableTable
        title={undefined}
        data={gridData as any}
        columns={getColumns(table, relations) as any}
        virtualColumns={virtualColumns}
        currentPage={currentPage}
        totalRows={totalRows}
        pageSize={pageSize}
        onPageChange={onPageChange}
        pagination={pagination}
        onAdd={
          onAdd
            ? (payload) => onAdd(payload as Record<string, unknown>)
            : undefined
        }
        onUpdate={
          onUpdate
            ? (rowId, payload) =>
                onUpdate(rowId, payload as Record<string, unknown>)
            : undefined
        }
        onDelete={onDelete}
        onColumnAdd={onColumnAdd}
        onColumnUpdate={onColumnUpdate}
        onColumnDelete={onColumnDelete}
        searchable={false}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        selectedRowId={selectedRowId}
        onSelectionChange={onSelectionChange}
        onReachBottom={onReachBottom}
        hasMoreRows={hasMoreRows}
        isFetchingMoreRows={isFetchingMoreRows}
      />
    </div>
  );
}
