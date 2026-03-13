import { memo, type RefObject } from "react";
import type { Row } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/ui/button/Button";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import { TableCell } from "@/components/shared/ui/table";
import { CellRenderer } from "./CellRenderer";
import { resolveMetaForValues } from "@/utils/table-utils";
import type { DeleteTarget } from "./DeleteConfirmationDialog";
import type { EditingCell } from "@/hooks/use-cell-editing";

interface TableRowProps<T extends { id: string }> {
  row: Row<T>;
  columnsSignature: string;
  isSelected: boolean;
  editingCell: EditingCell | null;
  editValue: any;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  rowHeight?: number;
  autoWidthByColumnId: Map<string, number>;

  // Callbacks
  onEditValueChange: (value: any) => void;
  onStartEdit: (rowId: string, columnId: string, value: any) => void;
  onNavigate: (direction: "next" | "prev") => void;
  onCancelEdit: () => void;
  onSave: (
    rowId: string,
    columnId: string,
    value: any,
    isVirtual: boolean,
    virtualKey?: string,
  ) => void;
  onDeleteClick: (target: DeleteTarget) => void;
  onRowResizeMouseDown?: (
    event: React.MouseEvent<HTMLTableRowElement>,
    rowId: string,
  ) => void;
  onRegisterRef?: (rowId: string, element: HTMLTableRowElement | null) => void;

  // Utility functions
  getColumnSizeClasses: (
    columnId: string,
    isVirtual: boolean,
    type: unknown,
  ) => string;
  isEmailColumn: (columnId: string, type: unknown) => boolean;
  isPhoneColumn: (columnId: string, type: unknown) => boolean;
}

/**
 * Renders a single table row with all cells
 *
 * Memoized for performance - only re-renders when:
 * - Row data changes
 * - Edit state changes
 * - Selection state changes
 */
function TableRowComponent<
  T extends { id: string; customValues?: Record<string, unknown> },
>({
  row,
  columnsSignature,
  isSelected,
  editingCell,
  editValue,
  inputRef,
  rowHeight,
  autoWidthByColumnId,
  onEditValueChange,
  onStartEdit,
  onNavigate,
  onCancelEdit,
  onSave,
  onDeleteClick,
  onRowResizeMouseDown,
  onRegisterRef,
  getColumnSizeClasses,
  isEmailColumn,
  isPhoneColumn,
}: TableRowProps<T>) {
  return (
    <motion.tr
      layout
      key={row.id}
      ref={(el) => onRegisterRef?.(row.original.id, el)}
      style={rowHeight ? { height: rowHeight } : undefined}
      onMouseDown={(event) => onRowResizeMouseDown?.(event, row.original.id)}
      className={cn(
        "group transition-all duration-150 relative",
        isSelected
          ? "bg-amber-100/50 hover:bg-amber-100/60"
          : "hover:bg-slate-50/50",
      )}
    >
      {/* Selection checkbox column */}
      <TableCell className="w-10 min-w-10 px-2 py-1.5 border-b border-r border-slate-200 align-middle relative">
        {isSelected && (
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-500" />
        )}
        <div className="flex items-center justify-start">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(value) => row.toggleSelected(value === true)}
            onClick={(event) => event.stopPropagation()}
            className="cursor-pointer size-4"
          />
        </div>
      </TableCell>

      {/* Data cells */}
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
        const baseAutoWidth = autoWidthByColumnId.get(cell.column.id);
        const isLongText =
          typeof val === "string" &&
          val.length > 80 &&
          (meta?.type === undefined ||
            meta?.type === "text" ||
            meta?.type === "json");

        return (
          <TableCell
            key={cell.id}
            className={cn(
              "border-b border-r border-slate-200 align-middle cursor-text transition-all duration-150",
              isEditing ? "px-2 py-1 max-w-none bg-white" : "py-1.5",
              isEditing
                ? meta?.type === "currency"
                  ? "min-w-[320px]"
                  : meta?.type === "datetime"
                    ? "min-w-[300px]"
                    : isEmailOrPhone
                      ? "min-w-[350px]"
                      : "min-w-[240px]"
                : sizeClasses,
              isEditing ? "" : "px-2",
              isEditing && "ring-2 ring-amber-400 ring-inset shadow-sm ",
              !isEditing && "group-hover:bg-white/50",
            )}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              letterSpacing: "-0.01em",
              ...(isEmailOrPhone
                ? (() => {
                    if (isEditing) {
                      const editText = String(editValue ?? val ?? "");
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
                : {}),
            }}
            onClick={() => {
              if (meta?.type !== "boolean" && !isEditing) {
                onStartEdit(row.original.id, cell.column.id, cell.getValue());
              }
            }}
          >
            <div
              className={cn(
                "flex h-full w-full items-center font-medium text-slate-700 [overflow-wrap:anywhere] whitespace-normal",
                isLongText
                  ? "justify-start text-left"
                  : "justify-start text-left",
              )}
            >
              <CellRenderer
                cell={cell}
                isEditing={isEditing}
                editValue={editValue}
                meta={meta}
                isVirtual={isVirtual}
                virtualKey={virtualKey}
                inputRef={inputRef}
                dataFieldKey={dataFieldKey}
                onEditValueChange={onEditValueChange}
                onNavigate={onNavigate}
                onCommit={(v) =>
                  onSave(
                    row.original.id,
                    cell.column.id,
                    v ?? editValue,
                    isVirtual,
                    virtualKey,
                  )
                }
                onCancel={onCancelEdit}
                onSave={onSave}
              />
            </div>
          </TableCell>
        );
      })}

      {/* Spacer cell */}
      <TableCell className="px-1 py-1.5 border-b border-slate-200" />

      {/* Delete button cell */}
      <TableCell className="px-3 py-1.5 border-b border-slate-200">
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Delete row ${row.index + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteClick({
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
          className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-300 transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-3 h-3" strokeWidth={2} />
        </Button>
      </TableCell>
    </motion.tr>
  );
}

/**
 * Memoized TableRow - only re-renders when necessary
 */
export const EditableTableRow = memo(TableRowComponent, (prev, next) => {
  // Re-render if row ID changed
  if (prev.row.id !== next.row.id) return false;

  // Re-render if visible columns changed
  if (prev.columnsSignature !== next.columnsSignature) return false;

  // Re-render if selection state changed
  if (prev.isSelected !== next.isSelected) return false;

  // Re-render if editing this row
  const isEditingPrev = prev.editingCell?.id === prev.row.original.id;
  const isEditingNext = next.editingCell?.id === next.row.original.id;
  if (isEditingPrev || isEditingNext) return false;

  // Re-render if row data changed (deep equality check on id as proxy)
  const prevData = prev.row.original;
  const nextData = next.row.original;
  if (JSON.stringify(prevData) !== JSON.stringify(nextData)) return false;

  // Otherwise, skip re-render
  return true;
}) as typeof TableRowComponent;
