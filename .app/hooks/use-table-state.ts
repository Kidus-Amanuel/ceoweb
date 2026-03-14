import { useState, useCallback } from "react";
import type { SortingState } from "@tanstack/react-table";

/**
 * Manages core table state: sorting, selection, and filtering
 *
 * @param options - Configuration options
 * @returns Table state and setters
 */
export function useTableState(options?: {
  initialSearch?: string;
  onSearchChange?: (value: string) => void;
}) {
  // Sorting state for TanStack Table
  const [sorting, setSorting] = useState<SortingState>([]);

  // Row selection state (Record<rowId, boolean>)
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // Global filter for search across all columns
  const [globalFilter, setGlobalFilter] = useState(
    options?.initialSearch ?? "",
  );

  /**
   * Sets search value and triggers external callback if provided
   */
  const setSearchValue = useCallback(
    (value: string) => {
      setGlobalFilter(value);
      options?.onSearchChange?.(value);
    },
    [options],
  );

  /**
   * Clears all selections
   */
  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  /**
   * Gets array of selected row IDs
   */
  const getSelectedRowIds = useCallback((): string[] => {
    return Object.entries(rowSelection)
      .filter(([, selected]) => selected)
      .map(([id]) => id);
  }, [rowSelection]);

  /**
   * Checks if a specific row is selected
   */
  const isRowSelected = useCallback(
    (rowId: string): boolean => {
      return rowSelection[rowId] ?? false;
    },
    [rowSelection],
  );

  /**
   * Toggles selection for a specific row
   */
  const toggleRowSelection = useCallback((rowId: string) => {
    setRowSelection((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  return {
    // State
    sorting,
    rowSelection,
    globalFilter,

    // Setters
    setSorting,
    setRowSelection,
    setGlobalFilter,
    setSearchValue,

    // Helpers
    clearSelection,
    getSelectedRowIds,
    isRowSelected,
    toggleRowSelection,
  };
}
