import * as z from "zod";
import {
  optionalInput,
  companyScopeSchema,
  customDataSchema,
  createCustomFieldSchema,
  deleteCustomFieldSchema,
  customFieldTypeSchema,
} from "./shared";

// Table & Entity Types
export const fleetTableSchema = z.enum(["vehicles", "drivers", "maintenance"]);
export const fleetEntityTypeSchema = fleetTableSchema;

// Custom Field Types (Re-exporting shared)
export const fleetCustomFieldTypeSchema = customFieldTypeSchema;

// Standard Record Schemas
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

// Row Management Input Schemas
export const fleetCompanyScopeSchema = companyScopeSchema;
export const fleetCustomDataSchema = customDataSchema;

export const fleetTableViewInputSchema = fleetCompanyScopeSchema.extend({
  table: fleetTableSchema,
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(200).optional().default(50),
  search: optionalInput(z.string().max(120)),
});

// Custom Field Definition Input Schemas
export const fleetCreateCustomFieldInputSchema = createCustomFieldSchema(
  fleetEntityTypeSchema,
);

export const fleetUpdateCustomFieldInputSchema =
  fleetCreateCustomFieldInputSchema.extend({
    fieldId: z.string().min(1, "Invalid custom field id"),
  });

export const fleetDeleteCustomFieldInputSchema = deleteCustomFieldSchema(
  fleetEntityTypeSchema,
);

// Row CRUD Input Schemas
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

// Types
export type FleetTable = z.infer<typeof fleetTableSchema>;
export type FleetEntityType = z.infer<typeof fleetEntityTypeSchema>;
export type FleetCustomFieldType = z.infer<typeof fleetCustomFieldTypeSchema>;
export type FleetCreateRowInput = z.infer<typeof fleetCreateRowInputSchema>;
export type FleetUpdateRowInput = z.infer<typeof fleetUpdateRowInputSchema>;
