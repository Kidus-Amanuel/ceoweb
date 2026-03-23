import { flexRender } from "@tanstack/react-table";
import type { Cell } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import { SmartEditor } from "@/components/shared/table/SmartEditor";
import {
  findSelectLabel,
  findSelectOptionIndex,
  formatCurrencyValue,
  formatDateValue,
  getSemanticOptionTone,
  prettyValue,
} from "@/utils/table-utils";
import type { RefObject } from "react";
import { truncateFileName } from "@/utils/table-helpers";

interface CellRendererProps<T> {
  cell: Cell<T, any>;
  isEditing: boolean;
  editValue: any;
  meta: any;
  isVirtual: boolean;
  virtualKey?: string;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  dataFieldKey: string;
  onEditValueChange: (value: any) => void;
  onNavigate: (direction: "next" | "prev") => void;
  onOpenFilesEditor?: () => void;
  onCommit: (value?: any) => void;
  onCancel: () => void;
  onSave: (
    rowId: string,
    columnId: string,
    value: any,
    isVirtual: boolean,
    virtualKey?: string,
  ) => void;
}

/**
 * Renders cell content based on field type
 *
 * Handles:
 * - SmartEditor for editing mode
 * - Select/Status pills
 * - Boolean checkboxes
 * - Currency badges with formatted values
 * - Date/DateTime formatting
 * - Standard cell rendering via flexRender
 */
export function CellRenderer<T extends { id: string }>({
  cell,
  isEditing,
  editValue,
  meta,
  isVirtual,
  virtualKey,
  inputRef,
  dataFieldKey,
  onEditValueChange,
  onNavigate,
  onOpenFilesEditor,
  onCommit,
  onCancel,
  onSave,
}: CellRendererProps<T>) {
  const val = cell.getValue();
  const row = cell.row.original;

  // Editing mode: show SmartEditor
  if (isEditing) {
    return (
      <SmartEditor
        inputRef={inputRef}
        meta={meta}
        fieldKey={dataFieldKey}
        value={editValue}
        onChange={onEditValueChange}
        onNavigate={onNavigate}
        onClick={meta?.type === "files" ? onOpenFilesEditor : undefined}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    );
  }

  // Select or Status field: show pill with terminal styling
  if (meta?.type === "select" || meta?.type === "status") {
    const label = findSelectLabel(meta.options, val);
    const rawText = val === null || val === undefined ? "" : String(val);
    const isUnassigned = !label && rawText.length === 0;
    return (
      <span
        className={cn(
          "inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm",
          isUnassigned
            ? "bg-slate-100 text-slate-500 border-slate-200"
            : getSemanticOptionTone(
                label ?? val,
                findSelectOptionIndex(meta.options, val),
              ),
        )}
        style={{
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {label ?? (rawText.length > 0 ? rawText : "Unassigned")}
      </span>
    );
  }

  // Boolean field: show checkbox
  if (meta?.type === "boolean") {
    return (
      <Checkbox
        checked={!!val}
        onCheckedChange={(checked) =>
          onSave(
            row.id,
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

  // Files field: show add/manage button in read mode
  if (meta?.type === "files") {
    const files = Array.isArray(val) ? val : [];
    const labels = files
      .map((file) => {
        if (!file || typeof file !== "object") return "";
        const record = file as { name?: unknown; path?: unknown; url?: unknown };
        return truncateFileName(
          String(record.name ?? record.path ?? record.url ?? ""),
        );
      })
      .filter(Boolean);
    return (
      <button
        type="button"
        className={cn(
          "inline-flex max-w-full items-center gap-2 rounded-md border border-indigo-100 bg-indigo-50/50 px-2.5 py-1.5 transition-colors",
          meta?.readOnly ? "cursor-default" : "hover:bg-indigo-50",
        )}
        onClick={(event) => {
          event.stopPropagation();
          onOpenFilesEditor?.();
        }}
      >
        <span className="truncate text-xs font-medium text-indigo-700">
          {labels.length > 0 ? labels.join(", ") : "Add files"}
        </span>
      </button>
    );
  }

  // Currency field: show formatted value with terminal styling
  if (meta?.type === "currency") {
    const rawCurrency =
      val && typeof val === "object" && !Array.isArray(val)
        ? String((val as Record<string, unknown>).currency ?? "")
        : typeof val === "string" && Number.isNaN(Number(val))
          ? val
          : String(meta?.options?.[0]?.value ?? "ETB");

    const currencyLabel =
      findSelectLabel(meta?.options, rawCurrency) ?? rawCurrency;
    const currencyIndex = findSelectOptionIndex(meta?.options, rawCurrency);

    return (
      <span
        className={cn(
          "inline-flex whitespace-nowrap rounded-sm border-2 px-2.5 py-1 text-[12px] font-mono font-bold tracking-tight shadow-sm",
          getSemanticOptionTone(currencyLabel, currencyIndex),
        )}
      >
        {formatCurrencyValue(val, meta?.options)}
      </span>
    );
  }

  // Date/DateTime field: show formatted date with monospace
  if (meta?.type === "date" || meta?.type === "datetime") {
    return (
      <span
        className="inline-flex whitespace-nowrap text-slate-600 font-mono text-[12px]"
        style={{
          letterSpacing: "-0.01em",
        }}
      >
        {formatDateValue(val, meta.type === "datetime")}
      </span>
    );
  }

  // Standard field: use TanStack Table's flexRender or plain value
  if (!isVirtual) {
    return flexRender(cell.column.columnDef.cell, cell.getContext());
  }

  return <span>{prettyValue(val)}</span>;
}
