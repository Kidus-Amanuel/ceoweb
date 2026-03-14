import { useState, useCallback, useMemo, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { VirtualColumn } from "@/utils/table-utils";
import {
  asColumnType,
  hasMeaningfulCustomValue,
  norm,
  parseOptionTokens,
  toColumnKey,
  fieldTypeChoices,
} from "@/utils/table-utils";

export interface UseColumnManagementOptions<T> {
  /**
   * Base columns from table props
   */
  baseColumns: ColumnDef<T, any>[];

  /**
   * Virtual columns (custom fields)
   */
  virtualColumns: VirtualColumn[];

  /**
   * Table data (for checking if column has values)
   */
  data: T[];

  /**
   * Callback when adding a new column
   */
  onColumnAdd?: (column: Omit<VirtualColumn, "id">) => void;

  /**
   * Callback when updating a column
   */
  onColumnUpdate?: (
    columnId: string,
    column: Omit<VirtualColumn, "id">,
  ) => void;

  /**
   * Callback when deleting a column
   */
  onColumnDelete?: (columnId: string) => void;
}

/**
 * Manages custom column creation, editing, and deletion
 *
 * Handles:
 * - Column form state (label, type, options)
 * - Validation (uniqueness, type locking, required options)
 * - Type filtering
 * - Column editor popover state
 */
export function useColumnManagement<
  T extends { id: string; customValues?: Record<string, unknown> },
>(options: UseColumnManagementOptions<T>) {
  const {
    baseColumns,
    virtualColumns,
    data,
    onColumnAdd,
    onColumnUpdate,
    onColumnDelete,
  } = options;

  // UI State
  const [isColPopoverOpen, setIsColPopoverOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [colFormSeed, setColFormSeed] = useState(0); // Force form reset
  const [colFormError, setColFormError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");

  // Form State
  const [newColType, setNewColType] = useState<VirtualColumn["type"]>("text");
  const [newColLabelValue, setNewColLabelValue] = useState("");
  const [newColOptionsValue, setNewColOptionsValue] = useState("");

  // Refs for form values (prevents unnecessary re-renders)
  const newColLabel = useRef("");
  const newColOptions = useRef("");

  /**
   * Gets the column currently being edited
   */
  const editingColumn = useMemo(
    () =>
      virtualColumns.find((column) => column.id === editingColumnId) ?? null,
    [editingColumnId, virtualColumns],
  );

  /**
   * Checks if editing column has data in any rows
   *
   * Used to prevent type changes on columns with existing data.
   */
  const editingColumnHasValues = useMemo(
    () =>
      !!editingColumn &&
      data.some((row) =>
        hasMeaningfulCustomValue(row.customValues?.[editingColumn.key]),
      ),
    [data, editingColumn],
  );

  /**
   * Filters field type choices based on search query
   */
  const filteredTypeChoices = useMemo(() => {
    const q = norm(typeFilter);
    if (!q) return fieldTypeChoices;
    return fieldTypeChoices.filter(
      (choice) =>
        norm(choice.label).includes(q) || norm(choice.key).includes(q),
    );
  }, [typeFilter]);

  /**
   * Resets column form to initial state
   */
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

  /**
   * Update label/options refs + state together (to satisfy immutability linting)
   */
  const setNewColLabel = useCallback((value: string) => {
    newColLabel.current = value;
    setNewColLabelValue(value);
  }, []);

  const setNewColOptions = useCallback((value: string) => {
    newColOptions.current = value;
    setNewColOptionsValue(value);
  }, []);

  /**
   * Opens column editor for existing column
   */
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

  /**
   * Opens column editor for creating new column
   */
  const openColumnForCreate = useCallback(() => {
    resetColumnForm();
    setIsColPopoverOpen(true);
  }, [resetColumnForm]);

  /**
   * Saves column (create or update)
   *
   * Validates:
   * - Label is not empty
   * - Type hasn't changed if column has data
   * - Key contains letters/numbers
   * - Key is unique
   * - Options exist for select/currency/status types
   */
  const handleSaveColumn = useCallback(() => {
    const label = newColLabel.current.trim();

    // Validation: Empty label
    if (!label) {
      setColFormError("Property name is required.");
      return;
    }

    // Validation: Type locking
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

    // Generate key from label
    const key = toColumnKey(label).trim();
    if (!key) {
      setColFormError("Property name must contain letters or numbers.");
      return;
    }

    // Validation: Uniqueness
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

    // Parse options for select/currency/status types
    const parsedOptions = parseOptionTokens(
      newColOptions.current,
      newColType === "currency",
    ).map((value) => ({ label: value, value }));

    const isOptionFieldType =
      newColType === "select" ||
      newColType === "currency" ||
      newColType === "status";

    // Validation: Options required for select types
    if (isOptionFieldType && parsedOptions.length === 0) {
      setColFormError("At least one option is required for select fields.");
      return;
    }

    // Prepare column data
    const options = isOptionFieldType ? parsedOptions : undefined;
    const columnData = { label, key, type: newColType, options };

    // Save (create or update)
    if (editingColumnId && onColumnUpdate) {
      onColumnUpdate(editingColumnId, columnData);
    } else {
      onColumnAdd?.(columnData);
    }

    // Reset form and close
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

  /**
   * Deletes a column
   */
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      onColumnDelete?.(columnId);
      setIsColPopoverOpen(false);
    },
    [onColumnDelete],
  );

  /**
   * Closes column editor
   */
  const closeColumnEditor = useCallback(() => {
    setIsColPopoverOpen(false);
    resetColumnForm();
  }, [resetColumnForm]);

  return {
    // State
    isColPopoverOpen,
    editingColumnId,
    editingColumn,
    editingColumnHasValues,
    colFormSeed,
    colFormError,
    newColType,
    newColLabelValue,
    newColOptionsValue,
    typeFilter,
    filteredTypeChoices,

    // Refs
    newColLabel,
    newColOptions,

    // Setters
    setIsColPopoverOpen,
    setNewColType,
    setNewColLabelValue,
    setNewColOptionsValue,
    setTypeFilter,
    setColFormError,
    setNewColLabel,
    setNewColOptions,

    // Operations
    openColumnForEdit,
    openColumnForCreate,
    handleSaveColumn,
    handleDeleteColumn,
    closeColumnEditor,
    resetColumnForm,
  };
}
