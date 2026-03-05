"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";
import {
  createCrmCustomFieldAction,
  createCrmRowAction,
  deleteCrmCustomFieldAction,
  deleteCrmRowAction,
  getCrmTableViewAction,
  updateCrmCustomFieldAction,
  updateCrmRowAction,
} from "@/app/api/crm/crm";
import { CRM_TABLE_PAGE_SIZE_DEFAULT } from "@/lib/constants/crm-pagination";
import {
  asRecord,
  crmViewHelpers,
  mapFieldType,
  normalizeFieldOptions,
  normalizeRowForGrid,
  tableToEntity,
  toFriendlyCrmError,
  type RawRow,
  type SelectOption,
} from "@/components/crm/workspace/crm-workspace.shared";
import { CrmWorkspaceTable } from "@/components/crm/workspace/CrmWorkspaceTable";
import TabSkeleton from "./TabSkeleton";

type CustomersTabProps = {
  companyId: string;
  searchQuery: string;
};

export default function CustomersTab({
  companyId,
  searchQuery,
}: CustomersTabProps) {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<RawRow[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<
    Record<string, unknown>[]
  >([]);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const pageSize = CRM_TABLE_PAGE_SIZE_DEFAULT;
  const selectedRowId = searchParams.get("rowId");

  const loadTableView = useCallback(
    async (page: number) => {
      setIsPending(true);
      setError(null);
      try {
        const response = await getCrmTableViewAction({
          companyId,
          table: "customers",
          page,
          pageSize,
          search: searchQuery || undefined,
        });
        if (!response.success || !response.data) {
          setError(
            toFriendlyCrmError(response.error || "Failed to load customers."),
          );
          return;
        }
        setRows((response.data.rows as RawRow[]) || []);
        setColumnDefinitions(response.data.columnDefinitions || []);
        setTotalRows(response.data.totalRows || 0);
        setUsers(response.data.users || []);
      } catch (loadError) {
        setError(
          toFriendlyCrmError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load customers.",
          ),
        );
      } finally {
        setIsPending(false);
      }
    },
    [companyId, pageSize, searchQuery],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    void loadTableView(currentPage);
  }, [currentPage, loadTableView]);

  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row] as const)),
    [rows],
  );
  const relations = useMemo(
    () => ({
      users,
      customers: [] as SelectOption[],
      deals: [] as SelectOption[],
    }),
    [users],
  );
  const gridData = useMemo(
    () => rows.map((row) => normalizeRowForGrid("customers", row)),
    [rows],
  );
  const virtualColumns = useMemo<VirtualColumn[]>(
    () =>
      columnDefinitions.map((field) => {
        const rawOptions = Array.isArray(field.field_options)
          ? field.field_options
          : [];
        return {
          id: String(field.field_name ?? field.id),
          label: String(field.field_label || field.field_name),
          key: String(field.field_name),
          type: mapFieldType(String(field.field_type || "text")),
          options: rawOptions.map((option: unknown) =>
            option && typeof option === "object" && !Array.isArray(option)
              ? {
                  label: String(
                    (option as { label?: unknown }).label ??
                      (option as { value?: unknown }).value ??
                      "",
                  ),
                  value: String(
                    (option as { value?: unknown }).value ??
                      (option as { label?: unknown }).label ??
                      "",
                  ),
                }
              : { label: String(option), value: String(option) },
          ),
        };
      }),
    [columnDefinitions],
  );

  const handleAddRow = async (payload: Record<string, unknown>) => {
    setError(null);
    try {
      const response = await createCrmRowAction({
        companyId,
        table: "customers",
        standardData: crmViewHelpers.serializeStandardData(
          "customers",
          payload,
        ),
        customData: asRecord(payload.customValues),
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to create customer row.");
      }
      await loadTableView(currentPage);
    } catch (mutationError) {
      setError(
        toFriendlyCrmError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to create customer row.",
        ),
      );
      throw mutationError;
    }
  };

  const handleUpdateRow = async (
    rowId: string,
    payload: Record<string, unknown>,
  ) => {
    setError(null);
    const existingRow = rowsById.get(rowId);
    const nextCustomValues =
      payload.customValues !== undefined
        ? asRecord(payload.customValues)
        : asRecord(existingRow?.custom_data ?? existingRow?.custom_fields);
    try {
      const response = await updateCrmRowAction({
        companyId,
        table: "customers",
        rowId,
        standardData: crmViewHelpers.serializeStandardData(
          "customers",
          payload,
          existingRow,
        ),
        customData: nextCustomValues,
        expectedUpdatedAt:
          typeof existingRow?.updated_at === "string"
            ? existingRow.updated_at
            : undefined,
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to update customer row.");
      }
      await loadTableView(currentPage);
    } catch (mutationError) {
      setError(
        toFriendlyCrmError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to update customer row.",
        ),
      );
      throw mutationError;
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    setError(null);
    try {
      const response = await deleteCrmRowAction({
        companyId,
        table: "customers",
        rowId,
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to delete customer row.");
      }
      await loadTableView(currentPage);
    } catch (mutationError) {
      setError(
        toFriendlyCrmError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to delete customer row.",
        ),
      );
      throw mutationError;
    }
  };

  const handleAddColumn = async (column: Omit<VirtualColumn, "id">) => {
    setError(null);
    try {
      const response = await createCrmCustomFieldAction({
        companyId,
        entityType: tableToEntity("customers"),
        fieldLabel: column.label,
        fieldName: column.key,
        fieldType:
          column.type === "json"
            ? "text"
            : column.type === "status"
              ? "select"
              : column.type,
        fieldOptions:
          column.type === "select" ||
          column.type === "currency" ||
          column.type === "status"
            ? normalizeFieldOptions(column.type, column.options)
            : undefined,
        isRequired: false,
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to create custom field.");
      }
      await loadTableView(currentPage);
    } catch (mutationError) {
      setError(
        toFriendlyCrmError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to create custom field.",
        ),
      );
      throw mutationError;
    }
  };

  const handleUpdateColumn = async (
    columnId: string,
    column: Omit<VirtualColumn, "id">,
  ) => {
    setError(null);
    try {
      const response = await updateCrmCustomFieldAction({
        companyId,
        fieldId: columnId,
        entityType: tableToEntity("customers"),
        fieldLabel: column.label,
        fieldName: column.key,
        fieldType:
          column.type === "json"
            ? "text"
            : column.type === "status"
              ? "select"
              : column.type,
        fieldOptions:
          column.type === "select" ||
          column.type === "currency" ||
          column.type === "status"
            ? normalizeFieldOptions(column.type, column.options)
            : undefined,
        isRequired: false,
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to update custom field.");
      }
      await loadTableView(currentPage);
    } catch (mutationError) {
      setError(
        toFriendlyCrmError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to update custom field.",
        ),
      );
      throw mutationError;
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    setError(null);
    try {
      const response = await deleteCrmCustomFieldAction({
        companyId,
        fieldId: columnId,
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to delete custom field.");
      }
      await loadTableView(currentPage);
    } catch (mutationError) {
      setError(
        toFriendlyCrmError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to delete custom field.",
        ),
      );
      throw mutationError;
    }
  };

  if (isPending && rows.length === 0) return <TabSkeleton rows={8} />;

  return (
    <div className="h-full min-h-0">
      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <CrmWorkspaceTable
        table="customers"
        gridData={gridData}
        relations={relations}
        virtualColumns={virtualColumns}
        currentPage={currentPage}
        totalRows={totalRows}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onAdd={handleAddRow}
        onUpdate={handleUpdateRow}
        onDelete={handleDeleteRow}
        onColumnAdd={handleAddColumn}
        onColumnUpdate={handleUpdateColumn}
        onColumnDelete={handleDeleteColumn}
        searchQuery={searchQuery}
        onSearchQueryChange={() => {}}
        selectedRowId={selectedRowId}
      />
    </div>
  );
}
