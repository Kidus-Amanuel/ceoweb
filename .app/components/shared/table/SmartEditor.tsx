"use client";

import { useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";
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
  onNavigate?: (direction: "next" | "prev") => void;
  onCancel?: () => void;
  meta?: any;
  placeholder?: string;
  isAddMode?: boolean;
  inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
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
  onNavigate,
  onCancel,
  meta,
  placeholder,
  isAddMode = false,
  inputRef,
}: SmartEditorProps) => {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const currencyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const currencyEditorRef = useRef<HTMLDivElement | null>(null);
  const suppressCurrencyBlurCommitRef = useRef(false);
  const type = meta?.type || "text";
  const baseInputClass =
    "h-full min-h-[40px] w-full max-w-full rounded-none border-0 bg-transparent px-0 py-0 text-sm shadow-none ring-0 focus-visible:ring-0";
  const baseSelectTriggerClass =
    "h-full min-h-[40px] w-full max-w-full rounded-none border-0 bg-transparent px-0 py-0 shadow-none ring-0 focus:ring-0";
  const selectContentClass =
    "z-[120] rounded-md border border-border bg-background p-1 shadow-xl";
  const selectItemClass =
    "rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60 focus:bg-muted/70";
  const setEditorRef = (
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    if (!isAddMode && inputRef) inputRef.current = element;
  };
  const handleGridNavigation = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return false;
    event.preventDefault();
    onNavigate?.(event.shiftKey ? "prev" : "next");
    return true;
  };

  useLayoutEffect(() => {
    if (type !== "text") return;
    const element = textAreaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [type, value]);

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
        <SelectTrigger
          className={baseSelectTriggerClass}
          onKeyDown={(e) => {
            handleGridNavigation(e);
          }}
        >
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
        ref={(node) => setEditorRef(node)}
        placeholder={placeholder}
        value={
          typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : (value ?? "")
        }
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !isAddMode && onCommit?.()}
        onKeyDown={(e) => {
          if (handleGridNavigation(e)) return;
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
    const commitCurrencyOnBlurIfOutside = (
      relatedTarget: EventTarget | null,
    ) => {
      if (suppressCurrencyBlurCommitRef.current) return;
      if (!relatedTarget) {
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (active && currencyEditorRef.current?.contains(active)) return;
          handleCurrencyCommit();
        });
        return;
      }
      if (currencyEditorRef.current?.contains(relatedTarget as Node)) {
        return;
      }
      handleCurrencyCommit();
    };

    return (
      <div
        ref={currencyEditorRef}
        onPointerDownCapture={() => {
          suppressCurrencyBlurCommitRef.current = true;
          requestAnimationFrame(() => {
            suppressCurrencyBlurCommitRef.current = false;
          });
        }}
        className={cn(
          "grid w-full grid-cols-[minmax(0,1fr)_120px] gap-2",
          !isAddMode && "items-center",
        )}
      >
        <Input
          ref={(node) => {
            amountInputRef.current = node;
            setEditorRef(node);
          }}
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
          onBlur={(e) => commitCurrencyOnBlurIfOutside(e.relatedTarget)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              if (e.shiftKey) onNavigate?.("prev");
              else currencyTriggerRef.current?.focus();
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              handleCurrencyCommit();
            }
            if (e.key === "Escape") onCancel?.();
          }}
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
            ref={currencyTriggerRef}
            className={baseSelectTriggerClass}
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              e.preventDefault();
              if (e.shiftKey) amountInputRef.current?.focus();
              else onNavigate?.("next");
            }}
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
          onKeyDown={(e) => {
            if (handleGridNavigation(e)) return;
            if (e.key === "Enter") {
              e.preventDefault();
              onCommit?.();
            }
            if (e.key === "Escape") onCancel?.();
          }}
          className={baseInputClass}
        />
        <Input
          type="time"
          value={parts.time}
          onChange={(e) =>
            onChange(buildDateTimeValue(parts.date, e.target.value))
          }
          onBlur={() => !isAddMode && onCommit?.()}
          onKeyDown={(e) => {
            if (handleGridNavigation(e)) return;
            if (e.key === "Enter") {
              e.preventDefault();
              onCommit?.();
            }
            if (e.key === "Escape") onCancel?.();
          }}
          className={baseInputClass}
        />
      </div>
    );
  }

  if (type === "date")
    return (
      <Input
        ref={(node) => setEditorRef(node)}
        type="date"
        placeholder={placeholder}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !isAddMode && onCommit?.()}
        onKeyDown={(e) => {
          if (handleGridNavigation(e)) return;
          if (e.key === "Enter") onCommit?.();
          if (e.key === "Escape") onCancel?.();
        }}
        className={baseInputClass}
      />
    );
  if (type === "text")
    return (
      <textarea
        ref={(node) => {
          textAreaRef.current = node;
          setEditorRef(node);
        }}
        placeholder={placeholder}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !isAddMode && onCommit?.()}
        onKeyDown={(e) => {
          if (handleGridNavigation(e)) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onCommit?.();
            return;
          }
          if (e.key === "Escape") onCancel?.();
        }}
        className="h-full min-h-[40px] w-full max-w-full resize-none overflow-hidden rounded-none border-0 bg-transparent px-0 py-0 text-sm leading-5 shadow-none focus:outline-none focus:ring-0"
      />
    );

  return (
    <Input
      ref={(node) => setEditorRef(node)}
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
        if (handleGridNavigation(e)) return;
        if (e.key === "Enter") onCommit?.();
        if (e.key === "Escape") onCancel?.();
      }}
      className={baseInputClass}
    />
  );
};
