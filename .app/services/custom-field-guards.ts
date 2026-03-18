import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomFieldMatch<T extends string> = {
  entityType: T;
  fieldName: string;
};

export const findMatchingCustomFields = <
  T extends string,
  E extends { id: string; field_name: string },
>(
  metadata: Partial<Record<T, E[]>>,
  entityTypes: readonly T[],
  fieldId: string,
): CustomFieldMatch<T>[] => {
  const matches: CustomFieldMatch<T>[] = [];
  entityTypes.forEach((entityType) => {
    const values = metadata[entityType] ?? [];
    values.forEach((entry) => {
      if (entry.id === fieldId || entry.field_name === fieldId) {
        matches.push({
          entityType,
          fieldName: entry.field_name,
        });
      }
    });
  });
  return matches;
};

export const ensureNoCustomFieldValues = async <T extends string>({
  supabase,
  companyId,
  matches,
  tableForEntity,
  hasMeaningfulValue,
  errorMessage,
}: {
  supabase: SupabaseClient;
  companyId: string;
  matches: CustomFieldMatch<T>[];
  tableForEntity?: (entityType: T) => string;
  hasMeaningfulValue: (value: unknown) => boolean;
  errorMessage: string;
}): Promise<string | null> => {
  if (!matches.length) return null;
  for (const match of matches) {
    const table = tableForEntity
      ? tableForEntity(match.entityType)
      : match.entityType;
    const { data: rowsWithCustomFields, error: rowsError } = await supabase
      .from(table)
      .select("custom_fields")
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (rowsError) {
      return rowsError.message;
    }

    const hasAnyValue = (rowsWithCustomFields ?? []).some((row) =>
      hasMeaningfulValue(
        (row as { custom_fields?: Record<string, unknown> }).custom_fields?.[
          match.fieldName
        ],
      ),
    );

    if (hasAnyValue) {
      return errorMessage;
    }
  }
  return null;
};
