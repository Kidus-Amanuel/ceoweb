import {
  AlignLeft,
  Braces,
  CheckSquare,
  CircleDot,
  Coins,
  Fingerprint,
  GitBranch,
  Hash,
  Link2,
  Mail,
  ListFilter,
  MapPin,
  MousePointerSquareDashed,
  Paperclip,
  Phone,
  Sigma,
  SquareUserRound,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
import type {
  ColumnFieldType,
  ColumnFieldChoice,
} from "@/components/shared/table/CustomColumnEditorContent";

export interface VirtualColumn {
  id: string;
  label: string;
  key: string;
  type: ColumnFieldType;
  options?: { label: string; value: string | number }[];
}

export const defaultCurrencyOptions = [
  { label: "ETB", value: "ETB" },
  { label: "USD", value: "USD" },
  { label: "EUR", value: "EUR" },
  { label: "GBP", value: "GBP" },
  { label: "JPY", value: "JPY" },
  { label: "PHP", value: "PHP" },
];

export const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
export const toColumnKey = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const allowedTypes: VirtualColumn["type"][] = [
  "text",
  "number",
  "date",
  "datetime",
  "select",
  "boolean",
  "json",
  "currency",
  "status",
  "email",
  "files",
];
export const asColumnType = (v: unknown): VirtualColumn["type"] =>
  allowedTypes.includes(v as VirtualColumn["type"])
    ? (v as VirtualColumn["type"])
    : "text";

export const parseOptionTokens = (value: string, uppercase = false) => {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => (uppercase ? e.toUpperCase() : e))
    .filter((e) => {
      const key = e.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const hasMeaningfulCustomValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if ("amount" in rec || "currency" in rec)
      return (
        (rec.amount !== null &&
          rec.amount !== undefined &&
          String(rec.amount).trim() !== "") ||
        String(rec.currency ?? "").trim().length > 0
      );
    return Object.keys(rec).length > 0;
  }
  return false;
};

export const optionTonePalette = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-teal-100 text-teal-700 border-teal-200",
];
export const getOptionToneByIndex = (i: number) =>
  optionTonePalette[Math.max(0, i) % optionTonePalette.length];

export const getSemanticOptionTone = (label: unknown, index: number) => {
  const text = norm(label);
  if (/(in progress|ongoing|wip)/.test(text))
    return "bg-cyan-100 text-cyan-700 border-cyan-200";
  if (
    /(inactive|overdue|lost|cancel|failed|error|declined|rejected|blocked|delinquent)/.test(
      text,
    )
  )
    return "bg-red-100 text-red-700 border-red-200";
  if (/(pending|hold|review|warning|at risk)/.test(text))
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (/(active|done|completed|won|approved|paid|success)/.test(text))
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return getOptionToneByIndex(index);
};

export const findSelectOptionIndex = (
  options: { label: string; value: string | number }[] | undefined,
  value: unknown,
) => {
  const n = norm(value);
  if (!options?.length || !n) return 0;
  return Math.max(
    0,
    options.findIndex((o) => norm(o.value) === n || norm(o.label) === n),
  );
};

export const findSelectLabel = (
  options: { label: string; value: string | number }[] | undefined,
  value: unknown,
) => {
  const n = norm(value);
  return !options?.length || !n
    ? undefined
    : options.find((o) => norm(o.value) === n || norm(o.label) === n)?.label;
};

export const formatDateValue = (value: unknown, withTime: boolean) => {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return withTime
    ? parsed.toLocaleString(undefined, {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
};

export const prettyValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.map(String).join(", ");
  const rec = value as Record<string, unknown>;
  if ("amount" in rec || "currency" in rec) {
    return formatCurrencyValue(value, defaultCurrencyOptions);
  }
  return JSON.stringify(value);
};

export const formatCurrencyValue = (
  value: unknown,
  options?: { label: string; value: string | number }[],
) => {
  const effectiveOptions =
    Array.isArray(options) && options.length > 0
      ? options
      : defaultCurrencyOptions;
  const defaultCurrency = String(
    effectiveOptions[0]?.value ?? effectiveOptions[0]?.label ?? "ETB",
  );
  const resolveCurrency = (raw: unknown) => {
    const token = String(raw ?? "").trim();
    if (!token) return defaultCurrency;
    const matched = effectiveOptions.find(
      (option) =>
        norm(option.value) === norm(token) ||
        norm(option.label) === norm(token),
    );
    return String(matched?.value ?? matched?.label ?? token);
  };
  const formatAmount = (raw: unknown) => {
    const parsed = Number(raw ?? 0);
    const amount = Number.isFinite(parsed) ? parsed : 0;
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    const currency = resolveCurrency(rec.currency);
    const amount =
      rec.amount === null || rec.amount === undefined || rec.amount === ""
        ? 0
        : rec.amount;
    return `${currency} ${formatAmount(amount)}`;
  }
  if (typeof value === "number") {
    return `${defaultCurrency} ${formatAmount(value)}`;
  }
  if (typeof value === "string") {
    const token = value.trim();
    if (!token) return `${defaultCurrency} ${formatAmount(0)}`;
    const numeric = Number(token);
    if (Number.isFinite(numeric))
      return `${defaultCurrency} ${formatAmount(numeric)}`;
    return `${resolveCurrency(token)} ${formatAmount(0)}`;
  }
  return `${defaultCurrency} ${formatAmount(0)}`;
};

export const resolveMetaForValues = (
  meta: any,
  values?: Record<string, unknown>,
) => {
  if (
    meta?.type !== "select" ||
    !meta?.optionsByType ||
    !meta?.optionsSourceKey
  )
    return meta;
  const src = values?.[meta.optionsSourceKey];
  return {
    ...meta,
    options:
      meta.optionsByType[norm(src)] ??
      meta.optionsByType[String(src ?? "")] ??
      [],
  };
};

export const prettifyColumnKey = (v: string) =>
  v.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const calculateDays = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const diff = e.getTime() - s.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 0;
};

export const getTypeIcon = (type: unknown) => {
  const t = String(type ?? "text");
  return t === "number"
    ? Hash
    : t === "date"
      ? CalendarDays
      : t === "datetime"
        ? CalendarClock
        : t === "select"
          ? ListFilter
          : t === "boolean"
            ? CheckSquare
            : t === "currency"
              ? Coins
              : t === "status"
                ? CircleDot
                : t === "phone"
                  ? Phone
                  : t === "email"
                    ? Mail
                    : t === "json"
                      ? Braces
                      : t === "files"
                        ? Paperclip
                        : AlignLeft;
};

export const getTypeIconTone = (type: unknown) => {
  const t = String(type ?? "text");
  return t === "number"
    ? "text-cyan-700 bg-cyan-50 border-cyan-200"
    : t === "date"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : t === "datetime"
        ? "text-indigo-700 bg-indigo-50 border-indigo-200"
        : t === "select"
          ? "text-violet-700 bg-violet-50 border-violet-200"
          : t === "boolean"
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : t === "currency"
              ? "text-orange-700 bg-orange-50 border-orange-200"
              : t === "status"
                ? "text-red-700 bg-red-50 border-red-200"
                : t === "phone"
                  ? "text-cyan-700 bg-cyan-50 border-cyan-200"
                  : t === "email"
                    ? "text-blue-700 bg-blue-50 border-blue-200"
                    : t === "json"
                      ? "text-slate-700 bg-slate-100 border-slate-200"
                      : t === "files"
                        ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                        : "text-blue-700 bg-blue-50 border-blue-200";
};

export const fieldTypeChoices: ColumnFieldChoice[] = [
  {
    key: "text",
    label: "Text",
    icon: AlignLeft,
    tone: "text-blue-600 bg-blue-50 border-blue-200",
    enabled: true,
  },
  {
    key: "number",
    label: "Number",
    icon: Hash,
    tone: "text-cyan-700 bg-cyan-50 border-cyan-200",
    enabled: true,
  },
  {
    key: "select",
    label: "Select",
    icon: ListFilter,
    tone: "text-violet-700 bg-violet-50 border-violet-200",
    enabled: true,
  },
  {
    key: "status",
    label: "Status",
    icon: CircleDot,
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    enabled: true,
  },
  {
    key: "date",
    label: "Date",
    icon: CalendarDays,
    tone: "text-amber-700 bg-amber-50 border-amber-200",
    enabled: true,
  },
  {
    key: "datetime",
    label: "Date + Time",
    icon: CalendarClock,
    tone: "text-indigo-700 bg-indigo-50 border-indigo-200",
    enabled: true,
  },
  {
    key: "boolean",
    label: "Checkbox",
    icon: CheckSquare,
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    enabled: true,
  },
  {
    key: "currency",
    label: "Currency",
    icon: Coins,
    tone: "text-orange-700 bg-orange-50 border-orange-200",
    enabled: true,
  },
  {
    key: "phone",
    label: "Phone",
    icon: Phone,
    tone: "text-cyan-700 bg-cyan-50 border-cyan-200",
    enabled: true,
  },
  {
    key: "email",
    label: "Email",
    icon: Mail,
    tone: "text-blue-700 bg-blue-50 border-blue-200",
    enabled: true,
  },
  {
    key: "files",
    label: "Files & media",
    icon: Paperclip,
    tone: "text-indigo-700 bg-indigo-50 border-indigo-200",
    enabled: true,
  },
  // {
  //   key: "person",
  //   label: "Person",
  //   icon: SquareUserRound,
  //   tone: "text-teal-700 bg-teal-50 border-teal-200",
  //   enabled: false,
  // },
  // {
  //   key: "url",
  //   label: "URL",
  //   icon: Link2,
  //   tone: "text-sky-700 bg-sky-50 border-sky-200",
  //   enabled: false,
  // },
  // {
  //   key: "relation",
  //   label: "Relation",
  //   icon: GitBranch,
  //   tone: "text-slate-700 bg-slate-100 border-slate-200",
  //   enabled: false,
  // },
  // {
  //   key: "rollup",
  //   label: "Rollup",
  //   icon: Sigma,
  //   tone: "text-slate-700 bg-slate-100 border-slate-200",
  //   enabled: false,
  // },
  // {
  //   key: "formula",
  //   label: "Formula",
  //   icon: Braces,
  //   tone: "text-orange-700 bg-orange-50 border-orange-200",
  //   enabled: false,
  // },
  // {
  //   key: "id",
  //   label: "ID",
  //   icon: Fingerprint,
  //   tone: "text-zinc-700 bg-zinc-100 border-zinc-200",
  //   enabled: false,
  // },
  // {
  //   key: "button",
  //   label: "Button",
  //   icon: MousePointerSquareDashed,
  //   tone: "text-blue-700 bg-blue-50 border-blue-200",
  //   enabled: false,
  // },
  // {
  //   key: "place",
  //   label: "Place",
  //   icon: MapPin,
  //   tone: "text-rose-700 bg-rose-50 border-rose-200",
  //   enabled: false,
  // },
];
