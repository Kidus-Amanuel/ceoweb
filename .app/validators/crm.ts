import { z } from "zod";
import {
  CRM_TABLE_PAGE_SIZE_DEFAULT,
  CRM_TABLE_PAGE_SIZE_MAX,
} from "@/lib/constants/crm-pagination";

const crmActivityTypeSchema = z.enum([
  "call",
  "email",
  "meeting",
  "note",
  "task",
]);
const crmDateTimeSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date/time");
const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;
const optionalInput = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());

const internationalPhoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!/^\+?[0-9 ()-]+$/.test(value)) return false;
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    },
    {
      message: "Please enter a valid international phone number.",
    },
  );
const dealContactInputSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      z.string().uuid().safeParse(value).success ||
      z.string().email().safeParse(value).success ||
      internationalPhoneSchema.safeParse(value).success,
    {
      message: "Contact must be a valid UUID, email, or phone number.",
    },
  );
const optionalNullableDateTimeInput = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.union([crmDateTimeSchema, z.null()]).optional(),
);

export const crmTableSchema = z.enum(["customers", "deals", "activities"]);
export const crmEntityTypeSchema = z.enum(["customers", "deals", "activities"]);
export const crmCustomFieldTypeSchema = z.enum([
  "text",
  "number",
  "date",
  "datetime",
  "select",
  "boolean",
  "currency",
  "phone",
  "email",
]);

export const crmCompanyScopeSchema = z.object({
  companyId: z.string().uuid("Invalid company id"),
});

const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const jsonValueSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const crmCustomDataSchema = z
  .record(z.string(), jsonValueSchema)
  .default({});

export const crmCustomerStandardSchema = z.object({
  name: optionalInput(z.string().min(1).max(255)),
  email: optionalInput(z.string().email()),
  phone: optionalInput(internationalPhoneSchema.max(120)),
  type: optionalInput(z.enum(["person", "company"])),
  status: optionalInput(z.string().max(120)),
  assignedTo: optionalInput(z.string().uuid()),
  assigned_to: optionalInput(z.string().uuid()),
});

export const crmDealStandardSchema = z.object({
  customerId: optionalInput(z.string().uuid()),
  customer_id: optionalInput(z.string().uuid()),
  contactId: optionalInput(dealContactInputSchema),
  contact_id: optionalInput(dealContactInputSchema),
  title: optionalInput(z.string().min(1).max(255)),
  description: optionalInput(z.string().max(5000)),
  value: optionalInput(z.coerce.number().nonnegative()),
  stage: optionalInput(
    z.enum([
      "lead",
      "qualified",
      "proposal",
      "negotiation",
      "closed_won",
      "closed_lost",
    ]),
  ),
  probability: optionalInput(z.coerce.number().int().min(0).max(100)),
  expectedCloseDate: optionalInput(z.string().date()),
  expected_close_date: optionalInput(z.string().date()),
  assignedTo: optionalInput(z.string().uuid()),
  assigned_to: optionalInput(z.string().uuid()),
});

export const crmActivityStandardSchema = z.object({
  related_type: optionalInput(z.enum(["customer", "deal"])),
  related_id: optionalInput(z.string().uuid()),
  activity_type: optionalInput(crmActivityTypeSchema),
  status: optionalInput(z.string().max(120)),
  subject: optionalInput(z.string().max(255)),
  notes: optionalInput(z.string().max(5000)),
  due_date: optionalNullableDateTimeInput,
  completed_at: optionalNullableDateTimeInput,
  relatedType: optionalInput(z.enum(["customer", "deal"])),
  relatedId: optionalInput(z.string().uuid()),
  activityType: optionalInput(crmActivityTypeSchema),
  dueDate: optionalNullableDateTimeInput,
  completedAt: optionalNullableDateTimeInput,
});

export const crmTableViewInputSchema = crmCompanyScopeSchema.extend({
  table: crmTableSchema,
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(CRM_TABLE_PAGE_SIZE_MAX)
    .optional()
    .default(CRM_TABLE_PAGE_SIZE_DEFAULT),
  search: optionalInput(z.string().max(120)),
});

export const crmCreateCustomFieldInputSchema = crmCompanyScopeSchema.extend({
  entityType: crmEntityTypeSchema,
  fieldLabel: z.string().min(1).max(120),
  fieldName: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .optional(),
  fieldType: crmCustomFieldTypeSchema,
  fieldOptions: z.array(z.string().min(1)).optional(),
  isRequired: z.boolean().optional(),
});

export const crmUpdateCustomFieldInputSchema =
  crmCreateCustomFieldInputSchema.extend({
    fieldId: z.string().min(1, "Invalid custom field id"),
  });

export const crmDeleteCustomFieldInputSchema = crmCompanyScopeSchema.extend({
  fieldId: z.string().min(1, "Invalid custom field id"),
});

export const crmCreateRowInputSchema = z.discriminatedUnion("table", [
  crmCompanyScopeSchema.extend({
    table: z.literal("customers"),
    standardData: crmCustomerStandardSchema,
    customData: crmCustomDataSchema.optional(),
  }),
  crmCompanyScopeSchema.extend({
    table: z.literal("deals"),
    standardData: crmDealStandardSchema,
    customData: crmCustomDataSchema.optional(),
  }),
  crmCompanyScopeSchema.extend({
    table: z.literal("activities"),
    standardData: crmActivityStandardSchema,
    customData: crmCustomDataSchema.optional(),
  }),
]);

export const crmUpdateRowInputSchema = z.discriminatedUnion("table", [
  crmCompanyScopeSchema.extend({
    table: z.literal("customers"),
    rowId: z.string().uuid("Invalid row id"),
    expectedUpdatedAt: optionalInput(crmDateTimeSchema),
    standardData: crmCustomerStandardSchema,
    customData: crmCustomDataSchema.optional(),
  }),
  crmCompanyScopeSchema.extend({
    table: z.literal("deals"),
    rowId: z.string().uuid("Invalid row id"),
    expectedUpdatedAt: optionalInput(crmDateTimeSchema),
    standardData: crmDealStandardSchema,
    customData: crmCustomDataSchema.optional(),
  }),
  crmCompanyScopeSchema.extend({
    table: z.literal("activities"),
    rowId: z.string().uuid("Invalid row id"),
    expectedUpdatedAt: optionalInput(crmDateTimeSchema),
    standardData: crmActivityStandardSchema,
    customData: crmCustomDataSchema.optional(),
  }),
]);

export const crmDeleteRowInputSchema = crmTableViewInputSchema.extend({
  rowId: z.string().uuid("Invalid row id"),
});

export type CrmTable = z.infer<typeof crmTableSchema>;
export type CrmEntityType = z.infer<typeof crmEntityTypeSchema>;
export type CrmCustomFieldType = z.infer<typeof crmCustomFieldTypeSchema>;
export type CrmCreateRowInput = z.infer<typeof crmCreateRowInputSchema>;
export type CrmUpdateRowInput = z.infer<typeof crmUpdateRowInputSchema>;
