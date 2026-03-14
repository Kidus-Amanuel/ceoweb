import type { ColumnFieldType } from "../components/shared/table/CustomColumnEditorContent";

declare module "@tanstack/table-core" {
  interface ColumnMeta<TData extends object, TValue> {
    type?: ColumnFieldType;
    options?: { label: string; value: string | number }[];
    optionsByType?: Record<string, { label: string; value: string | number }[]>;
    optionsSourceKey?: string;
    isVirtual?: boolean;
    virtualKey?: string;
    readOnly?: boolean;
  }
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends object, TValue> {
    type?: ColumnFieldType;
    options?: { label: string; value: string | number }[];
    optionsByType?: Record<string, { label: string; value: string | number }[]>;
    optionsSourceKey?: string;
    isVirtual?: boolean;
    virtualKey?: string;
    readOnly?: boolean;
  }
}
