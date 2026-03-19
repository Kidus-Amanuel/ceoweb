"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hasRowChanges, type TableFieldType } from "@/utils/table-helpers";
import {
  showWorkspaceToast,
  type WorkspaceToastOp,
} from "@/components/shared/workspace/workspace-toast";

type MutationResponse<T> = {
  success: boolean;
  error?: string;
  data?: T;
};

type CreateAction = (
  payload: Record<string, unknown>,
) => Promise<MutationResponse<Record<string, unknown>>>;

type UpdateAction = (input: {
  rowId: string;
  payload: Record<string, unknown>;
}) => Promise<MutationResponse<Record<string, unknown>>>;

type DeleteAction = (rowId: string) => Promise<MutationResponse<unknown>>;

type ColumnAction = (
  payload: Record<string, unknown>,
) => Promise<MutationResponse<Record<string, unknown>>>;

type ColumnUpdateAction = (input: {
  columnId: string;
  payload: Record<string, unknown>;
}) => Promise<MutationResponse<Record<string, unknown>>>;

type WorkspaceManagerConfig = {
  featureName: string;
  tableLabel: string;
  rowsRootKey: readonly unknown[];
  extraInvalidateKeys?: readonly (readonly unknown[])[];
  rowsById: Map<string, Record<string, unknown>>;
  standardTypeByKey: Map<string, TableFieldType>;
  customTypeByKey: Map<string, TableFieldType>;
  onMutationStateChange?: (mutating: boolean) => void;
  normalizeError?: (message: string) => string;
  createRowAction: CreateAction;
  updateRowAction: UpdateAction;
  deleteRowAction: DeleteAction;
  createColumnAction?: ColumnAction;
  updateColumnAction?: ColumnUpdateAction;
  deleteColumnAction?: (columnId: string) => Promise<MutationResponse<unknown>>;
};

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const fireToast = (
  config: Pick<
    WorkspaceManagerConfig,
    "featureName" | "tableLabel" | "normalizeError"
  >,
  op: WorkspaceToastOp,
  mode: "success" | "error",
  message?: string,
) =>
  showWorkspaceToast({
    op,
    mode,
    message,
    featureName: config.featureName,
    tableLabel: config.tableLabel,
    normalizeError: config.normalizeError,
  });

export function useWorkspaceManager({
  featureName,
  tableLabel,
  rowsRootKey,
  extraInvalidateKeys = [],
  rowsById,
  standardTypeByKey,
  customTypeByKey,
  onMutationStateChange,
  normalizeError,
  createRowAction,
  updateRowAction,
  deleteRowAction,
  createColumnAction,
  updateColumnAction,
  deleteColumnAction,
}: WorkspaceManagerConfig) {
  const queryClient = useQueryClient();
  const rowUpdateQueueRef = useRef(new Map<string, Promise<void>>());

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: rowsRootKey });
    await Promise.all(
      extraInvalidateKeys.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  };

  const createRowMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await createRowAction(payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || `Failed to create ${tableLabel}.`);
      }
      return response.data;
    },
    onSuccess: () => {
      void invalidate();
      fireToast(
        { featureName, tableLabel, normalizeError },
        "rowCreate",
        "success",
        "Row created.",
      );
    },
    onError: (error) => {
      fireToast(
        { featureName, tableLabel, normalizeError },
        "rowCreate",
        "error",
        toErrorMessage(error, `Failed to create ${tableLabel}.`),
      );
    },
  });

  const updateRowMutation = useMutation({
    mutationFn: async ({
      rowId,
      payload,
    }: {
      rowId: string;
      payload: Record<string, unknown>;
    }) => {
      const response = await updateRowAction({ rowId, payload });
      if (!response.success || !response.data) {
        throw new Error(response.error || `Failed to update ${tableLabel}.`);
      }
      return response.data;
    },
    onSuccess: () => {
      void invalidate();
      fireToast(
        { featureName, tableLabel, normalizeError },
        "rowUpdate",
        "success",
        "Row updated.",
      );
    },
    onError: (error) => {
      fireToast(
        { featureName, tableLabel, normalizeError },
        "rowUpdate",
        "error",
        toErrorMessage(error, `Failed to update ${tableLabel}.`),
      );
    },
  });

  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const response = await deleteRowAction(rowId);
      if (!response.success) {
        throw new Error(response.error || `Failed to delete ${tableLabel}.`);
      }
      return rowId;
    },
    onSuccess: () => {
      void invalidate();
      fireToast(
        { featureName, tableLabel, normalizeError },
        "rowDelete",
        "success",
        "Row deleted.",
      );
    },
    onError: (error) => {
      fireToast(
        { featureName, tableLabel, normalizeError },
        "rowDelete",
        "error",
        toErrorMessage(error, `Failed to delete ${tableLabel}.`),
      );
    },
  });

  const createColumnMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!createColumnAction)
        throw new Error("Create column action is missing.");
      const response = await createColumnAction(payload);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create custom field.");
      }
      return response.data;
    },
    onSuccess: () => {
      void invalidate();
      fireToast(
        { featureName, tableLabel, normalizeError },
        "columnCreate",
        "success",
        "Field added.",
      );
    },
    onError: (error) => {
      fireToast(
        { featureName, tableLabel, normalizeError },
        "columnCreate",
        "error",
        toErrorMessage(error, "Failed to create custom field."),
      );
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: async ({
      columnId,
      payload,
    }: {
      columnId: string;
      payload: Record<string, unknown>;
    }) => {
      if (!updateColumnAction)
        throw new Error("Update column action is missing.");
      const response = await updateColumnAction({ columnId, payload });
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to update custom field.");
      }
      return response.data;
    },
    onSuccess: () => {
      void invalidate();
      fireToast(
        { featureName, tableLabel, normalizeError },
        "columnUpdate",
        "success",
        "Field updated.",
      );
    },
    onError: (error) => {
      fireToast(
        { featureName, tableLabel, normalizeError },
        "columnUpdate",
        "error",
        toErrorMessage(error, "Failed to update custom field."),
      );
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      if (!deleteColumnAction)
        throw new Error("Delete column action is missing.");
      const response = await deleteColumnAction(columnId);
      if (!response.success) {
        throw new Error(response.error || "Failed to delete custom field.");
      }
      return columnId;
    },
    onSuccess: () => {
      void invalidate();
      fireToast(
        { featureName, tableLabel, normalizeError },
        "columnDelete",
        "success",
        "Field deleted.",
      );
    },
    onError: (error) => {
      fireToast(
        { featureName, tableLabel, normalizeError },
        "columnDelete",
        "error",
        toErrorMessage(error, "Failed to delete custom field."),
      );
    },
  });

  const isMutating =
    createRowMutation.isPending ||
    updateRowMutation.isPending ||
    deleteRowMutation.isPending ||
    createColumnMutation.isPending ||
    updateColumnMutation.isPending ||
    deleteColumnMutation.isPending;

  useEffect(() => {
    onMutationStateChange?.(isMutating);
    return () => onMutationStateChange?.(false);
  }, [isMutating, onMutationStateChange]);

  const createRow = async (payload: Record<string, unknown>) => {
    await createRowMutation.mutateAsync(payload);
  };

  const updateRow = async (rowId: string, payload: Record<string, unknown>) => {
    if (
      !hasRowChanges(
        rowsById.get(rowId),
        payload,
        standardTypeByKey,
        customTypeByKey,
      )
    ) {
      return;
    }
    const previous = rowUpdateQueueRef.current.get(rowId) ?? Promise.resolve();
    const run: Promise<void> = previous
      .catch(() => undefined)
      .then(() => updateRowMutation.mutateAsync({ rowId, payload }))
      .then(() => undefined)
      .finally(() => {
        if (rowUpdateQueueRef.current.get(rowId) === run) {
          rowUpdateQueueRef.current.delete(rowId);
        }
      });
    rowUpdateQueueRef.current.set(rowId, run);
    await run;
  };

  const deleteRow = async (rowId: string) => {
    await deleteRowMutation.mutateAsync(rowId);
  };

  const createColumn = async (payload: Record<string, unknown>) => {
    if (!createColumnAction) return;
    await createColumnMutation.mutateAsync(payload);
  };

  const updateColumn = async (
    columnId: string,
    payload: Record<string, unknown>,
  ) => {
    if (!updateColumnAction) return;
    await updateColumnMutation.mutateAsync({ columnId, payload });
  };

  const deleteColumn = async (columnId: string) => {
    if (!deleteColumnAction) return;
    await deleteColumnMutation.mutateAsync(columnId);
  };

  return {
    createRow,
    updateRow,
    deleteRow,
    createColumn,
    updateColumn,
    deleteColumn,
    isMutating,
  };
}
