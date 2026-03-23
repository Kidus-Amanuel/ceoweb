import { SupabaseClient } from "@supabase/supabase-js";
import { HREntityType, HRCustomFieldType } from "@/validators/hr";

export interface HRCustomFieldPayload {
  entityType: HREntityType;
  fieldName: string;
  fieldLabel: string;
  fieldType: HRCustomFieldType;
  fieldOptions?: string[];
  isRequired?: boolean;
}

export interface HRColumnDefinition {
  id: string;
  entity_type: HREntityType;
  field_name: string;
  field_label: string;
  field_type: HRCustomFieldType;
  field_options: string[] | null;
  is_required: boolean;
  is_active: boolean;
}

export type HRMetadata = Partial<Record<HREntityType, HRColumnDefinition[]>>;

type ServiceResult<T> = {
  data?: T;
  error?: string;
};

// Helper utilities
const toSnakeCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const toColumnDefinition = (
  input: Partial<HRColumnDefinition> &
    Pick<HRColumnDefinition, "entity_type" | "field_name">,
): HRColumnDefinition => ({
  id: input.id && input.id.length > 0 ? input.id : crypto.randomUUID(),
  entity_type: input.entity_type,
  field_name: input.field_name,
  field_label:
    input.field_label && input.field_label.length > 0
      ? input.field_label
      : input.field_name,
  field_type: input.field_type ?? "text",
  field_options: Array.isArray(input.field_options)
    ? input.field_options
    : null,
  is_required: Boolean(input.is_required),
  is_active: input.is_active ?? true,
});

const normalizeMetadata = (settings: unknown): HRMetadata => {
  const parsedSettings = asRecord(settings);
  const rawMetadata = asRecord(parsedSettings.hr_metadata);

  const metadata: HRMetadata = {};
  const hrEntities: HREntityType[] = [
    "employees",
    "departments",
    "positions",
    "attendance",
    "leaves",
    "leave_types",
    "payroll_runs",
    "payslips",
  ];

  for (const entityType of hrEntities) {
    const values = rawMetadata[entityType];
    if (!Array.isArray(values)) {
      metadata[entityType] = [];
      continue;
    }

    metadata[entityType] = values
      .map((entry) =>
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? toColumnDefinition({
              ...(entry as Partial<HRColumnDefinition>),
              entity_type: entityType,
              field_name:
                typeof (entry as Partial<HRColumnDefinition>).field_name ===
                "string"
                  ? (entry as Partial<HRColumnDefinition>).field_name!
                  : "",
            })
          : null,
      )
      .filter((entry): entry is HRColumnDefinition =>
        Boolean(entry && entry.field_name),
      );
  }

  return metadata;
};

const applyMetadataToSettings = (settings: unknown, metadata: HRMetadata) => {
  const parsedSettings = asRecord(settings);
  return {
    ...parsedSettings,
    hr_metadata: {
      ...asRecord(parsedSettings.hr_metadata),
      ...metadata,
    },
  };
};

export class HRService {
  /**
   * Fetches column definitions (standard + custom) for an HR entity type.
   */
  public static async getColumnDefinitions({
    supabase,
    companyId,
    entityType,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: HREntityType;
  }): Promise<ServiceResult<HRColumnDefinition[]>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!company) return { data: [] };

    const metadata = normalizeMetadata(company.settings);
    return {
      data: (metadata[entityType] ?? []).filter((entry) => entry.is_active),
    };
  }

  /**
   * Saves a column definition to company settings.
   */
  public static async saveColumnDefinition({
    supabase,
    companyId,
    entityType,
    column,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: HREntityType;
    column: Partial<HRColumnDefinition> & {
      field_name?: string;
      field_label?: string;
      field_type?: HRCustomFieldType;
      field_options?: string[] | null;
      is_required?: boolean;
      is_active?: boolean;
    };
  }): Promise<ServiceResult<HRColumnDefinition>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single();

    if (error) return { error: error.message };

    const fieldName =
      column.field_name || toSnakeCase(column.field_label || "");
    if (!fieldName) return { error: "Field name is required." };

    const metadata = normalizeMetadata(company.settings);
    const current = metadata[entityType] ?? [];
    const next = toColumnDefinition({
      ...column,
      entity_type: entityType,
      field_name: fieldName,
    });

    metadata[entityType] = [
      ...current.filter(
        (entry) => entry.id !== next.id && entry.field_name !== next.field_name,
      ),
      next,
    ];

    const nextSettings = applyMetadataToSettings(company.settings, metadata);
    const { error: updateError } = await supabase
      .from("companies")
      .update({ settings: nextSettings })
      .eq("id", companyId);

    if (updateError) return { error: updateError.message };
    return { data: next };
  }

  /**
   * Deletes a custom field definition.
   */
  public static async deleteCustomField({
    supabase,
    companyId,
    entityType,
    fieldId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: HREntityType;
    fieldId: string;
  }): Promise<ServiceResult<null>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single();

    if (error) return { error: error.message };

    const metadata = normalizeMetadata(company.settings);
    const current = metadata[entityType] ?? [];

    metadata[entityType] = current.filter(
      (entry) => entry.id !== fieldId && entry.field_name !== fieldId,
    );

    const nextSettings = applyMetadataToSettings(company.settings, metadata);
    const { error: updateError } = await supabase
      .from("companies")
      .update({ settings: nextSettings })
      .eq("id", companyId);

    if (updateError) return { error: updateError.message };
    return { data: null };
  }
}
