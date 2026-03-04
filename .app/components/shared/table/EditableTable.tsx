"use client";
"use no memo";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, RowData, SortingState } from "@tanstack/react-table";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/ui/button/Button";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/ui/dialog";
import { Input } from "@/components/shared/ui/input/Input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover/Popover";
import { SmartEditor } from "@/components/shared/table/SmartEditor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/ui/table";
import {
  ColumnFieldType,
  CustomColumnEditorContent,
} from "./CustomColumnEditorContent";
import {
  VirtualColumn,
  asColumnType,
  defaultCurrencyOptions,
  fieldTypeChoices,
  findSelectLabel,
  findSelectOptionIndex,
  formatDateValue,
  getSemanticOptionTone,
  getTypeIcon,
  getTypeIconTone,
  hasMeaningfulCustomValue,
  norm,
  parseOptionTokens,
  prettyValue,
  prettifyColumnKey,
  resolveMetaForValues,
  toColumnKey,
} from "@/utils/table-utils";

export type { VirtualColumn };

type ColumnMetaOptionValue<TValue> = TValue extends string | number
  ? TValue
  : string | number;
type ColumnMetaSourceKey<TData> = TData extends object
  ? Extract<keyof TData, string>
  : string;

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
      | "status"
      | "phone"
      | "email";
    options?: { label: string; value: ColumnMetaOptionValue<TValue> }[];
    optionsByType?: Record<
      string,
      { label: string; value: ColumnMetaOptionValue<TValue> }[]
    >;
    optionsSourceKey?: ColumnMetaSourceKey<TData>;
    isVirtual?: boolean;
    virtualKey?: string;
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
}

type DeleteTarget = {
  kind: "row" | "column";
  id: string;
  label: string;
} | null;
const useSafeTableInterop = <TData extends RowData>(
  options: Parameters<typeof useReactTable<TData>>[0],
  // eslint-disable-next-line react-hooks/incompatible-library
) => useReactTable(options);

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
  const [isColPopoverOpen, setIsColPopoverOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [colFormSeed, setColFormSeed] = useState(0);
  const [colFormError, setColFormError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [newColLabelValue, setNewColLabelValue] = useState("");
  const [newColOptionsValue, setNewColOptionsValue] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowElementsRef = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
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
    setNewColLabelValue("");
    setNewColOptionsValue("");
    setColFormSeed((p) => p + 1);
  }, []);

  const openColumnForEdit = useCallback((column: VirtualColumn) => {
    const nextOptions = (column.options ?? [])
      .map((option) => String(option.value ?? option.label))
      .join(", ");
    setEditingColumnId(column.id);
    newColLabel.current = column.label;
    setNewColLabelValue(column.label);
    setNewColType(asColumnType(column.type));
    newColOptions.current = nextOptions;
    setNewColOptionsValue(nextOptions);
    setColFormError(null);
    setColFormSeed((p) => p + 1);
    setIsColPopoverOpen(true);
  }, []);

  const editingColumn = useMemo(
    () =>
      virtualColumns.find((column) => column.id === editingColumnId) ?? null,
    [editingColumnId, virtualColumns],
  );
  const editingColumnHasValues = useMemo(
    () =>
      !!editingColumn &&
      data.some((row) =>
        hasMeaningfulCustomValue(row.customValues?.[editingColumn.key]),
      ),
    [data, editingColumn],
  );
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
    if (!key) {
      setColFormError("Property name must contain letters or numbers.");
      return;
    }
    const editingKey = editingColumn ? norm(editingColumn.key) : null;
    const existingKeys = new Set(
      [
        ...baseColumns.map((col) =>
          String(
            col.id ??
              (((col as { accessorKey?: unknown }).accessorKey as string) ||
                ""),
          ),
        ),
        ...virtualColumns.map((col) => col.key),
      ]
        .map((value) => norm(value))
        .filter(Boolean),
    );
    if (existingKeys.has(norm(key)) && editingKey !== norm(key)) {
      setColFormError("A column with this name already exists.");
      return;
    }
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
    baseColumns,
    newColType,
    onColumnAdd,
    onColumnUpdate,
    resetColumnForm,
    virtualColumns,
  ]);

  const finalColumns = useMemo(() => {
    const virtualDefs: ColumnDef<T, any>[] = virtualColumns.map((vCol) => ({
      id: `vcol:${vCol.id}`,
      header: () => (
        <div className="flex items-center gap-2">
          <span>{vCol.label}</span>
          {onColumnUpdate && (
            <Popover
              open={isColPopoverOpen && editingColumnId === vCol.id}
              onOpenChange={(open) => {
                if (open) return openColumnForEdit(vCol);
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
                  nameDefault={newColLabelValue}
                  optionsDefault={newColOptionsValue}
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
                      setNewColOptionsValue("");
                      setColFormSeed((prev) => prev + 1);
                    }
                  }}
                  onNameChange={(value: string) => {
                    newColLabel.current = value;
                    setNewColLabelValue(value);
                  }}
                  onOptionsChange={(value: string) => {
                    newColOptions.current = value;
                    setNewColOptionsValue(value);
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
      meta: {
        type: vCol.type,
        options: vCol.options,
        isVirtual: true,
        virtualKey: vCol.key,
      },
      cell: (info) => {
        const val = info.getValue();
        const meta = info.column.columnDef.meta;
        if (meta?.type === "select")
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
        if (meta?.type === "date")
          return <span>{formatDateValue(val, false)}</span>;
        if (meta?.type === "datetime")
          return <span>{formatDateValue(val, true)}</span>;
        if (meta?.type === "boolean")
          return (
            <Checkbox
              checked={!!val}
              disabled
              className="scale-75 pointer-events-none"
            />
          );
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
    newColLabelValue,
    newColOptionsValue,
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
      if (!source || !key) continue;
      map[source] = map[source] || [];
      map[source].push(key);
    }
    return map;
  }, [finalColumns]);

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
    () => sorting.filter((entry) => validColumnIds.has(entry.id)),
    [sorting, validColumnIds],
  );

  useEffect(() => {
    if (!editingCell || !inputRef.current) return;
    inputRef.current.focus();
    const el = inputRef.current;
    const len = String(
      (el as HTMLInputElement | HTMLTextAreaElement).value ?? "",
    ).length;
    try {
      (el as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(
        len,
        len,
      );
    } catch {}
  }, [editingCell]);

  const effectiveGlobalFilter = searchQuery ?? globalFilter;
  const effectiveRowSelection = useMemo(
    () =>
      !selectedRowId || rowSelection[selectedRowId]
        ? rowSelection
        : { ...rowSelection, [selectedRowId]: true },
    [rowSelection, selectedRowId],
  );
  const rowsById = useMemo(
    () => new Map(data.map((entry) => [entry.id, entry] as const)),
    [data],
  );

  const table = useSafeTableInterop({
    data,
    columns: finalColumns,
    getRowId: (row) => String(row.id),
    state: {
      sorting: safeSorting,
      globalFilter: effectiveGlobalFilter,
      rowSelection: effectiveRowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
    (
      id: string,
      columnId: string,
      value: any,
      isVirtual: boolean,
      virtualKey?: string,
    ) => {
      if (!onUpdate) return;
      const row = rowsById.get(id);
      if (!row) return;
      const payload = isVirtual
        ? ({
            customValues: {
              ...(row.customValues || {}),
              [virtualKey ??
              leafColumnsById.get(columnId)?.columnDef.meta?.virtualKey ??
              columnId]: value,
            },
          } as Partial<T>)
        : ({ [columnId]: value } as Partial<T>);
      try {
        const maybePromise = onUpdate(id, payload);
        if (
          maybePromise &&
          typeof (maybePromise as Promise<void>).then === "function"
        ) {
          (maybePromise as Promise<void>)
            .then(() => setEditingCell(null))
            .catch(() => {});
          return;
        }
        setEditingCell(null);
      } catch {}
    },
    [leafColumnsById, onUpdate, rowsById],
  );

  const moveToNeighborCell = useCallback(
    (direction: "next" | "prev") => {
      if (!editingCell) return;
      const rows = table.getRowModel().rows;
      const editableColumns = table
        .getVisibleFlatColumns()
        .filter((col) => col.columnDef.meta?.type !== "boolean");
      if (!rows.length || !editableColumns.length) return setEditingCell(null);
      const rowIndex = rows.findIndex(
        (row) => row.original.id === editingCell.id,
      );
      const colIndex = editableColumns.findIndex(
        (col) => col.id === editingCell.columnId,
      );
      if (rowIndex < 0 || colIndex < 0) return setEditingCell(null);
      const currentCol = leafColumnsById.get(editingCell.columnId);
      handleSave(
        editingCell.id,
        editingCell.columnId,
        editValue,
        !!currentCol?.columnDef.meta?.isVirtual,
        currentCol?.columnDef.meta?.virtualKey,
      );
      let nextRowIndex = rowIndex;
      let nextColIndex = colIndex + (direction === "next" ? 1 : -1);
      if (nextColIndex >= editableColumns.length) {
        nextColIndex = 0;
        nextRowIndex += 1;
      }
      if (nextColIndex < 0) {
        nextColIndex = editableColumns.length - 1;
        nextRowIndex -= 1;
      }
      if (nextRowIndex < 0 || nextRowIndex >= rows.length)
        return setEditingCell(null);
      const nextRow = rows[nextRowIndex];
      const nextCol = editableColumns[nextColIndex];
      const nextCell = nextRow
        .getVisibleCells()
        .find((cell) => cell.column.id === nextCol.id);
      setEditingCell({ id: nextRow.original.id, columnId: nextCol.id });
      setEditValue(nextCell?.getValue());
    },
    [editValue, editingCell, handleSave, leafColumnsById, table],
  );

  const registerRowRef = useCallback(
    (rowId: string, element: HTMLTableRowElement | null) => {
      rowElementsRef.current[rowId] = element;
    },
    [],
  );

  const handleRowResizeMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLTableRowElement>, rowId: string) => {
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

  useEffect(() => {
    if (!editingCell) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (
        t?.closest(
          '[data-slot="select-content"],[data-slot="select-item"],[data-slot="popover-content"],[data-slot="dialog-content"]',
        )
      )
        return;
      if (t && containerRef.current?.contains(t)) return;
      const col = leafColumnsById.get(editingCell.columnId);
      handleSave(
        editingCell.id,
        editingCell.columnId,
        editValue,
        !!col?.columnDef.meta?.isVirtual,
        col?.columnDef.meta?.virtualKey,
      );
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [editValue, editingCell, handleSave, leafColumnsById]);

  const handleAddCommit = async () => {
    if (!onAdd) return;
    try {
      const maybePromise = onAdd(newRowData as Partial<T>);
      if (
        maybePromise &&
        typeof (maybePromise as Promise<void>).then === "function"
      )
        await maybePromise;
      setIsAdding(false);
      setNewRowData({});
    } catch {}
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
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
    if (key.includes("email")) return "min-w-[180px]";
    if (key.includes("phone") || key.includes("mobile") || key.includes("tel"))
      return "min-w-[140px]";
    if (type === "email") return "min-w-[180px]";
    if (type === "phone") return "min-w-[140px]";
    if (type === "number" || type === "currency") return "min-w-[180px]";
    if (type === "date" || type === "datetime") return "min-w-[220px]";
    if (type === "select" || type === "status" || type === "boolean")
      return "min-w-[140px]";
    return isVirtual ? "min-w-[220px]" : "min-w-[200px]";
  };

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
    const minWidth = nameColumn ? 200 : emailColumn ? 220 : 170;
    const maxWidth = 350;
    autoWidthByColumnId.set(
      column.id,
      Math.min(maxWidth, Math.max(minWidth, longest * 9 + 56)),
    );
  });

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-col h-full bg-white rounded-[20px] border border-border shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {(title || description || searchable) && (
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
      )}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar pb-2">
          <Table className="w-full min-w-[1170px] table-auto border-collapse border border-border/70">
            <TableHeader className="sticky top-0 z-30 bg-white [&_tr]:border-b [&_tr]:border-border/70">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="hover:bg-transparent">
                  <TableHead className="h-[52px] w-12 min-w-12 px-2 md:w-14 md:min-w-14 md:px-4 border-r border-border/70 text-center">
                    <Checkbox
                      checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                      }
                      onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(value === true)
                      }
                    />
                  </TableHead>
                  {group.headers.map((header, i) => {
                    const headerType = header.column.columnDef.meta?.type;
                    const headerKey = String(
                      header.column.columnDef.meta?.virtualKey ??
                        header.column.id,
                    );
                    const headerAutoWidth = autoWidthByColumnId.get(
                      header.column.id,
                    );
                    const emailOrPhoneHeader =
                      headerKey.toLowerCase().includes("name") ||
                      isEmailColumn(headerKey, headerType) ||
                      isPhoneColumn(headerKey, headerType);
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "h-[52px] text-center align-middle font-bold text-[11px] uppercase tracking-[0.14em] text-[#656560] border-r border-border/70 last:border-r-0",
                          getColumnSizeClasses(
                            String(
                              header.column.columnDef.meta?.virtualKey ??
                                header.column.id,
                            ),
                            !!header.column.columnDef.meta?.isVirtual,
                            header.column.columnDef.meta?.type,
                          ),
                          i === 0 ? "px-4" : "px-6",
                        )}
                        style={
                          emailOrPhoneHeader && headerAutoWidth
                            ? { minWidth: `${headerAutoWidth}px` }
                            : undefined
                        }
                      >
                        <div
                          className="flex items-center justify-center gap-2 cursor-pointer py-1"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {(() => {
                              const t =
                                header.column.columnDef.meta?.type ?? "text";
                              const Icon = getTypeIcon(t);
                              return (
                                <span
                                  className={cn(
                                    "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                                    getTypeIconTone(t),
                                  )}
                                >
                                  <Icon className="h-3 w-3" />
                                </span>
                              );
                            })()}
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                          </div>
                          {header.column.getIsSorted() === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : null}
                        </div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="w-12 border-r border-border/70 last:border-r-0 px-1">
                    {onColumnAdd && (
                      <Popover
                        open={isColPopoverOpen && !editingColumnId}
                        onOpenChange={(open) => {
                          if (open) {
                            resetColumnForm();
                            setIsColPopoverOpen(true);
                            return;
                          }
                          setIsColPopoverOpen(false);
                          resetColumnForm();
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isColPopoverOpen || editingColumnId) {
                                resetColumnForm();
                                setIsColPopoverOpen(true);
                              }
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F1F1F0] text-[#91918E] border border-border/60"
                          >
                            <Plus className="w-4 h-4 text-blue-500" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          onOpenAutoFocus={(event) => event.preventDefault()}
                          className="w-[680px] p-4 space-y-3 shadow-3xl rounded-[20px] border-[#E6E6E3] z-[100]"
                        >
                          <CustomColumnEditorContent
                            seed={colFormSeed}
                            nameDefault={newColLabelValue}
                            optionsDefault={newColOptionsValue}
                            currentType={newColType as ColumnFieldType}
                            fieldTypeFilter={typeFilter}
                            onFieldTypeFilterChange={setTypeFilter}
                            choices={filteredTypeChoices}
                            lockTypeChange={false}
                            onTypeChange={(nextType) => {
                              setNewColType(nextType as VirtualColumn["type"]);
                              setColFormError(null);
                              if (
                                nextType !== "select" &&
                                nextType !== "currency" &&
                                nextType !== "status"
                              ) {
                                newColOptions.current = "";
                                setNewColOptionsValue("");
                                setColFormSeed((prev) => prev + 1);
                              }
                            }}
                            onNameChange={(value: string) => {
                              newColLabel.current = value;
                              setNewColLabelValue(value);
                            }}
                            onOptionsChange={(value: string) => {
                              newColOptions.current = value;
                              setNewColOptionsValue(value);
                            }}
                            error={colFormError}
                            onSave={handleSaveColumn}
                            saveLabel={
                              editingColumnId
                                ? "Update Property"
                                : "Create Property"
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableHead>
                  <TableHead className="w-20 px-4" />
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {table.getRowModel().rows.map((row) => (
                  <motion.tr
                    layout
                    key={row.id}
                    ref={(el) => registerRowRef(row.original.id, el)}
                    style={
                      rowHeights[row.original.id]
                        ? { height: rowHeights[row.original.id] }
                        : undefined
                    }
                    onMouseDown={(event) =>
                      handleRowResizeMouseDown(event, row.original.id)
                    }
                    className={cn(
                      "group transition-colors",
                      row.getIsSelected()
                        ? "bg-blue-50/70 hover:bg-blue-50/80"
                        : "hover:bg-muted/20",
                    )}
                  >
                    <TableCell className="w-12 min-w-12 px-2 md:w-14 md:min-w-14 md:px-4 py-3 border-b border-r border-border/70 align-middle text-center">
                      <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) =>
                          row.toggleSelected(value === true)
                        }
                        onClick={(event) => event.stopPropagation()}
                      />
                    </TableCell>
                    {row.getVisibleCells().map((cell, i) => {
                      const meta = resolveMetaForValues(
                        cell.column.columnDef.meta,
                        row.original as Record<string, unknown>,
                      );
                      const isEditing =
                        editingCell?.id === row.original.id &&
                        editingCell?.columnId === cell.column.id;
                      const val = cell.getValue();
                      const isVirtual = !!cell.column.columnDef.meta?.isVirtual;
                      const virtualKey = cell.column.columnDef.meta?.virtualKey;
                      const dataFieldKey = String(virtualKey ?? cell.column.id);
                      const sizeClasses = getColumnSizeClasses(
                        dataFieldKey,
                        isVirtual,
                        meta?.type,
                      );
                      const isEmailOrPhone =
                        dataFieldKey.toLowerCase().includes("name") ||
                        isEmailColumn(dataFieldKey, meta?.type) ||
                        isPhoneColumn(dataFieldKey, meta?.type);
                      const baseAutoWidth = autoWidthByColumnId.get(
                        cell.column.id,
                      );
                      const isLongText =
                        typeof val === "string" &&
                        val.length > 80 &&
                        (meta?.type === undefined ||
                          meta?.type === "text" ||
                          meta?.type === "json");
                      const renderCell = () => {
                        if (isEditing)
                          return (
                            <SmartEditor
                              inputRef={inputRef}
                              meta={meta}
                              fieldKey={dataFieldKey}
                              value={editValue}
                              onChange={setEditValue}
                              onNavigate={moveToNeighborCell}
                              onCommit={(v) =>
                                handleSave(
                                  row.original.id,
                                  cell.column.id,
                                  v ?? editValue,
                                  isVirtual,
                                  virtualKey,
                                )
                              }
                              onCancel={() => setEditingCell(null)}
                            />
                          );
                        if (meta?.type === "select" || meta?.type === "status")
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
                                (meta.options?.length
                                  ? "Unknown"
                                  : prettyValue(val))}
                            </span>
                          );
                        if (meta?.type === "boolean")
                          return (
                            <Checkbox
                              checked={!!val}
                              onCheckedChange={(checked) =>
                                handleSave(
                                  row.original.id,
                                  cell.column.id,
                                  checked === true,
                                  isVirtual,
                                  virtualKey,
                                )
                              }
                              onClick={(event) => event.stopPropagation()}
                            />
                          );
                        if (meta?.type === "date" || meta?.type === "datetime")
                          return (
                            <span className="inline-flex whitespace-nowrap">
                              {formatDateValue(val, meta.type === "datetime")}
                            </span>
                          );
                        return !isVirtual ? (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        ) : (
                          <span>{prettyValue(val)}</span>
                        );
                      };
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "border-b border-r border-border/70 align-middle cursor-text text-center",
                            isEditing ? "px-2 py-1 max-w-none" : "py-2",
                            isEditing
                              ? meta?.type === "currency"
                                ? "min-w-[320px]"
                                : isEmailOrPhone
                                  ? "min-w-[350px]"
                                  : "min-w-[240px]"
                              : sizeClasses,
                            isEditing ? "" : i === 0 ? "px-4" : "px-6",
                          )}
                          style={
                            isEmailOrPhone
                              ? (() => {
                                  if (isEditing) {
                                    const editText = String(
                                      editValue ?? val ?? "",
                                    );
                                    const displayWidth = baseAutoWidth ?? 300;
                                    const minWidth = displayWidth + 50;
                                    const maxWidth = 500;
                                    return {
                                      minWidth: `${Math.min(maxWidth, Math.max(minWidth, editText.length * 9 + 56))}px`,
                                    };
                                  }
                                  return baseAutoWidth
                                    ? { minWidth: `${baseAutoWidth}px` }
                                    : undefined;
                                })()
                              : undefined
                          }
                          onClick={() => {
                            if (meta?.type !== "boolean" && !isEditing) {
                              setEditingCell({
                                id: row.original.id,
                                columnId: cell.column.id,
                              });
                              setEditValue(cell.getValue());
                            }
                          }}
                        >
                          <div
                            className={cn(
                              "flex h-full w-full items-center font-medium text-[#37352F] [overflow-wrap:anywhere] whitespace-normal",
                              isLongText
                                ? "justify-start text-justify"
                                : "justify-center text-center",
                            )}
                          >
                            {renderCell()}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="px-1 py-4 border-b border-border/70" />
                    <TableCell className="px-4 py-4 border-b border-border/70">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${row.index + 1}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget({
                            kind: "row",
                            id: row.original.id,
                            label: String(
                              (row.original as any).name ??
                                (row.original as any).subject ??
                                (row.original as any).title ??
                                "this row",
                            ),
                          });
                        }}
                        className="h-9 w-9 text-red-500/70 hover:text-red-600 hover:bg-red-50 border border-red-100"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {isAdding && (
                  <motion.tr
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="bg-blue-50/10"
                  >
                    <TableCell className="w-12 min-w-12 px-2 md:w-14 md:min-w-14 md:px-4 py-3 border-b border-r border-border/70 align-middle" />
                    {table.getVisibleFlatColumns().map((column, i) => {
                      const isVirtual = !!column.columnDef.meta?.isVirtual;
                      const virtualKey = column.columnDef.meta?.virtualKey;
                      const columnId = column.id;
                      const meta = resolveMetaForValues(
                        column.columnDef.meta,
                        newRowData,
                      );
                      const sizeClasses = getColumnSizeClasses(
                        String(virtualKey ?? columnId),
                        isVirtual,
                        meta?.type,
                      );
                      const placeholderLabel =
                        typeof column.columnDef.header === "string"
                          ? column.columnDef.header
                          : prettifyColumnKey(String(virtualKey ?? columnId));
                      return (
                        <TableCell
                          key={column.id}
                          className={cn(
                            "py-2 border-b border-border/70 align-middle text-center",
                            sizeClasses,
                            i === 0 ? "px-4" : "px-6",
                          )}
                        >
                          <SmartEditor
                            isAddMode
                            meta={meta}
                            fieldKey={String(virtualKey ?? columnId)}
                            placeholder={`Set ${placeholderLabel}...`}
                            value={
                              isVirtual
                                ? newRowData.customValues?.[
                                    String(virtualKey ?? columnId)
                                  ]
                                : newRowData[columnId]
                            }
                            onChange={(nextValue) => {
                              setNewRowData((prev) => {
                                const next = { ...prev };
                                if (isVirtual)
                                  return {
                                    ...next,
                                    customValues: {
                                      ...(prev.customValues || {}),
                                      [String(virtualKey ?? columnId)]:
                                        nextValue,
                                    },
                                  };
                                next[columnId] = nextValue;
                                (
                                  dependentColumnsBySource[columnId] || []
                                ).forEach((dep) => {
                                  if (dep !== columnId) next[dep] = undefined;
                                });
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="px-1 py-4 border-b border-border/70" />
                    <TableCell className="px-4 py-4 border-b border-border/70">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          onClick={handleAddCommit}
                          className="h-9 w-9 rounded-full bg-green-500 text-white border border-green-600/40"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            setIsAdding(false);
                            setNewRowData({});
                          }}
                          className="h-9 w-9 rounded-full text-red-400 hover:bg-red-50 border"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="shrink-0 border-t border-border bg-white">
        <div className="flex flex-wrap items-center justify-between px-6 py-4 gap-3">
          <div className="flex flex-col items-start gap-2">
            {!!onAdd && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdding(true);
                  setNewRowData({});
                }}
                aria-label="New Record"
                className="h-11 rounded-xl border-[#E6EAFA] bg-[#F5F7FF] px-5 text-[15px] font-semibold text-[#4166C9] hover:bg-[#EEF3FF]"
              >
                <Plus className="w-4 h-4 mr-2" />
                New row
              </Button>
            )}
          </div>
          {pagination && onPageChange && (
            <div className="ml-auto flex items-center gap-2">
              <p className="text-sm text-[#787774] whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </p>
              <div className="hidden sm:block h-8 w-px bg-border/80 mx-1" />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => onPageChange(currentPage - 1)}
                  className="!border-[#BEC9DD] hover:!border-[#AAB9D3]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1 text-blue-500" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                  className="!border-[#BEC9DD] hover:!border-[#AAB9D3]"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1 text-blue-500" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border px-6 py-3">
          <div className="flex items-center justify-between gap-2 text-sm text-[#787774]">
            <p className="whitespace-nowrap">
              {totalRows || data.length} rows
              {table.getSelectedRowModel().rows.length > 0
                ? ` � ${table.getSelectedRowModel().rows.length} selected`
                : ""}
            </p>
            <p className="whitespace-nowrap">
              Showing {data.length} � {pageSize}/page
            </p>
          </div>
        </div>
      </div>
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {deleteTarget?.kind === "column" ? "Delete Column" : "Delete Row"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.kind === "column"
                ? `Delete custom column "${deleteTarget?.label}"?`
                : `Delete row "${deleteTarget?.label}"? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.kind === "column")
                  onColumnDelete?.(deleteTarget.id);
                else onDelete?.(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
