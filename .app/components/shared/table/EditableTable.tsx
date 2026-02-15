"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState, RowData } from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  X,
  Filter,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/ui/button/Button";
import { Input } from "@/components/shared/ui/input/Input";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import { Label } from "@/components/shared/ui/label/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select/Select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover/Popover";

// --- Types ---
export interface VirtualColumn {
  id: string;
  label: string;
  key: string;
  type: "text" | "number" | "select" | "boolean" | "json";
  options?: { label: string; value: string | number }[];
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    type?: "text" | "number" | "select" | "boolean" | "json";
    options?: { label: string; value: string | number }[];
    isVirtual?: boolean;
  }
}

interface EditableTableProps<
  T extends { id: string; costimize?: Record<string, any> },
> {
  data: T[];
  columns: ColumnDef<T, any>[];
  virtualColumns?: VirtualColumn[];
  title: string;
  description?: string;
  onAdd?: (data: Partial<T>) => void;
  onUpdate?: (id: string, data: Partial<T>) => void;
  onDelete?: (id: string) => void;
  onColumnAdd?: (column: Omit<VirtualColumn, "id">) => void;
  searchable?: boolean;
  pagination?: boolean;
}

// --- Smart Editor Component (extracted to prevent re-creation on renders) ---
interface SmartEditorProps {
  value: any;
  onChange: (val: any) => void;
  onCommit?: () => void;
  onCancel?: () => void;
  meta?: any;
  placeholder?: string;
  isAddMode?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const SmartEditor = ({
  value,
  onChange,
  onCommit,
  onCancel,
  meta,
  placeholder,
  isAddMode = false,
  inputRef,
}: SmartEditorProps) => {
  const type = meta?.type || "text";

  if (type === "boolean") {
    return (
      <div className="flex items-center h-full px-1">
        <Checkbox
          checked={!!value}
          onCheckedChange={(checked) => {
            onChange(checked);
            if (!isAddMode) onCommit?.();
          }}
        />
      </div>
    );
  }

  if (type === "select" && meta?.options) {
    return (
      <Select
        value={String(value ?? "")}
        onValueChange={(val) => {
          onChange(val);
          if (!isAddMode) onCommit?.();
        }}
      >
        <SelectTrigger className="h-9 w-full rounded-[10px] border-[#2383E2]/20 bg-white ring-blue-500/10 shadow-2xl">
          <SelectValue placeholder={placeholder || "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {meta.options.map((opt: any) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (type === "json") {
    return (
      <Input
        ref={!isAddMode && inputRef ? inputRef : undefined}
        placeholder={placeholder}
        value={
          typeof value === "object" ? JSON.stringify(value) : (value ?? "")
        }
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(value);
            onChange(parsed);
          } catch (e) {}
          if (!isAddMode) onCommit?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit?.();
          if (e.key === "Escape") onCancel?.();
        }}
        className="h-10 -my-1 rounded-[12px] border-[#2383E2] bg-white ring-[6px] ring-blue-500/10 shadow-2xl font-mono text-[11px]"
      />
    );
  }

  return (
    <Input
      ref={!isAddMode && inputRef ? inputRef : undefined}
      type={type === "number" ? "number" : "text"}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) =>
        onChange(type === "number" ? Number(e.target.value) : e.target.value)
      }
      onBlur={() => !isAddMode && onCommit?.()}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit?.();
        if (e.key === "Escape") onCancel?.();
      }}
      className="h-10 -my-1 rounded-[12px] border-[#2383E2] bg-white ring-[6px] ring-blue-500/10 shadow-2xl relative font-semibold text-[#37352F]"
    />
  );
};

export function EditableTable<
  T extends { id: string; costimize?: Record<string, any> },
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
  searchable = true,
  pagination = true,
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

  // Virtual Column Builder State
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<VirtualColumn["type"]>("text");
  const [isColPopoverOpen, setIsColPopoverOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Merge base columns with virtual columns
  const finalColumns = useMemo(() => {
    const vCols: ColumnDef<T, any>[] = virtualColumns.map((vc) => ({
      id: vc.key,
      header: vc.label,
      accessorFn: (row) => row.costimize?.[vc.key],
      meta: {
        type: vc.type,
        options: vc.options,
        isVirtual: true,
      },
      cell: (info) => {
        const val = info.getValue();
        if (vc.type === "boolean")
          return (
            <Checkbox
              checked={!!val}
              disabled
              className="scale-75 cursor-default"
            />
          );
        if (vc.type === "json")
          return (
            <span className="text-[10px] font-mono opacity-50 truncate max-w-[80px]">
              {JSON.stringify(val)}
            </span>
          );
        return <span>{val ?? "-"}</span>;
      },
    }));

    return [...baseColumns, ...vCols];
  }, [baseColumns, virtualColumns]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.type === "text") inputRef.current.select();
    }
  }, [editingCell]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      sorting,
      globalFilter,
    },
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

    const row = data.find((r) => r.id === id);
    if (!row) return;

    if (isVirtual) {
      const updatedCostimize = { ...(row.costimize || {}), [columnId]: value };
      onUpdate(id, { costimize: updatedCostimize } as Partial<T>);
    } else {
      // Use the column's internal ID which matches accessorKey for base columns
      onUpdate(id, { [columnId]: value } as Partial<T>);
    }
    setEditingCell(null);
  };

  const handleAddCommit = () => {
    if (onAdd) {
      onAdd(newRowData as Partial<T>);
    }
    setIsAdding(false);
    setNewRowData({});
  };

  const handleAddColumn = () => {
    if (onColumnAdd && newColLabel) {
      const key = newColLabel.toLowerCase().replace(/\s+/g, "_");
      onColumnAdd({
        label: newColLabel,
        key,
        type: newColType,
      });
      setNewColLabel("");
      setIsColPopoverOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[24px] border border-[#E9E9E7] shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-500 hover:shadow-[0_12px_50px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="px-10 py-8 border-b border-[#F1F1F0] bg-white">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1.5">
            <h3 className="text-2xl font-bold text-[#37352F] tracking-tight antialiased">
              {title}
            </h3>
            {description && (
              <p className="text-[14px] text-[#787774] font-medium leading-relaxed max-w-xl">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsAdding(true)}
              aria-label="New Record"
              className="bg-[#2383E2] hover:bg-[#1A6FB0] text-white rounded-[14px] px-6 h-11 font-bold flex items-center gap-2 shadow-xl shadow-blue-500/20"
            >
              <Plus className="w-5 h-5" />
              New Record
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {searchable && (
            <div className="relative flex-1 group max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#91918E] group-focus-within:text-[#2383E2]" />
              <Input
                placeholder="Search workspace..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-12 h-12 bg-[#F7F7F5] border-transparent focus:bg-white focus:border-[#2383E2] rounded-[16px] transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-30 bg-white/90 backdrop-blur-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    className={cn(
                      "h-[52px] text-left align-middle font-bold text-[11px] uppercase tracking-[0.14em] text-[#91918E] border-b border-[#F1F1F0]",
                      index === 0 ? "pl-10" : "px-8",
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
                      {header.column.getIsSorted() &&
                        (header.column.getIsSorted() === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ))}
                    </div>
                  </th>
                ))}
                <th className="w-12 border-b border-[#F1F1F0]">
                  <Popover
                    open={isColPopoverOpen}
                    onOpenChange={setIsColPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F1F1F0] text-[#91918E] transition-colors translate-y-[2px]">
                        <Plus className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-80 p-5 space-y-4 shadow-3xl rounded-[24px] border-[#F1F1F0] z-[100]"
                    >
                      <div className="space-y-2">
                        <h4 className="font-bold text-[#37352F] flex items-center gap-2">
                          <Settings2 className="w-4 h-4 opacity-40" />
                          Add Custom Field
                        </h4>
                        <p className="text-xs text-[#787774]">
                          Stored in the JSONB metadata layer.
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
                            onChange={(e) => setNewColLabel(e.target.value)}
                            className="h-10 rounded-[12px] border-[#E9E9E7] focus:border-[#2383E2] transition-all bg-[#F7F7F5]/50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest font-bold text-[#91918E]">
                            Data Type
                          </Label>
                          <Select
                            value={newColType}
                            onValueChange={(val: any) => setNewColType(val)}
                          >
                            <SelectTrigger className="h-10 rounded-[12px] border-[#E9E9E7] bg-[#F7F7F5]/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[110]">
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="boolean">
                                Boolean (Checkbox)
                              </SelectItem>
                              <SelectItem value="select">
                                Select (Dropdown)
                              </SelectItem>
                              <SelectItem value="json">JSON Object</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleAddColumn}
                          className="w-full bg-[#37352F] hover:bg-black text-white rounded-[14px] h-11 font-bold mt-2 shadow-lg shadow-black/5"
                        >
                          Create Column
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </th>
                <th className="w-24 px-4 border-b border-[#F1F1F0]" />
              </tr>
            ))}
          </thead>
          <tbody className="bg-white">
            <AnimatePresence mode="wait">
              {isAdding && (
                <motion.tr
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-blue-50/10"
                >
                  {table.getVisibleFlatColumns().map((column, index) => {
                    const isVirtual = column.columnDef.meta?.isVirtual;
                    const colId = column.id;
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          "py-5 border-b border-[#F1F1F0]",
                          index === 0 ? "pl-10" : "px-8",
                        )}
                      >
                        <SmartEditor
                          isAddMode={true}
                          meta={column.columnDef.meta}
                          placeholder={`Set ${String(column.columnDef.header)}...`}
                          value={
                            isVirtual
                              ? newRowData.costimize?.[colId]
                              : newRowData[colId]
                          }
                          onChange={(val) => {
                            setNewRowData((prev) => {
                              if (isVirtual) {
                                return {
                                  ...prev,
                                  costimize: {
                                    ...(prev.costimize || {}),
                                    [colId]: val,
                                  },
                                };
                              } else {
                                return { ...prev, [colId]: val };
                              }
                            });
                          }}
                        />
                      </td>
                    );
                  })}
                  <td className="px-1 py-5 border-b border-[#F1F1F0]" />
                  <td className="px-6 py-5 border-b border-[#F1F1F0]">
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        onClick={handleAddCommit}
                        aria-label="Save new record"
                        className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setIsAdding(false);
                          setNewRowData({ costimize: {} });
                        }}
                        className="h-10 w-10 rounded-full text-red-400 hover:bg-red-50"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {table.getRowModel().rows.map((row) => (
                <motion.tr
                  layout
                  key={row.id}
                  className="group hover:bg-[#F7F7F5]/60 transition-colors duration-300"
                >
                  {row.getVisibleCells().map((cell, index) => {
                    const isEditing =
                      editingCell?.id === row.original.id &&
                      editingCell?.columnId === cell.column.id;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "py-5 border-b border-[#F1F1F0] relative overflow-hidden",
                          index === 0 ? "pl-10" : "px-8",
                        )}
                        onClick={() => {
                          setEditingCell({
                            id: row.original.id,
                            columnId: cell.column.id,
                          });
                          setEditValue(cell.getValue());
                        }}
                      >
                        {isEditing ? (
                          <SmartEditor
                            inputRef={inputRef}
                            meta={cell.column.columnDef.meta}
                            value={editValue}
                            onChange={setEditValue}
                            onCommit={() =>
                              handleSave(
                                row.original.id,
                                cell.column.id,
                                editValue,
                                !!cell.column.columnDef.meta?.isVirtual,
                              )
                            }
                            onCancel={() => setEditingCell(null)}
                          />
                        ) : (
                          <div className="font-semibold text-[#37352F] cursor-text">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-1 py-5 border-b border-[#F1F1F0]" />
                  <td className="px-6 py-5 border-b border-[#F1F1F0]">
                    <div className="flex justify-end transition-all duration-300">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${row.original.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDelete) onDelete(row.original.id);
                        }}
                        className="h-10 w-10 text-[#91918E] hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
