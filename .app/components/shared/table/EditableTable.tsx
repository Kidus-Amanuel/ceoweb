"use client";
"use no memo";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, RowData, SortingState } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
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
import { Label } from "@/components/shared/ui/label/Label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/ui/table";
import { SmartEditor, defaultCurrencyOptions } from "./SmartEditor";

export interface VirtualColumn {
  id: string;
  label: string;
  key: string;
  type:
    | "text"
    | "number"
    | "date"
    | "datetime"
    | "select"
    | "boolean"
    | "json"
    | "currency";
  options?: { label: string; value: string | number }[];
}

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
      | "currency";
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
}

type DeleteTarget = {
  kind: "row" | "column";
  id: string;
  label: string;
} | null;

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
const toColumnKey = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const allowedTypes: VirtualColumn["type"][] = [
  "text",
  "number",
  "date",
  "datetime",
  "select",
  "boolean",
  "json",
  "currency",
];
const asColumnType = (v: unknown): VirtualColumn["type"] =>
  allowedTypes.includes(v as VirtualColumn["type"])
    ? (v as VirtualColumn["type"])
    : "text";
const findSelectLabel = (
  options: { label: string; value: string | number }[] | undefined,
  value: unknown,
) => {
  const n = norm(value);
  if (!options?.length || !n) return undefined;
  return options.find((o) => norm(o.value) === n || norm(o.label) === n)?.label;
};
const formatDateValue = (value: unknown, withTime: boolean) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return withTime
    ? parsed.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : parsed.toLocaleDateString();
};
const prettyValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  const rec = value as Record<string, unknown>;
  if ("amount" in rec || "currency" in rec) {
    const currency = String(rec.currency ?? "USD");
    const amountRaw = rec.amount;
    const amount =
      amountRaw === null || amountRaw === undefined || amountRaw === ""
        ? null
        : Number(amountRaw);
    if (amount === null || Number.isNaN(amount)) return currency;
    return `${currency} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return JSON.stringify(value);
};
const resolveMetaForValues = (meta: any, values?: Record<string, unknown>) => {
  if (
    meta?.type !== "select" ||
    !meta?.optionsByType ||
    !meta?.optionsSourceKey
  )
    return meta;
  const source = values?.[meta.optionsSourceKey];
  return {
    ...meta,
    options:
      meta.optionsByType[norm(source)] ??
      meta.optionsByType[String(source ?? "")] ??
      [],
  };
};

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
}: EditableTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingCell, setEditingCell] = useState<{
    id: string;
    columnId: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>("");
  const [isAdding, setIsAdding] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<VirtualColumn["type"]>("text");
  const [newColOptions, setNewColOptions] = useState("");
  const [newColKey, setNewColKey] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [isColPopoverOpen, setIsColPopoverOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setSearchValue = (value: string) => {
    setGlobalFilter(value);
    onSearchQueryChange?.(value);
  };

  const resetColumnForm = () => {
    setEditingColumnId(null);
    setNewColLabel("");
    setNewColType("text");
    setNewColOptions("");
    setNewColKey("");
  };

  const openColumnForEdit = (column: VirtualColumn) => {
    setEditingColumnId(column.id);
    setNewColLabel(column.label);
    setNewColType(asColumnType(column.type));
    setNewColKey(column.key);
    setNewColOptions(
      (column.options ?? [])
        .map((option) => String(option.value ?? option.label))
        .join(", "),
    );
    setIsColPopoverOpen(true);
  };

  const finalColumns = useMemo(() => {
    const virtualDefs: ColumnDef<T, any>[] = virtualColumns.map((vCol) => ({
      id: vCol.key,
      header: () => (
        <div className="flex items-center gap-2">
          <span>{vCol.label}</span>
          {onColumnUpdate ? (
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
          ) : null}
          {onColumnDelete ? (
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
          ) : null}
        </div>
      ),
      accessorFn: (row) => row.customValues?.[vCol.key],
      meta: { type: vCol.type, options: vCol.options, isVirtual: true },
      cell: (info) => {
        const val = info.getValue();
        const meta = info.column.columnDef.meta;
        if (meta?.type === "select") {
          return (
            <span>
              {findSelectLabel(meta.options, val) ?? prettyValue(val)}
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
  }, [baseColumns, onColumnDelete, onColumnUpdate, virtualColumns]);

  const dependentColumnsBySource = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const col of finalColumns) {
      const source = col.meta?.optionsSourceKey;
      const key = String(
        col.id ??
          (((col as { accessorKey?: unknown }).accessorKey as string) || ""),
      );
      if (!source || !key) continue;
      if (!map[source]) map[source] = [];
      map[source].push(key);
    }
    return map;
  }, [finalColumns]);

  useEffect(() => {
    if (!editingCell || !inputRef.current) return;
    inputRef.current.focus();
    if (inputRef.current.type === "text") inputRef.current.select();
  }, [editingCell]);

  useEffect(() => {
    if (searchQuery !== undefined) setGlobalFilter(searchQuery);
  }, [searchQuery]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: finalColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableGlobalFilter: true,
    globalFilterFn: "auto",
  });

  const handleSave = (
    id: string,
    columnId: string,
    value: any,
    isVirtual: boolean,
  ) => {
    if (!onUpdate) return;
    const row = data.find((entry) => entry.id === id);
    if (!row) return;
    if (isVirtual) {
      onUpdate(id, {
        customValues: { ...(row.customValues || {}), [columnId]: value },
      } as Partial<T>);
    } else {
      onUpdate(id, { [columnId]: value } as Partial<T>);
    }
    setEditingCell(null);
  };

  const handleAddCommit = () => {
    onAdd?.(newRowData as Partial<T>);
    setIsAdding(false);
    setNewRowData({});
  };

  const handleSaveColumn = () => {
    if (!newColLabel.trim()) return;
    const key = (newColKey || toColumnKey(newColLabel)).trim();
    const options =
      newColType === "currency"
        ? defaultCurrencyOptions
        : newColType === "select"
          ? newColOptions
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
              .map((v) => ({ label: v, value: v }))
          : undefined;
    const next = { label: newColLabel, key, type: newColType, options };
    if (editingColumnId && onColumnUpdate)
      onColumnUpdate(editingColumnId, next);
    else onColumnAdd?.(next);
    resetColumnForm();
    setIsColPopoverOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="flex flex-col h-full bg-white rounded-[24px] border border-border shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-6 py-5 border-b border-border bg-white space-y-3">
        {title ? (
          <h3 className="text-2xl font-bold text-[#37352F] tracking-tight antialiased">
            {title}
          </h3>
        ) : null}
        {description ? (
          <p className="text-[14px] text-[#787774] font-medium leading-relaxed max-w-xl">
            {description}
          </p>
        ) : null}
        {searchable ? (
          <div className="relative flex-1 group max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-blue-500" />
            <Input
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-12 h-12 bg-[#F7F7F5] border-border rounded-[16px]"
            />
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-auto">
        <Table className="w-full min-w-[1300px] table-auto border-collapse">
          <TableHeader className="sticky top-0 z-30 bg-white [&_tr]:border-b [&_tr]:border-border">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header, i) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-[52px] text-left align-middle font-bold text-[11px] uppercase tracking-[0.14em] text-[#91918E] border-r border-border/40 last:border-r-0",
                      i === 0 ? "pl-6" : "px-6",
                    )}
                  >
                    <div
                      className="flex items-center gap-2 cursor-pointer py-1"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : null}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-12 border-r border-border/40 last:border-r-0 px-1">
                  {onColumnAdd ? (
                    <Popover
                      open={isColPopoverOpen}
                      onOpenChange={setIsColPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isColPopoverOpen) {
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
                        className="w-80 p-5 space-y-4 shadow-3xl rounded-[24px] border-[#F1F1F0] z-[100]"
                      >
                        <div className="space-y-2">
                          <h4 className="font-bold text-[#37352F] flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-violet-500" />
                            {editingColumnId ? "Update Column" : "Add Column"}
                          </h4>
                          <p className="text-xs text-[#787774]">
                            Define an additional reusable column.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase tracking-widest font-bold text-[#91918E]">
                              Field Name
                            </Label>
                            <Input
                              placeholder="e.g. Blood Type"
                              value={newColLabel}
                              onChange={(e) => {
                                const v = e.target.value;
                                setNewColLabel(v);
                                if (!editingColumnId)
                                  setNewColKey(toColumnKey(v));
                              }}
                              className="h-10 rounded-[12px] border-[#E9E9E7]"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase tracking-widest font-bold text-[#91918E]">
                              Field Key
                            </Label>
                            <Input
                              placeholder="e.g. blood_type"
                              value={newColKey}
                              onChange={(e) =>
                                setNewColKey(toColumnKey(e.target.value))
                              }
                              className="h-10 rounded-[12px] border-[#E9E9E7]"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase tracking-widest font-bold text-[#91918E]">
                              Data Type
                            </Label>
                            <Select
                              value={newColType}
                              onValueChange={(v: VirtualColumn["type"]) => {
                                setNewColType(v);
                                if (v !== "select" && v !== "currency")
                                  setNewColOptions("");
                              }}
                            >
                              <SelectTrigger className="h-10 rounded-[12px] border-[#E9E9E7]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[110]">
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="datetime">
                                  Date + Time
                                </SelectItem>
                                <SelectItem value="boolean">
                                  Boolean (Checkbox)
                                </SelectItem>
                                <SelectItem value="select">
                                  Select (Dropdown)
                                </SelectItem>
                                <SelectItem value="currency">
                                  Currency
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {newColType === "select" ? (
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-widest font-bold text-[#91918E]">
                                Options (Comma Separated)
                              </Label>
                              <Input
                                placeholder="e.g. High, Medium, Low"
                                value={newColOptions}
                                onChange={(e) =>
                                  setNewColOptions(e.target.value)
                                }
                                className="h-10 rounded-[12px] border-[#E9E9E7]"
                              />
                            </div>
                          ) : null}
                          <Button
                            onClick={handleSaveColumn}
                            className="w-full bg-[#37352F] hover:bg-black text-white rounded-[14px] h-11 font-bold mt-2"
                          >
                            {editingColumnId
                              ? "Update Column"
                              : "Create Column"}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
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
                  className="group hover:bg-muted/20 transition-colors"
                >
                  {row.getVisibleCells().map((cell, i) => {
                    const rowValues = row.original as Record<string, unknown>;
                    const meta = resolveMetaForValues(
                      cell.column.columnDef.meta,
                      rowValues,
                    );
                    const isEditing =
                      editingCell?.id === row.original.id &&
                      editingCell?.columnId === cell.column.id;
                    const isSelect = meta?.type === "select";
                    const isBoolean = meta?.type === "boolean";
                    const isVirtual = !!cell.column.columnDef.meta?.isVirtual;
                    const rawValue = cell.getValue();
                    const selectedLabel = isSelect
                      ? findSelectLabel(meta?.options, rawValue)
                      : null;

                    const renderCell = () => {
                      if (isEditing) {
                        return (
                          <SmartEditor
                            inputRef={inputRef}
                            meta={meta}
                            value={editValue}
                            onChange={setEditValue}
                            onCommit={(v) =>
                              handleSave(
                                row.original.id,
                                cell.column.id,
                                v ?? editValue,
                                isVirtual,
                              )
                            }
                            onCancel={() => setEditingCell(null)}
                          />
                        );
                      }
                      if (isSelect)
                        return (
                          <span>{selectedLabel ?? prettyValue(rawValue)}</span>
                        );
                      if (isBoolean) {
                        return (
                          <Checkbox
                            checked={!!rawValue}
                            onCheckedChange={(checked) =>
                              handleSave(
                                row.original.id,
                                cell.column.id,
                                checked === true,
                                isVirtual,
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      }
                      if (
                        !isVirtual &&
                        (meta?.type === "date" || meta?.type === "datetime")
                      ) {
                        return (
                          <span>
                            {formatDateValue(
                              rawValue,
                              meta?.type === "datetime",
                            )}
                          </span>
                        );
                      }
                      const rendered = flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      );
                      return rendered ?? <span>{prettyValue(rawValue)}</span>;
                    };

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "py-2 border-b border-r border-border/40 last:border-r-0 align-top",
                          isVirtual ? "min-w-[260px]" : "min-w-[180px]",
                          i === 0 ? "pl-6" : "px-6",
                        )}
                        onClick={() => {
                          if (isBoolean) return;
                          setEditingCell({
                            id: row.original.id,
                            columnId: cell.column.id,
                          });
                          setEditValue(cell.getValue());
                        }}
                      >
                        <div className="font-medium text-[#37352F] break-words whitespace-normal">
                          {renderCell()}
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="px-1 py-4 border-b border-border/60" />
                  <TableCell className="px-4 py-4 border-b border-border/60">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Delete ${row.original.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const label = String(
                          (row.original as Record<string, unknown>).name ??
                            (row.original as Record<string, unknown>).title ??
                            row.original.id,
                        );
                        setDeleteTarget({
                          kind: "row",
                          id: row.original.id,
                          label,
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
              {isAdding ? (
                <motion.tr
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-blue-50/10"
                >
                  {table.getVisibleFlatColumns().map((column, i) => {
                    const isVirtual = !!column.columnDef.meta?.isVirtual;
                    const columnId = column.id;
                    const meta = resolveMetaForValues(
                      column.columnDef.meta,
                      newRowData,
                    );
                    return (
                      <TableCell
                        key={column.id}
                        className={cn(
                          "py-2 border-b border-border/60 align-top",
                          column.columnDef.meta?.isVirtual
                            ? "min-w-[260px]"
                            : "min-w-[200px]",
                          i === 0 ? "pl-6" : "px-6",
                        )}
                      >
                        <SmartEditor
                          isAddMode
                          meta={meta}
                          placeholder={`Set ${String(column.columnDef.header)}...`}
                          value={
                            isVirtual
                              ? newRowData.customValues?.[columnId]
                              : newRowData[columnId]
                          }
                          onChange={(nextValue) => {
                            setNewRowData((prev) => {
                              const next = { ...prev };
                              if (isVirtual) {
                                return {
                                  ...next,
                                  customValues: {
                                    ...(prev.customValues || {}),
                                    [columnId]: nextValue,
                                  },
                                };
                              }
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
                  <TableCell className="px-1 py-4 border-b border-border/60" />
                  <TableCell className="px-4 py-4 border-b border-border/60">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        onClick={handleAddCommit}
                        aria-label="Save new row"
                        className="h-9 w-9 rounded-full bg-green-500 hover:bg-green-600 text-white border border-green-600/40"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setIsAdding(false);
                          setNewRowData({ customValues: {} });
                        }}
                        className="h-9 w-9 rounded-full text-red-400 hover:bg-red-50 border"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ) : null}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-white gap-4">
        {onAdd ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsAdding(true);
              setNewRowData({});
            }}
            aria-label="New Record"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Row
          </Button>
        ) : (
          <div />
        )}

        {pagination && onPageChange ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#787774]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!canGoPrevious}
                onClick={() => onPageChange(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canGoNext}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
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
