import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalInput = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional().catch(undefined));

export const fleetTableSchema = z.enum(["vehicles", "drivers", "maintenance"]);
export const fleetEntityTypeSchema = z.enum([
  "vehicles",
  "drivers",
  "maintenance",
]);

export const fleetCustomFieldTypeSchema = z.enum([
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

export const fleetCompanyScopeSchema = z.object({
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

export const fleetCustomDataSchema = z
  .record(z.string(), jsonValueSchema)
  .default({});

export const vehicleStandardSchema = z.object({
  vehicle_number: z.string().min(1).max(255),
  make: optionalInput(z.string().min(1).max(255)),
  model: optionalInput(z.string().min(1).max(255)),
  year: optionalInput(z.coerce.number().int().min(1900)),
  vin: optionalInput(z.string().max(255)),
  license_plate: optionalInput(z.string().max(255)),
  status: optionalInput(z.enum(["active", "maintenance", "retired"])),
  assigned_driver_id: optionalInput(z.string().uuid().nullable()),
  vehicle_type_id: optionalInput(z.string().uuid().nullable()),
});

export const driverStandardSchema = z.object({
  driver_id: z.string().uuid(),
  vehicle_id: optionalInput(z.string().uuid().nullable()),
  start_date: z.string().date().optional(),
  end_date: optionalInput(z.string().date().nullable()),
  notes: optionalInput(z.string().max(5000)),
});

export const maintenanceStandardSchema = z.object({
  vehicle_id: z.string().uuid(),
  maintenance_date: z.string().date().optional(),
  type: optionalInput(z.string().max(120)),
  description: optionalInput(z.string().max(5000)),
  cost: optionalInput(z.coerce.number().nonnegative().nullable()),
  odometer_reading: optionalInput(
    z.coerce.number().int().nonnegative().nullable(),
  ),
  performed_by: optionalInput(z.string().max(255)),
  next_due_date: optionalInput(z.string().date().nullable()),
  notes: optionalInput(z.string().max(5000)),
});

export const fleetTableViewInputSchema = fleetCompanyScopeSchema.extend({
  table: fleetTableSchema,
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(200).optional().default(50),
  search: optionalInput(z.string().max(120)),
});

export const fleetCreateCustomFieldInputSchema = fleetCompanyScopeSchema.extend(
  {
    entityType: fleetEntityTypeSchema,
    fieldLabel: z.string().min(1).max(120),
    fieldName: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/)
      .optional(),
    fieldType: fleetCustomFieldTypeSchema,
    fieldOptions: z.array(z.string().min(1)).optional(),
    isRequired: z.boolean().optional(),
  },
);

export const fleetUpdateCustomFieldInputSchema =
  fleetCreateCustomFieldInputSchema.extend({
    fieldId: z.string().min(1, "Invalid custom field id"),
  });

export const fleetDeleteCustomFieldInputSchema = fleetCompanyScopeSchema.extend(
  {
    fieldId: z.string().min(1, "Invalid custom field id"),
  },
);

export const fleetCreateRowInputSchema = z.discriminatedUnion("table", [
  fleetCompanyScopeSchema.extend({
    table: z.literal("vehicles"),
    standardData: vehicleStandardSchema,
    customData: fleetCustomDataSchema.optional(),
  }),
  fleetCompanyScopeSchema.extend({
    table: z.literal("drivers"),
    standardData: driverStandardSchema,
    customData: fleetCustomDataSchema.optional(),
  }),
  fleetCompanyScopeSchema.extend({
    table: z.literal("maintenance"),
    standardData: maintenanceStandardSchema,
    customData: fleetCustomDataSchema.optional(),
  }),
]);

export const fleetUpdateRowInputSchema = z.discriminatedUnion("table", [
  fleetCompanyScopeSchema.extend({
    table: z.literal("vehicles"),
    rowId: z.string().uuid("Invalid row id"),
    standardData: vehicleStandardSchema.partial(),
    customData: fleetCustomDataSchema.optional(),
  }),
  fleetCompanyScopeSchema.extend({
    table: z.literal("drivers"),
    rowId: z.string().uuid("Invalid row id"),
    standardData: driverStandardSchema.partial(),
    customData: fleetCustomDataSchema.optional(),
  }),
  fleetCompanyScopeSchema.extend({
    table: z.literal("maintenance"),
    rowId: z.string().uuid("Invalid row id"),
    standardData: maintenanceStandardSchema.partial(),
    customData: fleetCustomDataSchema.optional(),
  }),
]);

export const fleetDeleteRowInputSchema = fleetTableViewInputSchema.extend({
  rowId: z.string().uuid("Invalid row id"),
});

export type FleetTable = z.infer<typeof fleetTableSchema>;
export type FleetEntityType = z.infer<typeof fleetEntityTypeSchema>;
export type FleetCustomFieldType = z.infer<typeof fleetCustomFieldTypeSchema>;
export type FleetCreateRowInput = z.infer<typeof fleetCreateRowInputSchema>;
export type FleetUpdateRowInput = z.infer<typeof fleetUpdateRowInputSchema>;
