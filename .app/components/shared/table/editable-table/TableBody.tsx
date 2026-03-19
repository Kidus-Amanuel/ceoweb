import type { Table, Row } from "@tanstack/react-table";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/ui/button/Button";
import {
  TableBody as UITableBody,
  TableCell,
} from "@/components/shared/ui/table";
import { SmartEditor } from "@/components/shared/table/SmartEditor";
import { EditableTableRow } from "./TableRow";
import {
  resolveMetaForValues,
  prettifyColumnKey,
  calculateDays,
} from "@/utils/table-utils";
import type { EditingCell } from "@/hooks/use-cell-editing";
import type { DeleteTarget } from "./DeleteConfirmationDialog";

type DeleteRowTarget = Exclude<DeleteTarget, null>;

interface EditableTableBodyProps<T extends { id: string }> {
  table: Table<T>;
  rows: Row<T>[];
  columnsSignature: string;
  editingCell: EditingCell | null;
  editValue: any;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  autoWidthByColumnId: Map<string, number>;
  rowHeights: Record<string, number>;

  // Add row state
  isAdding: boolean;
  newRowData: Record<string, any>;
  addRowRef: RefObject<HTMLTableRowElement | null>;
  addRowFirstInputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;

  // Dependencies map for dependent columns
  dependentColumnsBySource: Record<string, string[]>;

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
  onDeleteClick: (target: DeleteRowTarget) => void;
  onRowResizeMouseDown?: (
    event: React.MouseEvent<HTMLTableRowElement>,
    rowId: string,
  ) => void;
  onRegisterRef?: (rowId: string, element: HTMLTableRowElement | null) => void;
  onNewRowDataChange: (data: Record<string, any>) => void;
  onAddCommit: () => void;
  onAddCancel: () => void;
  onStartEditNewRow: (columnId: string) => void;
  onOpenFilesEditor: (payload: {
    id: string;
    columnId: string;
    isVirtual: boolean;
    virtualKey?: string;
    value: any;
  }) => void;

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
 * Renders table body with existing rows and add row form
 *
 * Features:
 * - Animated row additions/removals with Framer Motion
 * - Existing rows rendered with EditableTableRow component
 * - Add row form with SmartEditor inputs
 * - Commit and cancel buttons for new rows
 */
export function EditableTableBody<
  T extends { id: string; customValues?: Record<string, unknown> },
>({
  table,
  rows,
  columnsSignature,
  editingCell,
  editValue,
  inputRef,
  autoWidthByColumnId,
  rowHeights,
  isAdding,
  newRowData,
  addRowRef,
  addRowFirstInputRef,
  dependentColumnsBySource,
  onEditValueChange,
  onStartEdit,
  onNavigate,
  onCancelEdit,
  onSave,
  onDeleteClick,
  onRowResizeMouseDown,
  onRegisterRef,
  onNewRowDataChange,
  onAddCommit,
  onAddCancel,
  onStartEditNewRow,
  onOpenFilesEditor,
  getColumnSizeClasses,
  isEmailColumn,
  isPhoneColumn,
}: EditableTableBodyProps<T>) {
  return (
    <UITableBody>
      {/* Existing rows */}
      <AnimatePresence initial={false}>
        {rows.map((row) => (
          <EditableTableRow
            key={row.id}
            row={row}
            columnsSignature={columnsSignature}
            isSelected={row.getIsSelected()}
            editingCell={editingCell}
            editValue={editValue}
            inputRef={inputRef}
            rowHeight={rowHeights[row.original.id]}
            autoWidthByColumnId={autoWidthByColumnId}
            onEditValueChange={onEditValueChange}
            onStartEdit={onStartEdit}
            onNavigate={onNavigate}
            onCancelEdit={onCancelEdit}
            onSave={onSave}
            onDeleteClick={onDeleteClick}
            onRowResizeMouseDown={onRowResizeMouseDown}
            onRegisterRef={onRegisterRef}
            onOpenFilesEditor={onOpenFilesEditor}
            getColumnSizeClasses={getColumnSizeClasses}
            isEmailColumn={isEmailColumn}
            isPhoneColumn={isPhoneColumn}
          />
        ))}
      </AnimatePresence>

      {/* Add row form */}
      <AnimatePresence mode="wait">
        {isAdding && (
          <motion.tr
            ref={addRowRef}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-amber-50/20"
          >
            {/* Empty checkbox cell */}
            <TableCell className="w-10 min-w-10 px-2 py-1.5 border-b border-r border-slate-200 align-middle" />

            {/* Input cells for each column */}
            {table.getVisibleFlatColumns().map((column, i) => {
              const isVirtual = !!column.columnDef.meta?.isVirtual;
              const virtualKey = column.columnDef.meta?.virtualKey;
              const columnId = column.id;
              const meta = resolveMetaForValues(
                column.columnDef.meta,
                newRowData,
              );
              const isActiveNewCell = !!(
                isAdding &&
                editingCell?.id === "new" &&
                editingCell?.columnId === columnId
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
                    "py-1.5 border-b border-r border-slate-200 align-middle",
                    sizeClasses,
                    "px-2",
                    isActiveNewCell &&
                      "ring-2 ring-amber-300 ring-inset shadow-sm",
                  )}
                  onClick={() =>
                    !meta?.excludeFromForm && onStartEditNewRow(columnId)
                  }
                  onFocusCapture={() =>
                    !meta?.excludeFromForm && onStartEditNewRow(columnId)
                  }
                >
                  {meta?.excludeFromForm ? (
                    <div className="h-full w-full bg-slate-50/10" />
                  ) : (
                    <SmartEditor
                      isAddMode
                      inputRef={i === 0 ? addRowFirstInputRef : undefined}
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
                      onClick={() => {
                        if (meta?.type !== "files") return;
                        onOpenFilesEditor({
                          id: "new-row",
                          columnId,
                          isVirtual,
                          virtualKey,
                          value: isVirtual
                            ? newRowData.customValues?.[
                                String(virtualKey ?? columnId)
                              ]
                            : newRowData[columnId],
                        });
                      }}
                      onChange={(nextValue) => {
                        const next = { ...newRowData };
                        if (isVirtual) {
                          onNewRowDataChange({
                            ...next,
                            customValues: {
                              ...(newRowData.customValues || {}),
                              [String(virtualKey ?? columnId)]: nextValue,
                            },
                          });
                        } else {
                          next[columnId] = nextValue;
                          // Clear dependent columns when source changes
                          (dependentColumnsBySource[columnId] || []).forEach(
                            (dep) => {
                              if (dep !== columnId) next[dep] = undefined;
                            },
                          );

                          // Auto-calculate days for leave ranges
                          if (
                            columnId === "start_date" ||
                            columnId === "end_date"
                          ) {
                            const s =
                              columnId === "start_date"
                                ? nextValue
                                : next.start_date;
                            const e =
                              columnId === "end_date"
                                ? nextValue
                                : next.end_date;
                            if (s && e) {
                              next.days = calculateDays(s, e);
                            }
                          }

                          onNewRowDataChange(next);
                        }
                      }}
                    />
                  )}
                </TableCell>
              );
            })}

            {/* Spacer cell */}
            <TableCell className="px-1 py-1.5 border-b border-slate-200" />

            {/* Commit and cancel buttons */}
            <TableCell className="px-3 py-1.5 border-b border-slate-200">
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  size="icon"
                  onClick={onAddCommit}
                  aria-label="Commit new row"
                  className="h-6 w-6 rounded-sm bg-green-600 text-white border border-green-700 hover:bg-green-700 shadow-sm transition-all duration-200"
                >
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onAddCancel}
                  aria-label="Cancel adding row"
                  className="h-6 w-6 rounded-sm text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-300 hover:border-red-400 transition-all duration-200"
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </Button>
              </div>
            </TableCell>
          </motion.tr>
        )}
      </AnimatePresence>
    </UITableBody>
  );
}
