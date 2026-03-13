import { useState, useCallback, useRef, useEffect } from "react";
import type { Table, Column } from "@tanstack/react-table";

export type EditingCell = {
  id: string; // row ID
  columnId: string; // column ID
};

export interface UseCellEditingOptions<T> {
  /**
   * Map of row IDs to row data
   */
  rowsById: Map<string, T>;

  /**
   * Map of column IDs to TanStack Table column objects
   */
  leafColumnsById: Map<string, Column<T, any>>;

  /**
   * Callback when a cell value is saved
   */
  onUpdate?: (rowId: string, data: Partial<T>) => void | Promise<void>;

  /**
   * TanStack Table instance for navigation
   */
  table?: Table<T>;
}

/**
 * Manages cell editing state and operations
 *
 * Handles:
 * - Active cell tracking
 * - Edit value state
 * - Save logic (virtual vs standard columns)
 * - Keyboard navigation (Tab/Shift+Tab)
 * - Auto-focus on edit
 */
export function useCellEditing<
  T extends { id: string; customValues?: Record<string, unknown> },
>(options: UseCellEditingOptions<T>) {
  const { rowsById, leafColumnsById, onUpdate, table } = options;

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<any>("");

  // Ref for auto-focusing the input when editing starts
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  /**
   * Auto-focus input when editing starts
   * Match legacy behavior: focus and move caret to end.
   */
  useEffect(() => {
    if (!editingCell || !inputRef.current) return;
    const el = inputRef.current;
    el.focus();
    const len = String(
      (el as HTMLInputElement | HTMLTextAreaElement).value ?? "",
    ).length;
    try {
      (el as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(
        len,
        len,
      );
    } catch {
      // Ignore selection errors
    }
  }, [editingCell]);

  /**
   * Starts editing a cell
   */
  const startEditing = useCallback(
    (rowId: string, columnId: string, initialValue: any) => {
      setEditingCell({ id: rowId, columnId });
      setEditValue(initialValue);
    },
    [],
  );

  /**
   * Cancels editing and discards changes
   */
  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  /**
   * Checks if a specific cell is being edited
   */
  const isCellEditing = useCallback(
    (rowId: string, columnId: string): boolean => {
      return editingCell?.id === rowId && editingCell?.columnId === columnId;
    },
    [editingCell],
  );

  /**
   * Saves the current cell value
   *
   * Handles both virtual columns (custom fields) and standard columns.
   * Virtual columns save to `customValues`, standard columns save directly.
   */
  const handleSave = useCallback(
    async (
      id: string,
      columnId: string,
      value: any,
      isVirtual: boolean,
      virtualKey?: string,
    ) => {
      if (!onUpdate) return;

      const row = rowsById.get(id);
      if (!row) return;

      const savingCell = { id, columnId };

      try {
        let payload: Partial<T>;

        if (isVirtual) {
          const resolvedKey =
            virtualKey ??
            leafColumnsById.get(columnId)?.columnDef.meta?.virtualKey ??
            columnId;
          payload = {
            customValues: {
              ...(row.customValues || {}),
              [resolvedKey]: value,
            },
          } as Partial<T>;
        } else {
          // Standard column: use columnId to match legacy payload shape
          payload = { [columnId]: value } as Partial<T>;
        }

        // Execute update (may be async)
        const maybePromise = onUpdate(id, payload);
        if (
          maybePromise &&
          typeof (maybePromise as Promise<void>).then === "function"
        ) {
          await maybePromise;
        }

        // Clear editing state after save
        setEditingCell((current) =>
          current &&
          current.id === savingCell.id &&
          current.columnId === savingCell.columnId
            ? null
            : current,
        );
      } catch (error) {
        // Errors are handled by caller (toast notifications)
        console.error("Cell save error:", error);
      }
    },
    [onUpdate, rowsById, leafColumnsById],
  );

  /**
   * Moves focus to next/previous editable cell
   *
   * Saves current cell before moving.
   * Supports Tab (next) and Shift+Tab (prev) navigation.
   */
  const moveToNeighborCell = useCallback(
    (direction: "next" | "prev") => {
      if (!editingCell || !table) return;

      const rows = table.getRowModel().rows;
      const editableColumns = table
        .getVisibleFlatColumns()
        .filter((col) => col.columnDef.meta?.type !== "boolean");

      if (!rows.length || !editableColumns.length) {
        return setEditingCell(null);
      }

      const rowIndex = rows.findIndex(
        (row) => row.original.id === editingCell.id,
      );
      const colIndex = editableColumns.findIndex(
        (col) => col.id === editingCell.columnId,
      );

      if (rowIndex < 0 || colIndex < 0) {
        return setEditingCell(null);
      }

      // Save current cell before moving
      const currentCol = leafColumnsById.get(editingCell.columnId);
      handleSave(
        editingCell.id,
        editingCell.columnId,
        editValue,
        !!currentCol?.columnDef.meta?.isVirtual,
        currentCol?.columnDef.meta?.virtualKey,
      );

      // Calculate next cell position
      let nextRowIndex = rowIndex;
      let nextColIndex = colIndex + (direction === "next" ? 1 : -1);

      // Wrap to next/prev row if needed
      if (nextColIndex >= editableColumns.length) {
        nextColIndex = 0;
        nextRowIndex += 1;
      } else if (nextColIndex < 0) {
        nextColIndex = editableColumns.length - 1;
        nextRowIndex -= 1;
      }

      // Stop if out of bounds
      if (nextRowIndex < 0 || nextRowIndex >= rows.length) {
        return setEditingCell(null);
      }

      // Move to next cell
      const nextRow = rows[nextRowIndex];
      const nextCol = editableColumns[nextColIndex];
      const nextCell = nextRow
        .getVisibleCells()
        .find((cell) => cell.column.id === nextCol.id);

      setEditingCell({ id: nextRow.original.id, columnId: nextCol.id });
      setEditValue(nextCell?.getValue());
    },
    [editingCell, editValue, handleSave, leafColumnsById, table],
  );

  /**
   * Saves and closes editing on blur (click outside)
   *
   * Used with document mousedown listener.
   */
  const handleBlurSave = useCallback(() => {
    if (!editingCell) return;

    const col = leafColumnsById.get(editingCell.columnId);
    handleSave(
      editingCell.id,
      editingCell.columnId,
      editValue,
      !!col?.columnDef.meta?.isVirtual,
      col?.columnDef.meta?.virtualKey,
    );
  }, [editingCell, editValue, handleSave, leafColumnsById]);

  return {
    // State
    editingCell,
    editValue,
    inputRef,

    // Setters
    setEditingCell,
    setEditValue,

    // Operations
    startEditing,
    cancelEditing,
    handleSave,
    moveToNeighborCell,
    handleBlurSave,

    // Helpers
    isCellEditing,
  };
}
