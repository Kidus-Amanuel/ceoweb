"use client";

import type { RefObject } from "react";
import { Checkbox } from "@/components/shared/ui/checkbox/Checkbox";
import { Input } from "@/components/shared/ui/input/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/ui/select/Select";

export interface SmartEditorProps {
  value: any;
  onChange: (val: any) => void;
  onCommit?: (nextValue?: any) => void;
  onCancel?: () => void;
  meta?: any;
  placeholder?: string;
  isAddMode?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export const defaultCurrencyOptions = [
  { label: "USD", value: "USD" },
  { label: "EUR", value: "EUR" },
  { label: "GBP", value: "GBP" },
  { label: "JPY", value: "JPY" },
  { label: "PHP", value: "PHP" },
];

export const parseDateTimeParts = (
  value: unknown,
): { date: string; time: string } => {
  if (typeof value !== "string" || value.length === 0)
    return { date: "", time: "" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const [datePart = "", timePart = ""] = value.split("T");
    return { date: datePart, time: timePart.slice(0, 5) };
  }
  return {
    date: `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`,
    time: `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`,
  };
};

export const buildDateTimeValue = (date: string, time: string) =>
  !date ? null : `${date}T${time || "00:00"}:00`;

export const SmartEditor = ({
  value,
  onChange,
  onCommit,
  onCancel,
  meta,
  placeholder,
  isAddMode = false,
  inputRef,
}: SmartEditorProps) => {
  const type = meta?.type || "text";
  const baseInputClass =
    "h-9 w-full max-w-full rounded-md border border-border bg-background px-3 text-sm shadow-none ring-0 focus-visible:ring-1 focus-visible:ring-blue-500";
  const baseSelectTriggerClass =
    "h-9 w-full max-w-full rounded-md border border-border bg-background shadow-none";
  const selectContentClass =
    "z-[120] rounded-md border border-border bg-background p-1 shadow-xl";
  const selectItemClass =
    "rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60 focus:bg-muted/70";

  if (type === "boolean") {
    return (
      <div className="flex items-center h-full px-1">
        <Checkbox
          checked={!!value}
          onCheckedChange={(checked) => {
            const next = checked === true;
            onChange(next);
            if (!isAddMode) onCommit?.(next);
          }}
        />
      </div>
    );
  }

  if (type === "select") {
    return (
      <Select
        value={String(value ?? "")}
        onValueChange={(next) => {
          onChange(next);
          if (!isAddMode) onCommit?.(next);
        }}
      >
        <SelectTrigger className={baseSelectTriggerClass}>
          <SelectValue placeholder={placeholder || "Select..."} />
        </SelectTrigger>
        <SelectContent className={selectContentClass}>
          {(meta?.options ?? []).map((option: any) => (
            <SelectItem
              className={selectItemClass}
              key={String(option.value)}
              value={String(option.value)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (type === "json") {
    return (
      <Input
        ref={!isAddMode && inputRef ? inputRef : undefined}
        placeholder={placeholder}
        value={
          typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : (value ?? "")
        }
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => !isAddMode && onCommit?.()}
        onKeyDown={(event) => {
          if (event.key === "Enter") onCommit?.();
          if (event.key === "Escape") onCancel?.();
        }}
        className={`${baseInputClass} font-mono text-[11px]`}
      />
    );
  }

  if (type === "currency") {
    const options =
      Array.isArray(meta?.options) && meta.options.length > 0
        ? meta.options
        : defaultCurrencyOptions;
    const current =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as { amount?: unknown; currency?: unknown })
        : { amount: value, currency: options[0]?.value ?? "USD" };
    const currentCurrency = String(
      current.currency ?? options[0]?.value ?? "USD",
    );
    const currentAmount =
      current.amount === null || current.amount === undefined
        ? ""
        : String(current.amount);

    return (
      <div
        className={
          isAddMode
            ? "grid w-full grid-cols-[minmax(0,1fr)_120px] gap-2"
            : "grid w-full grid-cols-[minmax(0,1fr)_120px] items-center gap-2"
        }
      >
        <Input
          ref={!isAddMode && inputRef ? inputRef : undefined}
          type="number"
          placeholder="Amount"
          value={currentAmount}
          onChange={(event) => {
            const amount =
              event.target.value === "" ? null : Number(event.target.value);
            onChange({
              amount:
                event.target.value === "" || Number.isNaN(amount)
                  ? null
                  : amount,
              currency: currentCurrency,
            });
          }}
          onBlur={() => {
            if (isAddMode) return;
            const amount = currentAmount === "" ? null : Number(currentAmount);
            onCommit?.({
              amount:
                currentAmount === "" || Number.isNaN(amount) ? null : amount,
              currency: currentCurrency,
            });
          }}
          className={baseInputClass}
        />
        <Select
          value={currentCurrency}
          onValueChange={(nextCurrency) => {
            const amount = currentAmount === "" ? null : Number(currentAmount);
            const nextValue = {
              amount:
                currentAmount === "" || Number.isNaN(amount) ? null : amount,
              currency: nextCurrency,
            };
            onChange(nextValue);
            if (!isAddMode) onCommit?.(nextValue);
          }}
        >
          <SelectTrigger className={baseSelectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {options.map((option: any) => (
              <SelectItem
                className={selectItemClass}
                key={String(option.value)}
                value={String(option.value)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "datetime") {
    const parts = parseDateTimeParts(value);
    return (
      <div className="grid w-full grid-cols-2 gap-2">
        <Input
          type="date"
          value={parts.date}
          onChange={(event) =>
            onChange(buildDateTimeValue(event.target.value, parts.time))
          }
          onBlur={() => !isAddMode && onCommit?.()}
          className={baseInputClass}
        />
        <Input
          type="time"
          value={parts.time}
          onChange={(event) =>
            onChange(buildDateTimeValue(parts.date, event.target.value))
          }
          onBlur={() => !isAddMode && onCommit?.()}
          className={baseInputClass}
        />
      </div>
    );
  }

  if (type === "text") {
    return (
      <textarea
        placeholder={placeholder}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => !isAddMode && onCommit?.()}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter")
            onCommit?.();
          if (event.key === "Escape") onCancel?.();
        }}
        className="min-h-[72px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-5 shadow-none focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  return (
    <Input
      ref={!isAddMode && inputRef ? inputRef : undefined}
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(event) => {
        if (type === "number")
          return onChange(
            event.target.value === "" ? null : Number(event.target.value),
          );
        onChange(event.target.value);
      }}
      onBlur={() => !isAddMode && onCommit?.()}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit?.();
        if (event.key === "Escape") onCancel?.();
      }}
      className={baseInputClass}
    />
  );
};
