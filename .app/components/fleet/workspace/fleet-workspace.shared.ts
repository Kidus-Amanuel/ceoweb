import { Truck, Users, Wrench } from "lucide-react";
import type { VirtualColumn } from "@/components/shared/table/EditableTable";
import { FleetTable, FleetEntityType } from "@/validators/fleet";

export type FleetDataTable = "vehicles" | "drivers" | "maintenance";
export type RawRow = Record<string, unknown> & {
  id: string;
  custom_fields?: Record<string, unknown>;
};

export type SelectOption = { label: string; value: string };
export type RelationalSets = {
  drivers: SelectOption[];
  vehicleTypes: SelectOption[];
  vehicles: SelectOption[];
};

export const VIEW_META = {
  vehicles: {
    title: "Vehicles",
    icon: Truck,
    iconClass: "text-blue-500",
  },
  drivers: {
    title: "Drivers",
    icon: Users,
    iconClass: "text-green-500",
  },
  maintenance: {
    title: "Maintenance",
    icon: Wrench,
    iconClass: "text-amber-500",
  },
} as const;

export const tableToEntity = (table: FleetDataTable): FleetEntityType => table;

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

export const normalizeRowForGrid = (
  table: FleetTable,
  row: RawRow,
): Record<string, unknown> => ({
  ...row,
  customValues: asRecord(row.custom_fields),
});

export const mapFieldType = (value: string): VirtualColumn["type"] => {
  if (value === "number") return "number";
  if (value === "select") return "select";
  if (value === "status") return "status";
  if (value === "boolean") return "boolean";
  if (value === "date") return "date";
  if (value === "datetime") return "datetime";
  if (value === "currency") return "currency";
  return "text";
};

export const normalizeFieldOptions = (
  type: VirtualColumn["type"],
  options: { label: string; value: string | number }[] | undefined,
) => {
  const raw = (options ?? [])
    .map((option) => String(option.value ?? option.label).trim())
    .filter(Boolean);
  if (!raw.length) return undefined;

  const seen = new Set<string>();
  return raw.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const fleetViewHelpers = {
  getStandardColumns: (table: FleetDataTable, relations: RelationalSets) => {
    const driverMeta = relations.drivers.length
      ? { type: "select" as const, options: relations.drivers }
      : { type: "text" as const };
    const vehicleMeta = relations.vehicles.length
      ? { type: "select" as const, options: relations.vehicles }
      : { type: "text" as const };
    const typeMeta = relations.vehicleTypes.length
      ? { type: "select" as const, options: relations.vehicleTypes }
      : { type: "text" as const };

    if (table === "vehicles") {
      return [
        { header: "Vehicle #", accessorKey: "vehicle_number" },
        { header: "Make", accessorKey: "make" },
        { header: "Model", accessorKey: "model" },
        { header: "Plate", accessorKey: "license_plate" },
        {
          header: "Year",
          accessorKey: "year",
          meta: { type: "number" as const },
        },
        {
          header: "Driver",
          accessorKey: "assigned_driver_id",
          meta: driverMeta,
        },
        {
          header: "Status",
          accessorKey: "status",
          meta: {
            type: "select" as const,
            options: [
              { label: "Active", value: "active" },
              { label: "Maintenance", value: "maintenance" },
              { label: "Retired", value: "retired" },
            ],
          },
        },
      ];
    }

    if (table === "drivers") {
      return [
        { header: "License #", accessorKey: "license_number" },
        {
          header: "Expiry",
          accessorKey: "license_expiry",
          meta: { type: "date" as const },
        },
        { header: "Status", accessorKey: "status" },
      ];
    }

    return [
      { header: "Vehicle", accessorKey: "vehicle_id", meta: vehicleMeta },
      { header: "Service Type", accessorKey: "service_type" },
      {
        header: "Date",
        accessorKey: "service_date",
        meta: { type: "date" as const },
      },
      {
        header: "Cost",
        accessorKey: "cost",
        meta: { type: "currency" as const },
      },
      {
        header: "Status",
        accessorKey: "status",
        meta: {
          type: "select" as const,
          options: [
            { label: "Planned", value: "planned" },
            { label: "In Progress", value: "in_progress" },
            { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
          ],
        },
      },
    ];
  },

  serializeStandardData: (
    table: FleetDataTable,
    payload: Record<string, unknown>,
  ) => {
    if (table === "vehicles") {
      return {
        vehicle_number: String(payload.vehicle_number || ""),
        make: payload.make ? String(payload.make) : undefined,
        model: payload.model ? String(payload.model) : undefined,
        year: payload.year ? Number(payload.year) : undefined,
        vin: payload.vin ? String(payload.vin) : undefined,
        license_plate: payload.license_plate
          ? String(payload.license_plate)
          : undefined,
        status: payload.status as any,
        assigned_driver_id: payload.assigned_driver_id as string,
        vehicle_type_id: payload.vehicle_type_id as string,
      };
    }
    if (table === "drivers") {
      return {
        employee_id: payload.employee_id as string,
        license_number: payload.license_number
          ? String(payload.license_number)
          : undefined,
        license_expiry: payload.license_expiry
          ? String(payload.license_expiry)
          : undefined,
        status: payload.status ? String(payload.status) : undefined,
      };
    }
    return {
      vehicle_id: payload.vehicle_id as string,
      service_type: String(payload.service_type || ""),
      description: payload.description
        ? String(payload.description)
        : undefined,
      service_date: String(payload.service_date || ""),
      cost: payload.cost ? Number(payload.cost) : undefined,
      next_due_date: payload.next_due_date
        ? String(payload.next_due_date)
        : undefined,
      odometer_reading: payload.odometer_reading
        ? Number(payload.odometer_reading)
        : undefined,
      status: payload.status as any,
    };
  },
};
