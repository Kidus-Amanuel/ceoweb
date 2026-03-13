import { useState, useCallback, useRef, useEffect } from "react";
import type { Table } from "@tanstack/react-table";
import {
  resolveMetaForValues,
  defaultCurrencyOptions,
} from "@/utils/table-utils";

export interface UseRowOperationsOptions<T> {
  /**
   * TanStack Table instance
   */
  table?: Table<T>;

  /**
   * Callback when adding a new row
   */
  onAdd?: (data: Partial<T>) => void | Promise<void>;

  /**
   * Callback when deleting a row
   */
  onDelete?: (rowId: string) => void;
}

/**
 * Manages row addition and deletion operations
 *
 * Handles:
 * - "Add row" state and form
 * - New row data initialization
 * - Default values for select/currency fields
 * - Auto-focus on first cell
 * - Row deletion confirmation
 */
export function useRowOperations<
  T extends { id: string; customValues?: Record<string, unknown> },
>(options: UseRowOperationsOptions<T>) {
  const { table, onAdd, onDelete } = options;

  // Add row state
  const [isAdding, setIsAdding] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});

  // Refs
  const addRowRef = useRef<HTMLTableRowElement | null>(null);
  const addRowFirstInputRef = useRef<
    HTMLInputElement | HTMLTextAreaElement | null
  >(null);

  /**
   * Auto-focus first cell when adding row
   */
  useEffect(() => {
    if (!isAdding) return;

    const focusFirstCell = () => {
      // Scroll to row
      addRowRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

      // Focus and select first input
      const node = addRowFirstInputRef.current;
      if (node) {
        node.focus();
        try {
          const len = (node.value ?? "").length;
          node.setSelectionRange(len, len);
        } catch {
          // Ignore selection errors
        }
      }
    };

    const raf = requestAnimationFrame(focusFirstCell);
    return () => cancelAnimationFrame(raf);
  }, [isAdding]);

  /**
   * Starts adding a new row
   *
   * Initializes new row data with default values:
   * - Select/status fields: first option
   * - Currency fields: { amount: 0, currency: first option }
   * - Other fields: undefined
   */
  const handleStartAdd = useCallback(() => {
    if (!table) return;

    setIsAdding(true);
    setNewRowData(() => {
      const next: Record<string, unknown> = {};

      table.getVisibleFlatColumns().forEach((column) => {
        const isVirtual = !!column.columnDef.meta?.isVirtual;
        const virtualKey = String(
          column.columnDef.meta?.virtualKey ?? column.id,
        );
        const meta = resolveMetaForValues(column.columnDef.meta, {});

        // Default value for select/status fields
        if (meta?.type === "select" || meta?.type === "status") {
          const firstOption = meta.options?.[0];
          if (!firstOption) return;

          const defaultValue = String(firstOption.value);

          if (isVirtual) {
            const existingCustomValues = (next.customValues ?? {}) as Record<
              string,
              unknown
            >;
            next.customValues = {
              ...existingCustomValues,
              [virtualKey]: defaultValue,
            };
            return;
          }

          next[column.id] = defaultValue;
        }

        // Default value for currency fields
        if (meta?.type === "currency") {
          const currencyOpts = meta.options ?? defaultCurrencyOptions;
          const firstCurrency = currencyOpts[0];
          if (!firstCurrency) return;

          const defaultValue = {
            amount: 0,
            currency: String(firstCurrency.value),
          };

          if (isVirtual) {
            const existingCustomValues = (next.customValues ?? {}) as Record<
              string,
              unknown
            >;
            next.customValues = {
              ...existingCustomValues,
              [virtualKey]: defaultValue,
            };
            return;
          }

          next[column.id] = defaultValue;
        }
      });

      return next;
    });
  }, [table]);

  /**
   * Commits new row and saves it
   */
  const handleAddCommit = useCallback(async () => {
    if (!onAdd) return;

    try {
      const maybePromise = onAdd(newRowData as Partial<T>);
      if (
        maybePromise &&
        typeof (maybePromise as Promise<void>).then === "function"
      ) {
        await maybePromise;
      }

      // Reset state
      setIsAdding(false);
      setNewRowData({});
    } catch (error) {
      // Errors are handled by caller (toast notifications)
      console.error("Row add error:", error);
    }
  }, [onAdd, newRowData]);

  /**
   * Cancels adding a new row
   */
  const handleAddCancel = useCallback(() => {
    setIsAdding(false);
    setNewRowData({});
  }, []);

  /**
   * Deletes a row
   */
  const handleDeleteRow = useCallback(
    (rowId: string) => {
      onDelete?.(rowId);
    },
    [onDelete],
  );

  return {
    // State
    isAdding,
    newRowData,

    // Refs
    addRowRef,
    addRowFirstInputRef,

    // Setters
    setIsAdding,
    setNewRowData,

    // Operations
    handleStartAdd,
    handleAddCommit,
    handleAddCancel,
    handleDeleteRow,
  };
}
