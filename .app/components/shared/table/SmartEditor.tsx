"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { z } from "zod";
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
  fieldKey?: string;
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

const emailInputSchema = z.string().trim().email();
const phoneInputSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!/^\+?[0-9 ()-]+$/.test(value)) return false;
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },
    {
      message: "Please enter a valid phone number.",
    },
  );

export const SmartEditor = ({
  value,
  onChange,
  onCommit,
  onNavigate,
  onCancel,
  meta,
  fieldKey,
  placeholder,
  isAddMode = false,
  inputRef,
}: SmartEditorProps) => {
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const currencyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const timeInputRef = useRef<HTMLInputElement | null>(null);
  const currencyEditorRef = useRef<HTMLDivElement | null>(null);
  const isCurrencyMenuOpenRef = useRef(false);
  const datetimeEditorRef = useRef<HTMLDivElement | null>(null);
  const currencyAmountDraftRef = useRef<string>("");
  const currencyCodeDraftRef = useRef<string>("ETB");
  const datetimeDateDraftRef = useRef<string>("");
  const datetimeTimeDraftRef = useRef<string>("");
  const type = meta?.type || "text";
  const normalizedKey = String(fieldKey ?? "").toLowerCase();
  const isEmailField = type === "email" || normalizedKey.includes("email");
  const isPhoneField =
    type === "phone" ||
    normalizedKey.includes("phone") ||
    normalizedKey.includes("mobile") ||
    normalizedKey.includes("tel");
  const selectOptions = Array.isArray(meta?.options) ? meta.options : [];
  const normalizedSelectValue = String(value ?? "").trim();
  const selectDefaultOption = selectOptions[0];
  const baseInputClass =
    "h-full min-h-[40px] w-full max-w-full rounded-none border-0 bg-transparent px-2 py-0 text-left text-sm shadow-none ring-0 focus-visible:ring-0";
  const baseSelectTriggerClass =
    "h-full min-h-[40px] w-full max-w-full rounded-none border-0 bg-transparent px-2 py-0 justify-center shadow-none ring-0 focus:ring-0";
  const selectContentClass =
    "z-[120] rounded-md border border-border bg-background p-1 shadow-xl";
  const selectItemClass =
    "rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60 focus:bg-muted/70";
  const setEditorRef = (
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    if (inputRef) inputRef.current = element;
  };
  const handleGridNavigation = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return false;
    event.preventDefault();
    onNavigate?.(event.shiftKey ? "prev" : "next");
    return true;
  };

  useLayoutEffect(() => {
    if (
      type !== "text" &&
      !(type === "email" && isEmailField) &&
      !(type === "phone" && isPhoneField)
    ) {
      return;
    }
    const element = textAreaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
  }, [isEmailField, isPhoneField, type, value]);

  useEffect(() => {
    if (type !== "currency") return;
    const options =
      Array.isArray(meta?.options) && meta.options.length > 0
        ? meta.options
        : defaultCurrencyOptions;
    const current =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as { amount?: unknown; currency?: unknown })
        : (() => {
            const raw = String(value ?? "").trim();
            const matchedOption = options.find(
              (option: { label: string; value: string | number }) =>
                String(option.value).toLowerCase() === raw.toLowerCase() ||
                String(option.label).toLowerCase() === raw.toLowerCase(),
            );
            if (matchedOption)
              return {
                amount: 0,
                currency: String(matchedOption.value),
              };
            return { amount: value, currency: undefined };
          })();
    const parsedAmount = Number(
      current.amount === null ||
        current.amount === undefined ||
        current.amount === ""
        ? 0
        : current.amount,
    );
    currencyAmountDraftRef.current = String(
      Number.isFinite(parsedAmount) ? parsedAmount : 0,
    );
    currencyCodeDraftRef.current = String(
      current.currency ?? options[0]?.value ?? "ETB",
    );
  }, [meta?.options, type, value]);

  useEffect(() => {
    if (type !== "datetime") return;
    const parts = parseDateTimeParts(value);
    datetimeDateDraftRef.current = parts.date;
    datetimeTimeDraftRef.current = parts.time;
  }, [type, value]);

  useEffect(() => {
    if (!(type === "select" || type === "status")) return;
    if (!isAddMode) return;
    if (normalizedSelectValue.length > 0) return;
    if (!selectDefaultOption) return;
    onChange(String(selectDefaultOption.value));
  }, [
    isAddMode,
    normalizedSelectValue,
    onChange,
    selectDefaultOption,
    type,
  ]);

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
    const options = selectOptions;
    const normalizedValue = normalizedSelectValue;
    const defaultOption = selectDefaultOption;
    const selectedValue =
      normalizedValue.length > 0
        ? normalizedValue
        : defaultOption
          ? String(defaultOption.value)
          : "";
    const selectedOption = options.find(
      (o: any) => String(o.value).toLowerCase() === selectedValue.toLowerCase(),
    );
    const selectedIndex = findSelectOptionIndex(options, selectedValue);
    return (
      <Select
        value={selectedValue}
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
        : (() => {
            const raw = String(value ?? "").trim();
            const matchedOption = options.find(
              (option: { label: string; value: string | number }) =>
                String(option.value).toLowerCase() === raw.toLowerCase() ||
                String(option.label).toLowerCase() === raw.toLowerCase(),
            );
            if (matchedOption)
              return {
                amount: 0,
                currency: String(matchedOption.value),
              };
            return { amount: value, currency: undefined };
          })();
    const currentCurrency = String(
      current.currency ?? options[0]?.value ?? "ETB",
    );
    const parsedCurrentAmount = Number(
      current.amount === null ||
        current.amount === undefined ||
        current.amount === ""
        ? 0
        : current.amount,
    );
    const currentAmount = String(
      Number.isFinite(parsedCurrentAmount) ? parsedCurrentAmount : 0,
    );

    const handleCurrencyCommit = () => {
      const amountDraft = currencyAmountDraftRef.current;
      const currencyDraft = currencyCodeDraftRef.current;
      const parsedAmount = Number(amountDraft === "" ? 0 : amountDraft);
      if (!isAddMode)
        onCommit?.({
          amount: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
          currency: currencyDraft,
        });
    };
    const isCurrencyInteractionTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return (
        !!currencyEditorRef.current?.contains(target) ||
        !!target.closest(
          '[data-slot="select-trigger"],[data-slot="select-content"],[data-slot="select-item"]',
        )
      );
    };
    const commitCurrencyOnBlurIfOutside = (
      relatedTarget: EventTarget | null,
    ) => {
      if (isCurrencyMenuOpenRef.current) return;
      if (isCurrencyInteractionTarget(relatedTarget)) return;
      requestAnimationFrame(() => {
        if (isCurrencyMenuOpenRef.current) return;
        const active = document.activeElement;
        if (isCurrencyInteractionTarget(active)) return;
        handleCurrencyCommit();
      });
    };

    return (
      <div
        ref={currencyEditorRef}
        className={cn(
          "grid w-full min-w-[220px] grid-cols-[minmax(90px,1fr)_120px] gap-2",
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
            const raw = e.target.value;
            currencyAmountDraftRef.current = raw;
            const amt = raw === "" ? null : Number(raw);
            onChange({
              amount: Number.isNaN(amt) ? null : amt,
              currency: currencyCodeDraftRef.current,
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
          className={`${baseInputClass} min-w-[90px]`}
        />
        <Select
          onOpenChange={(open) => {
            isCurrencyMenuOpenRef.current = open;
            if (!open) {
              requestAnimationFrame(() => {
                const active = document.activeElement;
                if (isCurrencyInteractionTarget(active)) return;
                handleCurrencyCommit();
              });
            }
          }}
          value={currentCurrency}
          onValueChange={(c) => {
            currencyCodeDraftRef.current = c;
            const amountDraft = currencyAmountDraftRef.current;
            const amt = amountDraft === "" ? null : Number(amountDraft);
            const next = {
              amount: Number.isNaN(amt) ? null : amt,
              currency: c,
            };
            onChange(next);
          }}
        >
          <SelectTrigger
            ref={currencyTriggerRef}
            className={baseSelectTriggerClass}
            onBlur={(e) => commitCurrencyOnBlurIfOutside(e.relatedTarget)}
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
    const commitDateTime = () => {
      if (isAddMode) return;
      onCommit?.(
        buildDateTimeValue(
          datetimeDateDraftRef.current,
          datetimeTimeDraftRef.current,
        ),
      );
    };
    const commitDateTimeIfOutside = (relatedTarget: EventTarget | null) => {
      if (!relatedTarget) {
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (active && datetimeEditorRef.current?.contains(active)) return;
          commitDateTime();
        });
        return;
      }
      if (datetimeEditorRef.current?.contains(relatedTarget as Node)) return;
      commitDateTime();
    };

    return (
      <div
        ref={datetimeEditorRef}
        className="grid w-full grid-cols-[minmax(150px,1fr)_minmax(110px,0.85fr)] gap-2"
      >
        <Input
          ref={dateInputRef}
          type="date"
          value={parts.date}
          onChange={(e) => {
            datetimeDateDraftRef.current = e.target.value;
            onChange(
              buildDateTimeValue(e.target.value, datetimeTimeDraftRef.current),
            );
          }}
          onBlur={(e) => commitDateTimeIfOutside(e.relatedTarget)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              if (e.shiftKey) onNavigate?.("prev");
              else timeInputRef.current?.focus();
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              commitDateTime();
            }
            if (e.key === "Escape") onCancel?.();
          }}
          className={`${baseInputClass} min-w-[150px]`}
        />
        <Input
          ref={timeInputRef}
          type="time"
          value={parts.time}
          onChange={(e) => {
            datetimeTimeDraftRef.current = e.target.value;
            onChange(
              buildDateTimeValue(datetimeDateDraftRef.current, e.target.value),
            );
          }}
          onBlur={(e) => commitDateTimeIfOutside(e.relatedTarget)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              if (e.shiftKey) dateInputRef.current?.focus();
              else onNavigate?.("next");
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              commitDateTime();
            }
            if (e.key === "Escape") onCancel?.();
          }}
          className={`${baseInputClass} min-w-[110px]`}
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
  if (
    (type === "text" || type === "email" || type === "phone") &&
    (isEmailField || isPhoneField)
  )
    return (
      <textarea
        ref={(node) => {
          textAreaRef.current = node;
          setEditorRef(node);
        }}
        placeholder={placeholder}
        value={String(value ?? "")}
        inputMode={isPhoneField ? "tel" : undefined}
        onChange={(e) => {
          e.currentTarget.setCustomValidity("");
          if (isPhoneField) {
            const raw = e.target.value;
            const withoutInvalidChars = raw.replace(/[^+\d ()-]/g, "");
            const sanitized = withoutInvalidChars.startsWith("+")
              ? `+${withoutInvalidChars.slice(1).replace(/\+/g, "")}`
              : withoutInvalidChars.replace(/\+/g, "");
            onChange(sanitized);
            return;
          }
          onChange(e.target.value);
        }}
        onBeforeInput={(e) => {
          if (!isPhoneField) return;
          const native = e.nativeEvent as InputEvent;
          const data = native.data;
          if (!data) return;
          if (!/^[+\d ()-]+$/.test(data)) e.preventDefault();
        }}
        onBlur={(e) => {
          const raw = e.currentTarget.value.trim();
          if (raw) {
            const parsed = isEmailField
              ? emailInputSchema.safeParse(raw)
              : phoneInputSchema.safeParse(raw);
            if (!parsed.success) {
              e.currentTarget.setCustomValidity(
                isEmailField
                  ? "Please enter a valid email address."
                  : "Please enter a valid phone number.",
              );
              e.currentTarget.reportValidity();
              return;
            }
          }
          e.currentTarget.setCustomValidity("");
          if (!isAddMode) onCommit?.();
        }}
        onKeyDown={(e) => {
          const validateCurrent = () => {
            const raw = e.currentTarget.value.trim();
            if (!raw) {
              e.currentTarget.setCustomValidity("");
              return true;
            }
            const parsed = isEmailField
              ? emailInputSchema.safeParse(raw)
              : phoneInputSchema.safeParse(raw);
            if (!parsed.success) {
              e.currentTarget.setCustomValidity(
                isEmailField
                  ? "Please enter a valid email address."
                  : "Please enter a valid phone number.",
              );
              e.currentTarget.reportValidity();
              return false;
            }
            e.currentTarget.setCustomValidity("");
            return true;
          };

          if (e.key === "Tab") {
            if (!validateCurrent()) {
              e.preventDefault();
              return;
            }
            if (handleGridNavigation(e)) return;
          }
          if (e.key === "Enter" && !e.shiftKey) {
            if (!validateCurrent()) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            onCommit?.();
            return;
          }
          if (e.key === "Escape") onCancel?.();
        }}
        className="h-full min-h-[40px] w-full max-w-full resize-none overflow-hidden rounded-none border-0 bg-transparent px-2 py-0 text-left text-sm leading-5 shadow-none focus:outline-none focus:ring-0"
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
        className="h-full min-h-[40px] w-full max-w-full resize-none overflow-hidden rounded-none border-0 bg-transparent px-2 py-0 text-left text-sm leading-5 shadow-none focus:outline-none focus:ring-0"
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
