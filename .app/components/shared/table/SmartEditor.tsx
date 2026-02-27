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
import { cn } from "@/lib/utils";
import {
  defaultCurrencyOptions,
  findSelectOptionIndex,
  getSemanticOptionTone,
} from "@/utils/table-utils";

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
          onCheckedChange={(c) => {
            onChange(c === true);
            if (!isAddMode) onCommit?.(c === true);
          }}
        />
      </div>
    );
  }

  if (type === "select" || type === "status") {
    const options = Array.isArray(meta?.options) ? meta.options : [];
    const selectedOption = options.find(
      (o: any) =>
        String(o.value).toLowerCase() ===
        String(value ?? "")
          .trim()
          .toLowerCase(),
    );
    const selectedIndex = findSelectOptionIndex(options, value);
    return (
      <Select
        value={String(value ?? "")}
        onValueChange={(next) => {
          onChange(next);
          if (!isAddMode) onCommit?.(next);
        }}
      >
        <SelectTrigger className={baseSelectTriggerClass}>
          {selectedOption ? (
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                getSemanticOptionTone(selectedOption.label, selectedIndex),
              )}
            >
              {selectedOption.label}
            </span>
          ) : (
            <SelectValue placeholder={placeholder || "Select..."} />
          )}
        </SelectTrigger>
        <SelectContent className={selectContentClass}>
          {options.map((o: any) => (
            <SelectItem
              className={selectItemClass}
              key={String(o.value)}
              value={String(o.value)}
            >
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                  getSemanticOptionTone(
                    o.label,
                    findSelectOptionIndex(options, o.value),
                  ),
                )}
              >
                {o.label}
              </span>
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
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !isAddMode && onCommit?.()}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit?.();
          if (e.key === "Escape") onCancel?.();
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
        : { amount: value, currency: undefined };
    const currentCurrency = String(
      current.currency ?? options[0]?.value ?? "ETB",
    );
    const currentAmount =
      current.amount === null || current.amount === undefined
        ? ""
        : String(current.amount);

    const handleCurrencyCommit = () => {
      if (!isAddMode)
        onCommit?.({
          amount: currentAmount === "" ? null : Number(currentAmount),
          currency: currentCurrency,
        });
    };

    return (
      <div
        className={cn(
          "grid w-full grid-cols-[minmax(0,1fr)_120px] gap-2",
          !isAddMode && "items-center",
        )}
      >
        <Input
          ref={!isAddMode && inputRef ? inputRef : undefined}
          type="number"
          placeholder="Amount"
          value={currentAmount}
          onChange={(e) => {
            const amt = e.target.value === "" ? null : Number(e.target.value);
            onChange({
              amount: Number.isNaN(amt) ? null : amt,
              currency: currentCurrency,
            });
          }}
          onBlur={handleCurrencyCommit}
          className={baseInputClass}
        />
        <Select
          value={currentCurrency}
          onValueChange={(c) => {
            const amt = currentAmount === "" ? null : Number(currentAmount);
            const next = {
              amount: Number.isNaN(amt) ? null : amt,
              currency: c,
            };
            onChange(next);
            if (!isAddMode) onCommit?.(next);
          }}
        >
          <SelectTrigger
            className={baseSelectTriggerClass}
            onBlur={handleCurrencyCommit}
          >
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                getSemanticOptionTone(
                  currentCurrency,
                  findSelectOptionIndex(options, currentCurrency),
                ),
              )}
            >
              {currentCurrency}
            </span>
          </SelectTrigger>
          <SelectContent className={selectContentClass}>
            {options.map((o: any) => (
              <SelectItem
                className={selectItemClass}
                key={String(o.value)}
                value={String(o.value)}
              >
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                    getSemanticOptionTone(
                      o.label,
                      findSelectOptionIndex(options, o.value),
                    ),
                  )}
                >
                  {o.label}
                </span>
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
          onChange={(e) =>
            onChange(buildDateTimeValue(e.target.value, parts.time))
          }
          onBlur={() => !isAddMode && onCommit?.()}
          className={baseInputClass}
        />
        <Input
          type="time"
          value={parts.time}
          onChange={(e) =>
            onChange(buildDateTimeValue(parts.date, e.target.value))
          }
          onBlur={() => !isAddMode && onCommit?.()}
          className={baseInputClass}
        />
      </div>
    );
  }

  if (type === "date")
    return (
      <Input
        ref={!isAddMode && inputRef ? inputRef : undefined}
        type="date"
        placeholder={placeholder}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !isAddMode && onCommit?.()}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit?.();
          if (e.key === "Escape") onCancel?.();
        }}
        className={baseInputClass}
      />
    );
  if (type === "text")
    return (
      <textarea
        placeholder={placeholder}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !isAddMode && onCommit?.()}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onCommit?.();
          if (e.key === "Escape") onCancel?.();
        }}
        className="min-h-[72px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-5 shadow-none focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );

  return (
    <Input
      ref={!isAddMode && inputRef ? inputRef : undefined}
      type={type === "number" ? "number" : "text"}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => {
        if (type === "number")
          return onChange(
            e.target.value === "" ? null : Number(e.target.value),
          );
        onChange(e.target.value);
      }}
      onBlur={() => !isAddMode && onCommit?.()}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit?.();
        if (e.key === "Escape") onCancel?.();
      }}
      className={baseInputClass}
    />
  );
};
