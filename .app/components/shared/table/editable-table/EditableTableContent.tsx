"use client";

import type {
  Dispatch,
  MutableRefObject,
  MouseEvent as ReactMouseEvent,
  RefObject,
  SetStateAction,
} from "react";
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/ui/button/Button";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/ui/popover/Popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/ui/table";
import { SmartEditor } from "@/components/shared/table/SmartEditor";
import {
  ColumnFieldChoice,
  ColumnFieldType,
  CustomColumnEditorContent,
} from "@/components/shared/table/CustomColumnEditorContent";
import type { VirtualColumn } from "@/utils/table-utils";
import {
  findSelectLabel,
  findSelectOptionIndex,
  formatDateValue,
  getSemanticOptionTone,
  getTypeIcon,
  getTypeIconTone,
  prettyValue,
  prettifyColumnKey,
  resolveMetaForValues,
} from "@/utils/table-utils";

type EditingCell = {
  id: string;
  columnId: string;
} | null;

type EditableTableContentProps<
  T extends { id: string; customValues?: Record<string, any> },
> = {
  table: TanstackTable<T>;
  onColumnAdd?: (column: Omit<VirtualColumn, "id">) => void;

  isColPopoverOpen: boolean;
  setIsColPopoverOpen: (open: boolean) => void;
  editingColumnId: string | null;
  colFormSeed: number;
  colFormError: string | null;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  newColLabel: MutableRefObject<string>;
  newColOptions: MutableRefObject<string>;
  newColType: VirtualColumn["type"];
  setNewColType: Dispatch<SetStateAction<VirtualColumn["type"]>>;
  setColFormError: Dispatch<SetStateAction<string | null>>;
  bumpColFormSeed: () => void;
  filteredTypeChoices: ColumnFieldChoice[];
  resetColumnForm: () => void;
  handleSaveColumn: () => void;

  editingCell: EditingCell;
  setEditingCell: Dispatch<SetStateAction<EditingCell>>;
  editValue: any;
  setEditValue: Dispatch<SetStateAction<any>>;
  handleSave: (
    id: string,
    columnId: string,
    value: any,
    isVirtual: boolean,
    virtualKey?: string,
  ) => void;
  onNavigate: (direction: "next" | "prev") => void;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  rowHeights: Record<string, number>;
  registerRowRef: (rowId: string, el: HTMLTableRowElement | null) => void;
  onRowResizeMouseDown: (
    event: ReactMouseEvent<HTMLTableRowElement>,
    rowId: string,
  ) => void;

  dependentColumnsBySource: Record<string, string[]>;
  isAdding: boolean;
  setIsAdding: Dispatch<SetStateAction<boolean>>;
  newRowData: Record<string, any>;
  setNewRowData: Dispatch<SetStateAction<Record<string, any>>>;
  handleAddCommit: () => void | Promise<void>;
  onRequestDeleteRow: (row: T) => void;
};

export function EditableTableContent<
  T extends { id: string; customValues?: Record<string, any> },
>({
  table,
  onColumnAdd,
  isColPopoverOpen,
  setIsColPopoverOpen,
  editingColumnId,
  colFormSeed,
  colFormError,
  typeFilter,
  setTypeFilter,
  newColLabel,
  newColOptions,
  newColType,
  setNewColType,
  setColFormError,
  bumpColFormSeed,
  filteredTypeChoices,
  resetColumnForm,
  handleSaveColumn,
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
  handleSave,
  onNavigate,
  inputRef,
  rowHeights,
  registerRowRef,
  onRowResizeMouseDown,
  dependentColumnsBySource,
  isAdding,
  setIsAdding,
  newRowData,
  setNewRowData,
  handleAddCommit,
  onRequestDeleteRow,
}: EditableTableContentProps<T>) {
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
    const widthPx = Math.min(maxWidth, Math.max(minWidth, longest * 9 + 56));
    autoWidthByColumnId.set(column.id, widthPx);
  });

  return (
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
                          nameDefault={newColLabel.current}
                          optionsDefault={newColOptions.current}
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
                              bumpColFormSeed();
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
                    onRowResizeMouseDown(event, row.original.id)
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
                    const emailColumn = isEmailColumn(dataFieldKey, meta?.type);
                    const phoneColumn = isPhoneColumn(dataFieldKey, meta?.type);
                    const isEmailOrPhone =
                      dataFieldKey.toLowerCase().includes("name") ||
                      emailColumn ||
                      phoneColumn;
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
                      if (isEditing) {
                        return (
                          <SmartEditor
                            inputRef={inputRef}
                            meta={meta}
                            fieldKey={dataFieldKey}
                            value={editValue}
                            onChange={setEditValue}
                            onNavigate={onNavigate}
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
                      }
                      if (meta?.type === "select" || meta?.type === "status") {
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
                      }
                      if (meta?.type === "boolean") {
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
                      }
                      if (meta?.type === "date" || meta?.type === "datetime") {
                        return (
                          <span className="inline-flex whitespace-nowrap">
                            {formatDateValue(val, meta.type === "datetime")}
                          </span>
                        );
                      }
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
                                  const widthPx = Math.min(
                                    maxWidth,
                                    Math.max(
                                      minWidth,
                                      editText.length * 9 + 56,
                                    ),
                                  );
                                  return { minWidth: `${widthPx}px` };
                                }
                                if (baseAutoWidth) {
                                  return { minWidth: `${baseAutoWidth}px` };
                                }
                                return undefined;
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
                        onRequestDeleteRow(row.original);
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
                              if (isVirtual) {
                                return {
                                  ...next,
                                  customValues: {
                                    ...(prev.customValues || {}),
                                    [String(virtualKey ?? columnId)]: nextValue,
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
  );
}
