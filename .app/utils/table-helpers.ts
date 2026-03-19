export type TableFieldType =
  | "text"
  | "select"
  | "status"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "boolean"
  | "email"
  | "phone"
  | "files"
  | "json";

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const normalizeNil = (value: unknown) =>
  value === "" || value === null || value === undefined ? null : value;

export const toStringSafe = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);

export const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`);
  return `{${entries.join(",")}}`;
};

export const normalizeSelectValue = (value: unknown) => {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? ((value as { value?: unknown; label?: unknown }).value ??
        (value as { label?: unknown }).label)
      : value;
  const trimmed = toStringSafe(normalizeNil(raw)).trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

export const normalizeText = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  return toStringSafe(normalized).trim();
};

export const normalizeEmail = (value: unknown) => {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLowerCase() : null;
};

export const normalizePhone = (value: unknown) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const trimmed = normalized.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  return `${hasPlus ? "+" : ""}${digits}`;
};

export const normalizeNumber = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  const parsed =
    typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(parsed) ? parsed : toStringSafe(normalized).trim();
};

export const normalizeCurrency = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  if (typeof normalized === "object" && !Array.isArray(normalized)) {
    const record = normalized as { amount?: unknown; currency?: unknown };
    const amount = normalizeNumber(record.amount ?? null);
    const currency = normalizeText(record.currency ?? null);
    return JSON.stringify({
      amount: typeof amount === "number" ? amount : (amount ?? null),
      currency: currency ? currency.toUpperCase() : null,
    });
  }
  if (typeof normalized === "string") {
    return JSON.stringify({
      amount: null,
      currency: normalized.trim().toUpperCase(),
    });
  }
  if (typeof normalized === "number") {
    return JSON.stringify({ amount: normalized, currency: null });
  }
  return JSON.stringify({ amount: null, currency: null });
};

export const normalizeDate = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  const date = new Date(String(normalized));
  if (Number.isNaN(date.getTime())) return normalizeText(normalized);
  return date.toISOString().slice(0, 10);
};

export const normalizeDateTime = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  const date = new Date(String(normalized));
  if (Number.isNaN(date.getTime())) return normalizeText(normalized);
  return date.toISOString();
};

export const normalizeJson = (value: unknown) => {
  const normalized = normalizeNil(value);
  if (normalized === null) return null;
  return stableStringify(normalized);
};

export const normalizeFiles = (value: unknown) => {
  if (!Array.isArray(value)) return normalizeJson(value);
  const ids = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return String(entry ?? "");
      const record = entry as {
        id?: unknown;
        path?: unknown;
        url?: unknown;
        name?: unknown;
      };
      return (
        toStringSafe(record.id) ||
        toStringSafe(record.path) ||
        toStringSafe(record.url) ||
        toStringSafe(record.name)
      ).trim();
    })
    .filter(Boolean)
    .sort();
  return JSON.stringify(ids);
};

export const normalizeByType = (value: unknown, type: TableFieldType) => {
  switch (type) {
    case "select":
    case "status":
      return normalizeSelectValue(value);
    case "number":
      return normalizeNumber(value);
    case "currency":
      return normalizeCurrency(value);
    case "date":
      return normalizeDate(value);
    case "datetime":
      return normalizeDateTime(value);
    case "boolean": {
      const normalized = normalizeNil(value);
      if (normalized === null) return null;
      if (typeof normalized === "boolean") return normalized;
      const token = toStringSafe(normalized).trim().toLowerCase();
      if (token === "true" || token === "1") return true;
      if (token === "false" || token === "0") return false;
      return token ? true : null;
    }
    case "email":
      return normalizeEmail(value);
    case "phone":
      return normalizePhone(value);
    case "files":
      return normalizeFiles(value);
    case "json":
      return normalizeJson(value);
    case "text":
    default:
      return normalizeText(value);
  }
};

export const isEqualByType = (
  left: unknown,
  right: unknown,
  type: TableFieldType,
) => {
  const leftNorm = normalizeByType(left, type);
  const rightNorm = normalizeByType(right, type);
  if (typeof leftNorm === "number" && typeof rightNorm === "number") {
    return Number.isFinite(leftNorm) && Number.isFinite(rightNorm)
      ? leftNorm === rightNorm
      : leftNorm === rightNorm;
  }
  return Object.is(leftNorm, rightNorm);
};

export const hasRowChanges = (
  row: Record<string, unknown> | undefined,
  payload: Record<string, unknown>,
  standardTypeByKey: Map<string, TableFieldType>,
  customTypeByKey: Map<string, TableFieldType>,
  customKey = "customValues",
) => {
  if (!row) return true;
  const entries = Object.entries(payload);
  if (!entries.length) return false;
  const existingCustom = asRecord(row.custom_data ?? row.custom_fields);
  for (const [key, value] of entries) {
    if (key === customKey) {
      if (value === undefined) continue;
      const nextCustom = asRecord(value);
      for (const [customFieldKey, customValue] of Object.entries(nextCustom)) {
        const type = customTypeByKey.get(customFieldKey) ?? "text";
        if (!isEqualByType(existingCustom[customFieldKey], customValue, type))
          return true;
      }
      continue;
    }
    const type = standardTypeByKey.get(key) ?? "text";
    if (!isEqualByType(row[key], value, type)) return true;
  }
  return false;
};
