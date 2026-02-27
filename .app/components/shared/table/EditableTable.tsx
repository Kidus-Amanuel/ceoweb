"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, RowData, SortingState } from "@tanstack/react-table";
import { Pencil, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import { Input } from "@/components/shared/ui/input/Input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover/Popover";
import { CustomColumnEditorContent } from "./CustomColumnEditorContent";
import {
  DeleteTarget,
  EditableTableDeleteDialog,
} from "./editable-table/EditableTableDeleteDialog";
import { EditableTableFooterBar } from "./editable-table/EditableTableFooterBar";
import { EditableTableContent } from "./editable-table/EditableTableContent";
import {
  VirtualColumn,
  asColumnType,
  toColumnKey,
  hasMeaningfulCustomValue,
  parseOptionTokens,
  findSelectOptionIndex,
  findSelectLabel,
  getSemanticOptionTone,
  formatDateValue,
  prettyValue,
  defaultCurrencyOptions,
  norm,
  fieldTypeChoices,
} from "@/utils/table-utils";

export type { VirtualColumn };

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    type?:
      | "text"
      | "number"
      | "date"
      | "datetime"
      | "select"
      | "boolean"
      | "json"
      | "currency"
      | "status";
    options?: { label: string; value: string | number }[];
    optionsByType?: Record<string, { label: string; value: string | number }[]>;
    optionsSourceKey?: string;
    isVirtual?: boolean;
  }
}

interface EditableTableProps<
  T extends { id: string; customValues?: Record<string, any> },
> {
  data: T[];
  columns: ColumnDef<T, any>[];
  virtualColumns?: VirtualColumn[];
  title?: string;
  description?: string;
  onAdd?: (data: Partial<T>) => void;
  onUpdate?: (id: string, data: Partial<T>) => void;
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
}

export function EditableTable<
  T extends { id: string; customValues?: Record<string, any> },
>({
  data,
  columns: baseColumns,
  virtualColumns = [],
  title,
  description,
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
}: EditableTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingCell, setEditingCell] = useState<{
    id: string;
    columnId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [isAdding, setIsAdding] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});

  // Popover State
  const [isColPopoverOpen, setIsColPopoverOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [colFormSeed, setColFormSeed] = useState(0);
  const [colFormError, setColFormError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Popover Refs
  const newColLabel = useRef("");
  const newColOptions = useRef("");
  const [newColType, setNewColType] = useState<VirtualColumn["type"]>("text");

  const setSearchValue = (value: string) => {
    setGlobalFilter(value);
    onSearchQueryChange?.(value);
  };

  const resetColumnForm = useCallback(() => {
    setEditingColumnId(null);
    setNewColType("text");
    setTypeFilter("");
    setColFormError(null);
    newColLabel.current = "";
    newColOptions.current = "";
    setColFormSeed((p) => p + 1);
  }, []);

  const openColumnForEdit = useCallback((column: VirtualColumn) => {
    setEditingColumnId(column.id);
    newColLabel.current = column.label;
    setNewColType(asColumnType(column.type));
    newColOptions.current = (column.options ?? [])
      .map((option) => String(option.value ?? option.label))
      .join(", ");
    setColFormError(null);
    setColFormSeed((p) => p + 1);
    setIsColPopoverOpen(true);
  }, []);

  const editingColumn = useMemo(
    () =>
      virtualColumns.find((column) => column.id === editingColumnId) ?? null,
    [editingColumnId, virtualColumns],
  );

  const editingColumnHasValues = useMemo(() => {
    if (!editingColumn) return false;
    return data.some((row) =>
      hasMeaningfulCustomValue(row.customValues?.[editingColumn.key]),
    );
  }, [data, editingColumn]);

  const filteredTypeChoices = useMemo(() => {
    const q = norm(typeFilter);
    if (!q) return fieldTypeChoices;
    return fieldTypeChoices.filter(
      (choice) =>
        norm(choice.label).includes(q) || norm(choice.key).includes(q),
    );
  }, [typeFilter]);

  const handleSaveColumn = useCallback(() => {
    const label = newColLabel.current.trim();
    if (!label) return;
    if (
      editingColumn &&
      editingColumnHasValues &&
      asColumnType(editingColumn.type) !== newColType
    ) {
      setColFormError(
        "Data type cannot be changed for a column that already has row values.",
      );
      return;
    }
    const key = toColumnKey(label).trim();
    const parsedOptions = parseOptionTokens(
      newColOptions.current,
      newColType === "currency",
    ).map((value) => ({ label: value, value }));

    const options =
      newColType === "currency"
        ? parsedOptions.length
          ? parsedOptions
          : defaultCurrencyOptions.map((e) => ({
              label: String(e.value).toUpperCase(),
              value: String(e.value).toUpperCase(),
            }))
        : newColType === "status"
          ? parsedOptions.length
            ? parsedOptions
            : [
                { label: "Pending", value: "Pending" },
                { label: "In Progress", value: "In Progress" },
                { label: "Done", value: "Done" },
                { label: "Cancelled", value: "Cancelled" },
              ]
          : newColType === "select"
            ? parsedOptions
            : undefined;

    const next = { label, key, type: newColType, options };
    if (editingColumnId && onColumnUpdate)
      onColumnUpdate(editingColumnId, next);
    else onColumnAdd?.(next);
    resetColumnForm();
    setIsColPopoverOpen(false);
  }, [
    editingColumn,
    editingColumnHasValues,
    editingColumnId,
    newColType,
    onColumnAdd,
    onColumnUpdate,
    resetColumnForm,
  ]);

  const finalColumns = useMemo(() => {
    const virtualDefs: ColumnDef<T, any>[] = virtualColumns.map((vCol) => ({
      id: vCol.key,
      header: () => (
        <div className="flex items-center gap-2">
          <span>{vCol.label}</span>
          {onColumnUpdate && (
            <Popover
              open={isColPopoverOpen && editingColumnId === vCol.id}
              onOpenChange={(open) => {
                if (open) {
                  openColumnForEdit(vCol);
                  return;
                }
                setIsColPopoverOpen(false);
                resetColumnForm();
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Edit column ${vCol.label}`}
                  className="text-blue-500 hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    openColumnForEdit(vCol);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                onOpenAutoFocus={(event) => event.preventDefault()}
                className="w-[680px] p-4 space-y-3 shadow-3xl rounded-[20px] border-[#E6E6E3] z-[100]"
              >
                <CustomColumnEditorContent
                  seed={colFormSeed}
                  nameDefault={newColLabel.current}
                  optionsDefault={newColOptions.current}
                  currentType={newColType}
                  fieldTypeFilter={typeFilter}
                  onFieldTypeFilterChange={setTypeFilter}
                  choices={filteredTypeChoices}
                  lockTypeChange={editingColumnHasValues && !!editingColumn}
                  onTypeChange={(nextType: VirtualColumn["type"]) => {
                    setNewColType(nextType as VirtualColumn["type"]);
                    setColFormError(null);
                    if (
                      nextType !== "select" &&
                      nextType !== "currency" &&
                      nextType !== "status"
                    ) {
                      newColOptions.current = "";
                      setColFormSeed((prev) => prev + 1);
                    }
                  }}
                  onNameChange={(value: string) => {
                    newColLabel.current = value;
                  }}
                  onOptionsChange={(value: string) => {
                    newColOptions.current = value;
                  }}
                  error={colFormError}
                  onSave={handleSaveColumn}
                  saveLabel="Update Property"
                />
              </PopoverContent>
            </Popover>
          )}
          {onColumnDelete && (
            <button
              type="button"
              aria-label={`Delete column ${vCol.label}`}
              className="text-red-500 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({
                  kind: "column",
                  id: vCol.id,
                  label: vCol.label,
                });
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
      accessorFn: (row) => row.customValues?.[vCol.key],
      meta: { type: vCol.type, options: vCol.options, isVirtual: true },
      cell: (info) => {
        const val = info.getValue();
        const meta = info.column.columnDef.meta;
        if (meta?.type === "select") {
          return (
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                getSemanticOptionTone(
                  findSelectLabel(meta.options, val) ?? val,
                  findSelectOptionIndex(meta.options, val),
                ),
              )}
            >
              {findSelectLabel(meta.options, val) ??
                (meta.options?.length ? "Unknown" : prettyValue(val))}
            </span>
          );
        }
        if (meta?.type === "date")
          return <span>{formatDateValue(val, false)}</span>;
        if (meta?.type === "datetime")
          return <span>{formatDateValue(val, true)}</span>;
        if (meta?.type === "boolean") {
          return (
            <Checkbox
              checked={!!val}
              disabled
              className="scale-75 pointer-events-none"
            />
          );
        }
        return <span>{prettyValue(val)}</span>;
      },
    }));
    return [...baseColumns, ...virtualDefs];
  }, [
    baseColumns,
    colFormError,
    colFormSeed,
    editingColumn,
    editingColumnHasValues,
    editingColumnId,
    filteredTypeChoices,
    handleSaveColumn,
    isColPopoverOpen,
    newColType,
    onColumnDelete,
    onColumnUpdate,
    openColumnForEdit,
    resetColumnForm,
    typeFilter,
    virtualColumns,
  ]);

  const dependentColumnsBySource = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of finalColumns) {
      const source = col.meta?.optionsSourceKey;
      const key = String(
        col.id ??
          (((col as { accessorKey?: unknown }).accessorKey as string) || ""),
      );
      if (source && key) {
        map[source] = map[source] || [];
        map[source].push(key);
      }
    }
    return map;
  }, [finalColumns]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.type === "text") inputRef.current.select();
    }
  }, [editingCell]);

  useEffect(() => {
    if (searchQuery !== undefined) setGlobalFilter(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (selectedRowId)
      setRowSelection((prev) => ({ ...prev, [selectedRowId]: true }));
  }, [selectedRowId]);

  const rowsById = useMemo(
    () => new Map(data.map((entry) => [entry.id, entry] as const)),
    [data],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: finalColumns,
    getRowId: (row) => String(row.id),
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableGlobalFilter: true,
    enableRowSelection: true,
    globalFilterFn: "auto",
  });
  const leafColumnsById = useMemo(
    () =>
      new Map(table.getAllLeafColumns().map((col) => [col.id, col] as const)),
    [table],
  );

  const handleSave = useCallback(
    (id: string, columnId: string, value: any, isVirtual: boolean) => {
      if (!onUpdate) return;
      const row = rowsById.get(id);
      if (!row) return;
      if (isVirtual) {
        onUpdate(id, {
          customValues: { ...(row.customValues || {}), [columnId]: value },
        } as Partial<T>);
      } else {
        onUpdate(id, { [columnId]: value } as Partial<T>);
      }
      setEditingCell(null);
    },
    [onUpdate, rowsById],
  );

  useEffect(() => {
    if (!editingCell) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (
        t?.closest(
          '[data-slot="select-content"],[data-slot="select-item"],[data-slot="popover-content"],[data-slot="dialog-content"]',
        )
      ) {
        return;
      }
      if (t && containerRef.current?.contains(t)) return;
      const col = leafColumnsById.get(editingCell.columnId);

      handleSave(
        editingCell.id,
        editingCell.columnId,
        editValue,
        !!col?.columnDef.meta?.isVirtual,
      );
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [editValue, editingCell, handleSave, leafColumnsById]);

  const handleAddCommit = () => {
    onAdd?.(newRowData as Partial<T>);
    setIsAdding(false);
    setNewRowData({});
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-white rounded-[20px] border border-border shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {title || description || searchable ? (
        <div className="px-6 py-5 border-b border-border bg-white space-y-3">
          {title && (
            <h3 className="text-2xl font-bold text-[#37352F] tracking-tight antialiased">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-[14px] text-[#787774] font-medium leading-relaxed max-w-xl">
              {description}
            </p>
          )}
          {searchable && (
            <div className="relative flex-1 group max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-blue-500" />
              <Input
                placeholder="Search rows..."
                value={globalFilter}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-12 h-12 bg-[#FBFBFA] border-border/80 rounded-[12px]"
              />
            </div>
          )}
        </div>
      ) : null}

      <EditableTableContent
        table={table}
        onColumnAdd={onColumnAdd}
        isColPopoverOpen={isColPopoverOpen}
        setIsColPopoverOpen={setIsColPopoverOpen}
        editingColumnId={editingColumnId}
        colFormSeed={colFormSeed}
        colFormError={colFormError}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        newColLabel={newColLabel}
        newColOptions={newColOptions}
        newColType={newColType}
        setNewColType={setNewColType}
        setColFormError={setColFormError}
        bumpColFormSeed={() => setColFormSeed((prev) => prev + 1)}
        filteredTypeChoices={filteredTypeChoices}
        resetColumnForm={resetColumnForm}
        handleSaveColumn={handleSaveColumn}
        editingCell={editingCell}
        setEditingCell={setEditingCell}
        editValue={editValue}
        setEditValue={setEditValue}
        handleSave={handleSave}
        inputRef={inputRef}
        dependentColumnsBySource={dependentColumnsBySource}
        isAdding={isAdding}
        setIsAdding={setIsAdding}
        newRowData={newRowData}
        setNewRowData={setNewRowData}
        handleAddCommit={handleAddCommit}
        onRequestDeleteRow={(row) => {
          setDeleteTarget({
            kind: "row",
            id: row.id,
            label: String(
              (row as any).name ??
                (row as any).subject ??
                (row as any).title ??
                "this row",
            ),
          });
        }}
      />

      <EditableTableFooterBar
        canAdd={!!onAdd}
        setIsAdding={setIsAdding}
        setNewRowData={(value) => setNewRowData(value)}
        pagination={pagination}
        onPageChange={onPageChange}
        currentPage={currentPage}
        totalPages={totalPages}
        totalRows={totalRows}
        dataLength={data.length}
        pageSize={pageSize}
      />

      <EditableTableDeleteDialog
        deleteTarget={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleteColumn={onColumnDelete}
        onDeleteRow={onDelete}
      />
    </div>
  );
}
