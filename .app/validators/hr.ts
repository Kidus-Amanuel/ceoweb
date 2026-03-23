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
export const hrTableSchema = z.enum([
  "employees",
  "departments",
  "positions",
  "attendance",
  "leaves",
  "leave_types",
  "payroll_runs",
  "payslips",
]);
export const hrEntityTypeSchema = hrTableSchema;

// Custom Field Types
export const hrCustomFieldTypeSchema = customFieldTypeSchema;

// Row Management Input Schemas
export const hrCompanyScopeSchema = companyScopeSchema;
export const hrCustomDataSchema = customDataSchema;

export const hrTableViewInputSchema = hrCompanyScopeSchema.extend({
  table: hrTableSchema,
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(200).optional().default(50),
  search: optionalInput(z.string().max(120)),
});

// Custom Field Definition Input Schemas
export const hrCreateCustomFieldInputSchema =
  createCustomFieldSchema(hrEntityTypeSchema);

export const hrUpdateCustomFieldInputSchema =
  hrCreateCustomFieldInputSchema.extend({
    fieldId: z.string().min(1, "Invalid custom field id"),
  });

export const hrDeleteCustomFieldInputSchema =
  deleteCustomFieldSchema(hrEntityTypeSchema);

// Standard Record Schemas (Partial definitions for common updates)
export const employeeStandardSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: optionalInput(z.string().email()),
  employee_code: z.string().min(1),
  department_id: optionalInput(z.string().uuid().nullable()),
  position_id: optionalInput(z.string().uuid().nullable()),
  status: optionalInput(z.string()),
  hire_date: optionalInput(z.string()),
  basic_salary: optionalInput(z.coerce.number().nonnegative()),
});

export const leaveTypeStandardSchema = z.object({
  name: z.string().min(1),
  paid: z.boolean().optional().default(true),
  days_per_year: z.coerce.number().int().optional(),
  carry_over: z.boolean().optional().default(false),
});

export const leaveStandardSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  days_taken: z.coerce.number(),
  reason: optionalInput(z.string()),
  status: z
    .enum(["pending", "approved", "rejected"])
    .optional()
    .default("pending"),
});

// Types
export type HRTable = z.infer<typeof hrTableSchema>;
export type HREntityType = z.infer<typeof hrEntityTypeSchema>;
export type HRCustomFieldType = z.infer<typeof hrCustomFieldTypeSchema>;
