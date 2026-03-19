import * as z from "zod";

/**
 * Utility to convert empty strings or nulls to undefined for optional fields
 */
export const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

/**
 * Pre-processor for optional input fields
 */
export const optionalInput = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional().catch(undefined));

/**
 * Base company scope for all multi-tenant actions
 */
export const companyScopeSchema = z.object({
  companyId: z.string().uuid("Invalid company id"),
});

/**
 * Unified Custom Field Types supported across the ERP
 */
export const customFieldTypeSchema = z.enum([
  "text",
  "number",
  "date",
  "datetime",
  "select",
  "boolean",
  "currency",
  "status",
  "email",
  "phone",
  "files",
  "json",
]);

/**
 * JSON Schema for custom column values
 */
const jsonValueSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.lazy(() => jsonValueSchema)),
    z.record(
      z.string(),
      z.lazy(() => jsonValueSchema),
    ),
  ]),
);

export const customDataSchema = z
  .record(z.string(), jsonValueSchema)
  .default({});

/**
 * Generic Custom Field Definition schemas
 */
export function createCustomFieldSchema<T extends z.ZodTypeAny>(
  entityTypeSchema: T,
) {
  return z.object({
    companyId: z.string().uuid("Invalid company id"),
    entityType: entityTypeSchema,
    fieldLabel: z.string().min(1).max(120),
    fieldName: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/)
      .optional(),
    fieldType: customFieldTypeSchema,
    fieldOptions: z.array(z.string().min(1)).optional(),
    isRequired: z.boolean().optional(),
  });
}

export function deleteCustomFieldSchema<T extends z.ZodTypeAny>(
  entityTypeSchema: T,
) {
  return z.object({
    companyId: z.string().uuid("Invalid company id"),
    entityType: entityTypeSchema,
    fieldId: z.string().min(1, "Invalid custom field id"),
  });
}

export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;
