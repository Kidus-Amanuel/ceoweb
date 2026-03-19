"use client";
"use no memo";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { UIEvent as ReactUIEvent } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, RowData } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Input } from "@/components/shared/ui/input/Input";
import { Table } from "@/components/shared/ui/table";
import { useTableState } from "@/hooks/use-table-state";
import { useCellEditing } from "@/hooks/use-cell-editing";
import { useColumnManagement } from "@/hooks/use-column-management";
import { useRowOperations } from "@/hooks/use-row-operations";
import { EditableTableHeader } from "./editable-table/TableHeader";
import { EditableTableBody } from "./editable-table/TableBody";
import type { VirtualColumn } from "@/utils/table-utils";
import type { DeleteTarget } from "./editable-table/DeleteConfirmationDialog";

export type { VirtualColumn };

const DeleteConfirmationDialog = dynamic(
  () => import("./editable-table/DeleteConfirmationDialog"),
  { loading: () => null, ssr: false },
);
const FilesEditor = dynamic(() => import("./editable-table/FilesEditor"), {
  loading: () => null,
  ssr: false,
});

const useSafeTableInterop = <TData extends RowData>(
  options: Parameters<typeof useReactTable<TData>>[0],
  // eslint-disable-next-line react-hooks/incompatible-library
) => useReactTable(options);

interface EditableTableProps<
  T extends { id: string; customValues?: Record<string, any> },
> {
  data: T[];
  columns: ColumnDef<T, any>[];
  virtualColumns?: VirtualColumn[];
  title?: string;
  description?: string;
  hideHeader?: boolean;
  onAdd?: (data: Partial<T>) => void | Promise<void>;
  onUpdate?: (id: string, data: Partial<T>) => void | Promise<void>;
  onDelete?: (id: string) => void;
  onColumnAdd?: (column: Omit<VirtualColumn, "id">) => void;
  onColumnUpdate?: (
    columnId: string,
    column: Omit<VirtualColumn, "id">,
  ) => void;
  onColumnDelete?: (columnId: string) => void;
  searchable?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  pagination?: boolean;
  currentPage?: number;
  totalRows?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  selectedRowId?: string | null;
  onSelectionChange?: (rowIds: string[]) => void;
  onReachBottom?: () => void;
  hasMoreRows?: boolean;
  isFetchingMoreRows?: boolean;
  multiSelect?: boolean;
}

type FileEditingCell = {
  id: string;
  columnId: string;
  isVirtual: boolean;
  virtualKey?: string;
  value: any;
};

export function EditableTable<
  T extends { id: string; customValues?: Record<string, any> },
>({
  data,
  columns: baseColumns,
  virtualColumns = [],
  title,
  description,
  hideHeader = false,
  onAdd,
  onUpdate,
  onDelete,
  onColumnAdd,
  onColumnUpdate,
  onColumnDelete,
  searchable = true,
  searchQuery,
  onSearchQueryChange,
  pagination = true,
  currentPage = 1,
  totalRows = 0,
  pageSize = 50,
  onPageChange,
  selectedRowId = null,
  onSelectionChange,
  onReachBottom,
  hasMoreRows = false,
  isFetchingMoreRows = false,
  multiSelect = true,
}: EditableTableProps<T>) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const reachedBottomLockRef = useRef(false);
  const rowElementsRef = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [fileEditingCell, setFileEditingCell] =
    useState<FileEditingCell | null>(null);

  // Custom hooks
  const tableState = useTableState({
    initialSearch: searchQuery,
    onSearchChange: onSearchQueryChange,
  });

  const columnManagement = useColumnManagement<T>({
    baseColumns,
    virtualColumns,
    data,
    onColumnAdd,
    onColumnUpdate,
    onColumnDelete,
  });

  // Build final columns with virtual columns
  const finalColumns = useMemo(() => {
    const virtualDefs: ColumnDef<T, any>[] = virtualColumns.map((vCol) => ({
      id: `vcol:${vCol.id}`,
      header: vCol.label,
      accessorFn: (row) => row.customValues?.[vCol.key],
      meta: {
        type: vCol.type,
        options: vCol.options,
        isVirtual: true,
        virtualKey: vCol.key,
      },
    }));
    return [...baseColumns, ...virtualDefs];
  }, [baseColumns, virtualColumns]);

  // Dependent columns map
  const dependentColumnsBySource = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of finalColumns) {
      const source = col.meta?.optionsSourceKey;
      const key = String(
        col.id ??
          (((col as { accessorKey?: unknown }).accessorKey as string) || ""),
      );
      if (!source || !key) continue;
      map[source] = map[source] || [];
      map[source].push(key);
    }
    return map;
  }, [finalColumns]);

  // Safe sorting (filter out invalid column IDs)
  const validColumnIds = useMemo(
    () =>
      new Set(
        finalColumns
          .map((col) =>
            String(
              col.id ??
                (((col as { accessorKey?: unknown }).accessorKey as string) ||
                  ""),
            ),
          )
          .filter(Boolean),
      ),
    [finalColumns],
  );

  const safeSorting = useMemo(
    () => tableState.sorting.filter((entry) => validColumnIds.has(entry.id)),
    [tableState.sorting, validColumnIds],
  );

  // Row selection with external selectedRowId
  const lastSelectedRowIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedRowId) {
      lastSelectedRowIdRef.current = null;
      return;
    }
    if (selectedRowId === lastSelectedRowIdRef.current) return;
    lastSelectedRowIdRef.current = selectedRowId;
    tableState.setRowSelection((prev) => ({
      ...prev,
      [selectedRowId]: true,
    }));
  }, [selectedRowId, tableState]);

  // Notify selection changes
  useEffect(() => {
    if (!onSelectionChange) return;
    const selectedIds = Object.entries(tableState.rowSelection)
      .filter(([, isSelected]) => !!isSelected)
      .map(([id]) => id);
    onSelectionChange(selectedIds);
  }, [onSelectionChange, tableState.rowSelection]);

  // Reset scroll lock when not fetching
  useEffect(() => {
    if (!isFetchingMoreRows) reachedBottomLockRef.current = false;
  }, [isFetchingMoreRows]);

  // Create TanStack Table
  const effectiveGlobalFilter = searchQuery ?? tableState.globalFilter;
  const table = useSafeTableInterop({
    data,
    columns: finalColumns,
    getRowId: (row) => String(row.id),
    state: {
      sorting: safeSorting,
      globalFilter: effectiveGlobalFilter,
      rowSelection: tableState.rowSelection,
    },
    onSortingChange: tableState.setSorting,
    onGlobalFilterChange: tableState.setGlobalFilter,
    onRowSelectionChange: tableState.setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableGlobalFilter: true,
    enableRowSelection: true,
    enableMultiRowSelection: multiSelect,
    globalFilterFn: "auto",
  });

  // Maps for quick lookups
  const rowsById = useMemo(
    () => new Map(data.map((entry) => [entry.id, entry] as const)),
    [data],
  );

  const leafColumns = table.getAllLeafColumns();
  const leafColumnsById = useMemo(
    () => new Map(leafColumns.map((col) => [col.id, col] as const)),
    [leafColumns],
  );

  // Cell editing hook
  const cellEditing = useCellEditing<T>({
    rowsById,
    leafColumnsById,
    onUpdate,
    table,
  });

  const columnsSignature = useMemo(
    () =>
      finalColumns
        .map((col) =>
          String(
            col.id ??
              (((col as { accessorKey?: unknown }).accessorKey as string) ||
                ""),
          ),
        )
        .join("|"),
    [finalColumns],
  );

  // Row operations hook
  const rowOperations = useRowOperations<T>({
    table,
    onAdd,
    onDelete,
  });

  const openFilesEditor = useCallback((payload: FileEditingCell) => {
    setFileEditingCell(payload);
  }, []);

  // Utility functions
  const isEmailColumn = (columnId: string, type: unknown) =>
    type === "email" || columnId.toLowerCase().includes("email");

  const isPhoneColumn = (columnId: string, type: unknown) =>
    type === "phone" ||
    columnId.toLowerCase().includes("phone") ||
    columnId.toLowerCase().includes("mobile") ||
    columnId.toLowerCase().includes("tel");

  const getColumnSizeClasses = (
    columnId: string,
    isVirtual: boolean,
    type: unknown,
  ) => {
    const key = String(columnId).toLowerCase();
    if (key.includes("email")) return "min-w-fit";
    if (key.includes("phone") || key.includes("mobile") || key.includes("tel"))
      return "min-w-fit";
    if (type === "email") return "min-w-fit";
    if (type === "phone") return "min-w-fit";
    if (type === "number" || type === "currency") return "min-w-fit";
    if (type === "date" || type === "datetime") return "min-w-fit";
    if (type === "select" || type === "status" || type === "boolean")
      return "min-w-[110px]";
    return isVirtual ? "min-w-[110px]" : "min-w-[110px] ";
  };

  // Auto-width calculation for name/email/phone columns
  const autoWidthByColumnId = new Map<string, number>();
  table.getVisibleFlatColumns().forEach((column) => {
    const type = column.columnDef.meta?.type;
    const columnKey = String(column.columnDef.meta?.virtualKey ?? column.id);
    const nameColumn = columnKey.toLowerCase().includes("name");
    const emailColumn = isEmailColumn(columnKey, type);
    const phoneColumn = isPhoneColumn(columnKey, type);
    if (!nameColumn && !emailColumn && !phoneColumn) return;

    let longest = 0;
    table.getRowModel().rows.forEach((row) => {
      const value = row.getValue(column.id);
      const text = value === null || value === undefined ? "" : String(value);
      if (text.length > longest) longest = text.length;
    });

    const minWidth = nameColumn ? 200 : emailColumn ? 120 : 70;
    const maxWidth = 250;
    autoWidthByColumnId.set(
      column.id,
      Math.min(maxWidth, Math.max(minWidth, longest * 9 + 56)),
    );
  });

  // Row resize handlers
  const registerRowRef = useCallback(
    (rowId: string, element: HTMLTableRowElement | null) => {
      rowElementsRef.current[rowId] = element;
    },
    [],
  );

  const handleRowResizeMouseDown = useCallback(
    (event: React.MouseEvent<HTMLTableRowElement>, rowId: string) => {
      const rowElement = rowElementsRef.current[rowId];
      if (!rowElement) return;
      const rect = rowElement.getBoundingClientRect();
      if (rect.bottom - event.clientY > 4) return;
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = rowHeights[rowId] ?? rect.height;
      const onMove = (moveEvent: MouseEvent) =>
        setRowHeights((prev) => ({
          ...prev,
          [rowId]: Math.max(
            44,
            Math.round(startHeight + (moveEvent.clientY - startY)),
          ),
        }));
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [rowHeights],
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Scroll handler for infinite loading
  const handleTableScroll = (event: ReactUIEvent<HTMLDivElement>) => {
    if (!onReachBottom || !hasMoreRows || isFetchingMoreRows) return;
    const target = event.currentTarget;
    const nearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 96;
    if (!nearBottom || reachedBottomLockRef.current) return;
    reachedBottomLockRef.current = true;
    onReachBottom();
  };

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-col h-full bg-white border border-slate-200 overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.04)]"
      style={{
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Header section with data terminal aesthetic */}
      {!hideHeader && (title || description || searchable) && (
        <div className="relative px-6 py-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white space-y-4">
          {/* Subtle grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(15,23,42,0.5) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(15,23,42,0.5) 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative">
            {title && (
              <h3 className="text-[22px] font-bold text-slate-900 tracking-[-0.02em] leading-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-[13px] text-slate-600 font-medium leading-relaxed max-w-2xl mt-1.5">
                {description}
              </p>
            )}
          </div>

          {searchable && (
            <div className="relative flex-1 group max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-amber-500" />
              <Input
                placeholder="Search records..."
                value={tableState.globalFilter}
                onChange={(e) => tableState.setSearchValue(e.target.value)}
                className="pl-10 pr-4 h-10 bg-white border border-slate-200 text-[13px] font-medium placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200"
                style={{
                  fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                  letterSpacing: "-0.01em",
                }}
              />
              {tableState.globalFilter && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-500 tracking-wider uppercase opacity-60">
                  {table.getFilteredRowModel().rows.length}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table section with terminal styling */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
        <div
          className="flex-1 min-h-0 overflow-x-auto overflow-y-auto pb-2"
          onScroll={handleTableScroll}
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 #f8fafc",
          }}
        >
          <Table className="w-full min-w-[1170px] table-auto border-collapse">
            <EditableTableHeader
              headerGroups={table.getHeaderGroups()}
              autoWidthByColumnId={autoWidthByColumnId}
              virtualColumns={virtualColumns}
              isColPopoverOpen={columnManagement.isColPopoverOpen}
              editingColumnId={columnManagement.editingColumnId}
              colFormSeed={columnManagement.colFormSeed}
              colFormError={columnManagement.colFormError}
              newColType={columnManagement.newColType}
              newColLabelValue={columnManagement.newColLabelValue}
              newColOptionsValue={columnManagement.newColOptionsValue}
              typeFilter={columnManagement.typeFilter}
              filteredTypeChoices={columnManagement.filteredTypeChoices}
              editingColumn={columnManagement.editingColumn}
              editingColumnHasValues={columnManagement.editingColumnHasValues}
              onSelectAll={(checked) =>
                table.toggleAllPageRowsSelected(checked)
              }
              onToggleSort={(columnId) => {
                const column = table
                  .getAllColumns()
                  .find((c) => c.id === columnId);
                column?.getToggleSortingHandler()?.({} as any);
              }}
              onOpenColumnForEdit={columnManagement.openColumnForEdit}
              onRequestColumnDelete={(column) =>
                setDeleteTarget({
                  kind: "column",
                  id: column.id,
                  label: column.label,
                })
              }
              onOpenColumnForCreate={columnManagement.openColumnForCreate}
              onCloseColumnEditor={columnManagement.closeColumnEditor}
              onTypeFilterChange={columnManagement.setTypeFilter}
              onColTypeChange={columnManagement.setNewColType}
              onColLabelChange={columnManagement.setNewColLabel}
              onColOptionsChange={columnManagement.setNewColOptions}
              onSaveColumn={columnManagement.handleSaveColumn}
              getColumnSizeClasses={getColumnSizeClasses}
              isEmailColumn={isEmailColumn}
              isPhoneColumn={isPhoneColumn}
              isAllRowsSelected={table.getIsAllPageRowsSelected()}
              isSomeRowsSelected={table.getIsSomePageRowsSelected()}
              canAddColumns={!!onColumnAdd}
              canEditColumns={!!onColumnUpdate}
              canDeleteColumns={!!onColumnDelete}
              multiSelect={multiSelect}
            />
            <EditableTableBody
              table={table}
              rows={table.getRowModel().rows}
              columnsSignature={columnsSignature}
              editingCell={cellEditing.editingCell}
              editValue={cellEditing.editValue}
              inputRef={cellEditing.inputRef}
              autoWidthByColumnId={autoWidthByColumnId}
              rowHeights={rowHeights}
              isAdding={rowOperations.isAdding}
              newRowData={rowOperations.newRowData}
              addRowRef={rowOperations.addRowRef}
              addRowFirstInputRef={rowOperations.addRowFirstInputRef}
              dependentColumnsBySource={dependentColumnsBySource}
              onEditValueChange={cellEditing.setEditValue}
              onStartEdit={cellEditing.startEditing}
              onNavigate={cellEditing.moveToNeighborCell}
              onCancelEdit={cellEditing.cancelEditing}
              onSave={cellEditing.handleSave}
              onDeleteClick={(target) => setDeleteTarget(target)}
              onRowResizeMouseDown={handleRowResizeMouseDown}
              onRegisterRef={registerRowRef}
              onNewRowDataChange={rowOperations.setNewRowData}
              onAddCommit={rowOperations.handleAddCommit}
              onAddCancel={rowOperations.handleAddCancel}
              onStartEditNewRow={(columnId) =>
                cellEditing.startEditing("new", columnId, "")
              }
              onOpenFilesEditor={openFilesEditor}
              getColumnSizeClasses={getColumnSizeClasses}
              isEmailColumn={isEmailColumn}
              isPhoneColumn={isPhoneColumn}
            />
          </Table>
        </div>
      </div>

      {/* Footer section with terminal aesthetic */}
      <div className="shrink-0 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        {isFetchingMoreRows && (
          <div className="border-b border-slate-200 px-6 py-2.5 text-xs font-mono text-slate-500 tracking-wide flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
            Loading more records...
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 gap-4">
          <div className="flex flex-col items-start gap-2">
            {!!onAdd && (
              <Button
                type="button"
                variant="outline"
                onClick={rowOperations.handleStartAdd}
                aria-label="New Record"
                className="h-9 px-4 border-2 border-slate-900 bg-slate-900 text-white text-[13px] font-bold tracking-wide hover:bg-slate-800 hover:border-slate-800 transition-all duration-200 shadow-[2px_2px_0_0_rgba(15,23,42,0.1)]"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" strokeWidth={2.5} />
                NEW RECORD
              </Button>
            )}
          </div>
          {pagination && onPageChange && (
            <div className="ml-auto flex items-center gap-3">
              <p className="text-[12px] font-mono text-slate-600 whitespace-nowrap tracking-wide">
                <span className="text-amber-600 font-bold">{currentPage}</span>
                <span className="text-slate-400 mx-1.5">/</span>
                <span className="text-slate-500">{totalPages}</span>
              </p>
              <div className="hidden sm:block h-5 w-px bg-slate-300" />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Previous"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="h-8 px-3 border-slate-300 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Next"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="h-8 px-3 border-slate-300 bg-white text-[12px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 px-6 py-3 bg-slate-50/50">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-600 tracking-wide">
            <p className="whitespace-nowrap">
              <span className="text-slate-900 font-bold">
                {totalRows || data.length}
              </span>
              <span className="text-slate-400 mx-1.5">RECORDS</span>
              {table.getSelectedRowModel().rows.length > 0 && (
                <>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="text-amber-600 font-bold">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                  <span className="text-slate-400 mx-1.5">SELECTED</span>
                </>
              )}
            </p>
            <p className="whitespace-nowrap text-slate-500">
              {data.length} / {pageSize} per page
            </p>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        deleteTarget={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirmRow={onDelete}
        onConfirmColumn={onColumnDelete}
      />
      {fileEditingCell && (
        <FilesEditor
          open={!!fileEditingCell}
          onClose={() => setFileEditingCell(null)}
          onSave={(files: any[]) => {
            if (fileEditingCell) {
              if (fileEditingCell.id === "new-row") {
                rowOperations.setNewRowData((prev) => {
                  const next = { ...prev };
                  if (fileEditingCell.isVirtual) {
                    return {
                      ...next,
                      customValues: {
                        ...(prev.customValues || {}),
                        [fileEditingCell.virtualKey ??
                        fileEditingCell.columnId]: files,
                      },
                    };
                  }
                  next[fileEditingCell.columnId] = files;
                  return next;
                });
              } else {
                cellEditing.handleSave(
                  fileEditingCell.id,
                  fileEditingCell.columnId,
                  files,
                  fileEditingCell.isVirtual,
                  fileEditingCell.virtualKey,
                );
              }
            }
            setFileEditingCell(null);
          }}
          initialFiles={fileEditingCell.value}
          title="Manage Files"
          tableName={title?.toLowerCase().replace(/\s+/g, "-") || "general"}
          recordId={fileEditingCell.id}
        />
      )}
    </div>
  );
}
