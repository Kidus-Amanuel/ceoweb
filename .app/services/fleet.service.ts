import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { FleetEntityType, FleetCustomFieldType } from "@/validators/fleet";

export interface TraccarUserPayload {
  name: string;
  email: string;
  password?: string;
  readonly?: boolean;
  deviceReadonly?: boolean;
  limitCommands?: boolean;
}

export interface TraccarDevicePayload {
  name: string;
  uniqueId: string;
}

export interface FleetCustomFieldPayload {
  entityType: FleetEntityType;
  fieldName: string;
  fieldLabel: string;
  fieldType: FleetCustomFieldType;
  fieldOptions?: string[];
  isRequired?: boolean;
}

export interface FleetColumnDefinition {
  id: string;
  entity_type: FleetEntityType;
  field_name: string;
  field_label: string;
  field_type: FleetCustomFieldType;
  field_options: string[] | null;
  is_required: boolean;
  is_active: boolean;
}

export type FleetMetadata = Partial<
  Record<FleetEntityType, FleetColumnDefinition[]>
>;

type ServiceResult<T> = {
  data?: T;
  error?: string;
};

// Helper utilities similar to CRMService
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

const hasMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
};

const getUsedOptionValue = (
  fieldType: FleetCustomFieldType,
  value: unknown,
): string | null => {
  if (!hasMeaningfulValue(value)) return null;
  return String(value).trim();
};

const normalizeOptionValues = (
  fieldType: FleetCustomFieldType,
  values: string[] | undefined,
) => {
  const normalized = (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (fieldType === "currency" ? value.toUpperCase() : value));
  const seen = new Set<string>();
  return normalized.filter((value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toColumnDefinition = (
  input: Partial<FleetColumnDefinition> &
    Pick<FleetColumnDefinition, "entity_type" | "field_name">,
): FleetColumnDefinition => ({
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

const normalizeMetadata = (settings: unknown): FleetMetadata => {
  const parsedSettings = asRecord(settings);
  const rawMetadata = asRecord(parsedSettings.fleet_metadata);

  const metadata: FleetMetadata = {};
  for (const entityType of ["vehicles", "drivers", "maintenance"] as const) {
    const values = rawMetadata[entityType];
    if (!Array.isArray(values)) {
      metadata[entityType] = [];
      continue;
    }

    metadata[entityType] = values
      .map((entry) =>
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? toColumnDefinition({
              ...(entry as Partial<FleetColumnDefinition>),
              entity_type: entityType,
              field_name:
                typeof (entry as Partial<FleetColumnDefinition>).field_name ===
                "string"
                  ? (entry as Partial<FleetColumnDefinition>).field_name!
                  : "",
            })
          : null,
      )
      .filter((entry): entry is FleetColumnDefinition =>
        Boolean(entry && entry.field_name),
      );
  }

  return metadata;
};

const applyMetadataToSettings = (
  settings: unknown,
  metadata: FleetMetadata,
) => {
  const parsedSettings = asRecord(settings);
  return {
    ...parsedSettings,
    fleet_metadata: {
      ...asRecord(parsedSettings.fleet_metadata),
      ...metadata,
    },
  };
};

export class FleetService {
  private static readonly TRACCAR_URL =
    process.env.TRACCAR_URL || "http://localhost:8082";
  private static readonly TRACCAR_ADMIN_EMAIL =
    process.env.TRACCAR_ADMIN_EMAIL || "admin";
  private static readonly TRACCAR_ADMIN_PASSWORD =
    process.env.TRACCAR_ADMIN_PASSWORD || "admin";

  /**
   * Generates Basic Auth header for administrative API calls to Traccar
   */
  private static getAdminAuthHeader(): string {
    const credentials = `${this.TRACCAR_ADMIN_EMAIL}:${this.TRACCAR_ADMIN_PASSWORD}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  /**
   * Helper to make Traccar API calls
   */
  private static async fetchTraccar(
    endpoint: string,
    options: RequestInit = {},
  ) {
    const url = `${this.TRACCAR_URL}/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    // Merge default headers with provided options
    const headers = new Headers(options.headers || {});
    if (!headers.has("Authorization")) {
      headers.set("Authorization", this.getAdminAuthHeader());
    }
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.text();
        if (errorData) errorMessage = errorData;
      } catch (e) {
        // ignore
      }
      throw new Error(
        `Traccar API Error (${response.status}): ${errorMessage}`,
      );
    }

    // Some Traccar endpoints (like DELETE) return 204 No Content
    if (response.status === 204) return null;

    // Some return text instead of JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  /**
   * 1. Creates a new Traccar User (Tenant mapping)
   */
  public static async createTraccarUser(payload: TraccarUserPayload) {
    // Force some security defaults for ERP tenant users
    const userPayload = {
      ...payload,
      readonly: payload.readonly ?? true,
      deviceReadonly: payload.deviceReadonly ?? true,
      limitCommands: payload.limitCommands ?? true,
    };

    return this.fetchTraccar("/users", {
      method: "POST",
      body: JSON.stringify(userPayload),
    });
  }

  /**
   * 2. Gets a short-lived Session Token for specific Traccar user to use in the Iframe
   */
  public static async getSessionToken(userId: number, expirationDate?: string) {
    const params = new URLSearchParams();
    // Default expiration to 12 hours from now if not provided
    if (expirationDate) {
      params.append("expiration", expirationDate);
    } else {
      const expiration = new Date();
      expiration.setHours(expiration.getHours() + 12);
      params.append("expiration", expiration.toISOString());
    }

    // Notice we use the standard token generation endpoint.
    // If we want it for a specific user, we might need a workaround if Traccar
    // strictly generates tokens for the currently authenticated user.
    // In our architecture, Traccar allows generating tokens by passing userId as parameter as an admin,
    // or we must impersonate them.
    // Traccar standard API typically supports `userId` param for admins on /api/session/token
    params.append("userId", userId.toString());

    const tokenResponse = await this.fetchTraccar(`/session/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    return typeof tokenResponse === "string"
      ? tokenResponse
      : tokenResponse.token;
  }

  /**
   * 3. Creates a new Device in Traccar
   */
  public static async createDevice(payload: TraccarDevicePayload) {
    return this.fetchTraccar("/devices", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * 4. Updates an existing Device in Traccar
   */
  public static async updateDevice(
    deviceId: number,
    payload: TraccarDevicePayload,
  ) {
    return this.fetchTraccar(`/devices/${deviceId}`, {
      method: "PUT",
      body: JSON.stringify({
        ...payload,
        id: deviceId,
      }),
    });
  }

  /**
   * 5. Deletes a Device from Traccar
   */
  public static async deleteDevice(deviceId: number) {
    return this.fetchTraccar(`/devices/${deviceId}`, {
      method: "DELETE",
    });
  }

  /**
   * 6. Gets all devices from Traccar (optional filtering)
   */
  public static async getDevices(params?: URLSearchParams) {
    const endpoint = params ? `/devices?${params.toString()}` : "/devices";
    return this.fetchTraccar(endpoint);
  }

  /**
   * 7. Gets latest positions for all devices
   */
  public static async getPositions() {
    return this.fetchTraccar("/positions");
  }

  /**
   * 8. Assigns a Device to a specific Traccar User
   */
  public static async assignDeviceToUser(deviceId: number, userId: number) {
    return this.fetchTraccar("/permissions", {
      method: "POST",
      body: JSON.stringify({ deviceId, userId }),
    });
  }

  /**
   * PHASES 2 & 5: Fleet Sync & Intelligence
   */

  /**
   * Internal helper to ensure a Traccar tenant exists for a company
   */
  private static async getOrCreateTenantMapping(
    supabase: any,
    companyId: string,
  ) {
    const { data: mapping, error } = await supabase
      .from("traccar_tenant_mappings")
      .select("traccar_user_id")
      .eq("company_id", companyId)
      .single();

    if (mapping) return mapping.traccar_user_id;

    // Auto-provision
    const newTraccarUser = await this.createTraccarUser({
      name: `Company_${companyId.substring(0, 8)}_Fleet_Admin`,
      email: `${companyId}@erp-system.local`,
      password: crypto.randomUUID(),
    });

    const { data: newMapping, error: insertError } = await supabase
      .from("traccar_tenant_mappings")
      .insert({
        company_id: companyId,
        traccar_user_id: newTraccarUser.id,
      })
      .select("traccar_user_id")
      .single();

    if (insertError) throw insertError;
    return newMapping.traccar_user_id;
  }

  /**
   * Syncs an ERP Vehicle to Traccar.
   * Resolves existing devices by uniqueId to prevent duplicates.
   */
  public static async syncVehicleToTraccar(vehicleId: string) {
    const supabase = await createClient();

    // 1. Get vehicle and identifiers
    const { data: vehicle, error: vError } = await supabase
      .from("vehicles")
      .select("*, vehicle_types(name)")
      .eq("id", vehicleId)
      .single();

    if (vError || !vehicle) throw new Error("Vehicle not found");

    const gpsId = vehicle.custom_fields?.gps_id;
    const plate = vehicle.license_plate;

    // Identifier for Traccar is strictly GPS ID if available, else we can't track it
    const uniqueId = gpsId || plate;

    if (!uniqueId) {
      console.log(
        `[FleetService] Skipping Traccar sync for vehicle ${vehicleId} (No GPS ID or Plate).`,
      );
      return null;
    }

    const traccarName = plate || vehicle.vehicle_number || uniqueId;
    const traccarUserId = await this.getOrCreateTenantMapping(
      supabase,
      vehicle.company_id,
    );

    // 2. Resolve Mapping or Find existing device in Traccar
    let traccarDeviceId: number | null = null;
    const { data: deviceMapping } = await supabase
      .from("traccar_device_mappings")
      .select("traccar_device_id")
      .eq("erp_vehicle_id", vehicleId)
      .single();

    if (deviceMapping) {
      traccarDeviceId = deviceMapping.traccar_device_id;
    } else {
      // Try to find by uniqueId in Traccar directly
      console.log(
        `[FleetService] No mapping for ${vehicleId}, searching Traccar for uniqueId: ${uniqueId}`,
      );
      try {
        const search = await this.getDevices(new URLSearchParams({ uniqueId }));
        if (Array.isArray(search) && search.length > 0) {
          traccarDeviceId = search[0].id;
          console.log(
            `[FleetService] Found existing device in Traccar by identity: ${traccarDeviceId}`,
          );
        }
      } catch (e) {
        console.warn(`[FleetService] Search failed for ${uniqueId}`);
      }
    }

    if (traccarDeviceId) {
      // Update existing
      console.log(
        `[FleetService] Updating Traccar device ${traccarDeviceId} (name: ${traccarName}, uniqueId: ${uniqueId})`,
      );
      await this.updateDevice(traccarDeviceId, {
        name: traccarName,
        uniqueId: uniqueId,
      });
    } else {
      // Create new
      console.log(
        `[FleetService] Creating new Traccar device (name: ${traccarName}, uniqueId: ${uniqueId})`,
      );
      const traccarDevice = await this.createDevice({
        name: traccarName,
        uniqueId: uniqueId,
      });
      traccarDeviceId = traccarDevice.id;
    }

    // 3. Ensure permissions and mapping
    try {
      await this.assignDeviceToUser(traccarDeviceId!, traccarUserId);
    } catch (permError) {
      // ignore if already assigned
    }

    await supabase.from("traccar_device_mappings").upsert(
      {
        company_id: vehicle.company_id,
        erp_vehicle_id: vehicle.id,
        traccar_device_id: traccarDeviceId,
        sync_status: "synced",
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: "erp_vehicle_id" },
    );

    return traccarDeviceId;
  }

  /**
   * Deletes a vehicle mapping and the device in Traccar.
   * Includes fallback to search by uniqueId if mapping is missing.
   */
  public static async deleteVehicleFromTraccar(vehicleId: string) {
    const supabase = await createClient();

    // 1. Get identifiers from CEO for cleanup search
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();
    const identifiers = vehicle
      ? [vehicle.custom_fields?.gps_id, vehicle.license_plate].filter(Boolean)
      : [];

    // 2. Try mapping first
    const { data: mapping } = await supabase
      .from("traccar_device_mappings")
      .select("traccar_device_id")
      .eq("erp_vehicle_id", vehicleId)
      .single();

    let deletedFromTraccar = false;

    if (mapping) {
      console.log(
        `[FleetService] Deleting Traccar device by mapping: ${mapping.traccar_device_id}`,
      );
      try {
        await this.deleteDevice(mapping.traccar_device_id);
        deletedFromTraccar = true;
      } catch (traccarError) {
        console.warn(
          `[FleetService] Mapping delete failed, item might be gone or ID changed. Trying identifier search.`,
        );
      }
    }

    // 3. Fallback: Search Traccar by known identifiers (GPS ID or Plate)
    if (!deletedFromTraccar) {
      for (const uniqueId of identifiers) {
        try {
          console.log(
            `[FleetService] Searching Traccar for uniqueId ${uniqueId} to delete...`,
          );
          const search = await this.getDevices(
            new URLSearchParams({ uniqueId }),
          );
          if (Array.isArray(search) && search.length > 0) {
            await this.deleteDevice(search[0].id);
            console.log(
              `[FleetService] Successfully deleted Traccar device ${search[0].id} found via identifier.`,
            );
            deletedFromTraccar = true;
            break;
          }
        } catch (e) {
          // continue
        }
      }
    }

    // 4. Cleanup mapping table
    await supabase
      .from("traccar_device_mappings")
      .delete()
      .eq("erp_vehicle_id", vehicleId);
    console.log(`[FleetService] Finished cleanup for vehicle ${vehicleId}`);
  }

  /**
   * Generates a high-level fleet summary for AI agent consumption.
   */
  public static async getFleetSummary(companyId: string) {
    const supabase = await createClient();

    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select(
        "vehicle_number, status, last_known_lat, last_known_lng, last_location_at, ignition_status",
      )
      .eq("company_id", companyId);

    if (error) throw error;

    const maintenanceCount = vehicles.filter(
      (v: { status: string }) => v.status === "maintenance",
    ).length;
    const activeCount = vehicles.filter(
      (v: { status: string }) => v.status === "active",
    ).length;

    return {
      total_vehicles: vehicles.length,
      active: activeCount,
      in_maintenance: maintenanceCount,
      details: vehicles.map((v: any) => ({
        id: v.vehicle_number,
        status: v.status,
        last_seen: v.last_location_at,
        is_moving: v.ignition_status,
        has_gps: !!(v.last_known_lat && v.last_known_lng),
      })),
    };
  }

  // ─── Maintenance ────────────────────────────────────────────────────────────

  /**
   * Fetches all Traccar maintenance schedules (tc_maintenances) for reference.
   * These are the global service intervals defined in the Traccar system.
   */
  public static async getTraccarMaintenanceSchedules() {
    // Traccar exposes maintenances via /api/maintenance
    return this.fetchTraccar("/maintenance");
  }

  /**
   * Fetches Traccar maintenance schedules assigned to a specific device.
   * Useful for enriching CEO DB maintenance records with Traccar service intervals.
   */
  public static async getTraccarDeviceMaintenances(deviceId: number) {
    return this.fetchTraccar(`/maintenance?deviceId=${deviceId}`);
  }

  /**
   * Returns a comprehensive maintenance cost summary per vehicle for AI / reporting.
   */
  public static async getMaintenanceSummary(companyId: string) {
    const supabase = await createClient();

    const { data: records, error } = await supabase
      .from("vehicle_maintenance")
      .select(
        `
        id,
        vehicle_id,
        type,
        cost,
        maintenance_date,
        next_due_date,
        vehicles ( vehicle_number, make, model, license_plate )
      `,
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("maintenance_date", { ascending: false });

    if (error) throw error;

    const now = new Date();
    const totalCost = records.reduce(
      (s: number, r: any) => s + (r.cost ?? 0),
      0,
    );
    const overdue = records.filter(
      (r: any) => r.next_due_date && new Date(r.next_due_date) < now,
    );

    return {
      total_records: records.length,
      total_cost: totalCost,
      overdue_count: overdue.length,
      overdue_vehicles: overdue.map((r: any) => ({
        vehicle_number: r.vehicles?.vehicle_number,
        next_due_date: r.next_due_date,
      })),
      by_type: ["routine", "repair", "inspection", "emergency"].map((t) => ({
        type: t,
        count: records.filter((r: any) => r.type === t).length,
        cost: records
          .filter((r: any) => r.type === t)
          .reduce((s: number, r: any) => s + (r.cost ?? 0), 0),
      })),
    };
  }

  // ─── Custom Fields & Dynamic Columns ───────────────────────────────────────

  /**
   * Fetches column definitions (standard + custom) for a fleet entity type.
   */
  public static async getColumnDefinitions({
    supabase,
    companyId,
    entityType,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: FleetEntityType;
  }): Promise<ServiceResult<FleetColumnDefinition[]>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!company) return { data: [] };

    const metadata = normalizeMetadata(company.settings);
    return {
      data: (metadata[entityType] ?? []).filter((entry) => entry.is_active),
    };
  }

  /**
   * Internal helper to persist a column definition to company settings.
   */
  private static async saveColumnDefinition({
    supabase,
    companyId,
    entityType,
    column,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: FleetEntityType;
    column: Partial<FleetColumnDefinition> & {
      field_name?: string;
      field_label?: string;
      field_type?: FleetCustomFieldType;
      field_options?: string[] | null;
      is_required?: boolean;
      is_active?: boolean;
    };
  }): Promise<ServiceResult<FleetColumnDefinition>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!company) return { error: "Company settings not found." };

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
      .eq("id", companyId)
      .is("deleted_at", null);

    if (updateError) return { error: updateError.message };

    return { data: next };
  }

  /**
   * Lists all active custom fields for a fleet entity type.
   */
  public static async listCustomFields({
    supabase,
    companyId,
    entityType,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: FleetEntityType;
  }): Promise<ServiceResult<Record<string, unknown>[]>> {
    const response = await this.getColumnDefinitions({
      supabase,
      companyId,
      entityType,
    });
    if (response.error) return { error: response.error };
    return {
      data: (response.data ?? []) as unknown as Record<string, unknown>[],
    };
  }

  /**
   * Creates a new custom field for a fleet entity type.
   */
  public static async createCustomField({
    supabase,
    companyId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    payload: FleetCustomFieldPayload;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const response = await this.saveColumnDefinition({
      supabase,
      companyId,
      entityType: payload.entityType,
      column: {
        field_name: payload.fieldName || toSnakeCase(payload.fieldLabel),
        field_label: payload.fieldLabel,
        field_type: payload.fieldType,
        field_options:
          payload.fieldType === "select" || payload.fieldType === "currency"
            ? normalizeOptionValues(
                payload.fieldType,
                payload.fieldOptions ?? [],
              )
            : null,
        is_required: payload.isRequired ?? false,
        is_active: true,
      },
    });

    if (response.error || !response.data) {
      return { error: response.error || "Failed to save custom field." };
    }

    return { data: response.data as unknown as Record<string, unknown> };
  }

  /**
   * Updates an existing custom field definition.
   */
  public static async updateCustomField({
    supabase,
    companyId,
    fieldId,
    payload,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    fieldId: string;
    payload: FleetCustomFieldPayload;
  }): Promise<ServiceResult<Record<string, unknown>>> {
    const defs = await this.getColumnDefinitions({
      supabase,
      companyId,
      entityType: payload.entityType,
    });
    if (defs.error) return { error: defs.error };

    const existing = (defs.data ?? []).find(
      (entry) => entry.id === fieldId || entry.field_name === fieldId,
    );
    if (!existing) return { error: "Custom field not found." };

    const isTypeChange = existing.field_type !== payload.fieldType;
    const optionBasedType =
      payload.fieldType === "select" || payload.fieldType === "currency";

    // Check if any rows already use this field before allowing type change
    const entityTable = FleetService.mapEntityToTable(payload.entityType);
    const { data: rows, error: rowsError } = await supabase
      .from(entityTable)
      .select("custom_fields")
      .eq("company_id", companyId)
      .is("deleted_at", null);

    if (rowsError) return { error: rowsError.message };

    const usedValues = new Set<string>();
    const hasAnyValue = (rows ?? []).some((row) => {
      const fieldValue = asRecord(row.custom_fields)[existing.field_name];
      const used = getUsedOptionValue(payload.fieldType, fieldValue);
      if (used) usedValues.add(used.toLowerCase());
      return hasMeaningfulValue(fieldValue);
    });

    if (isTypeChange && hasAnyValue) {
      return { error: "Cannot change data type when existing values exist." };
    }

    let nextOptions: string[] | null = null;
    if (optionBasedType) {
      const incomingOptions = normalizeOptionValues(
        payload.fieldType,
        payload.fieldOptions ?? [],
      );
      const existingOptions = normalizeOptionValues(
        payload.fieldType,
        existing.field_options ?? [],
      );
      const requestedOptions =
        incomingOptions.length > 0 ? incomingOptions : existingOptions;

      const requestedKeys = new Set(
        requestedOptions.map((v) => v.toLowerCase()),
      );
      const missingUsed = Array.from(usedValues).filter(
        (v) => !requestedKeys.has(v),
      );

      if (missingUsed.length > 0) {
        return {
          error: "Cannot remove options already used by existing rows.",
        };
      }
      nextOptions = requestedOptions;
    }

    const response = await this.saveColumnDefinition({
      supabase,
      companyId,
      entityType: payload.entityType,
      column: {
        ...existing,
        field_name: payload.fieldName || existing.field_name,
        field_label: payload.fieldLabel,
        field_type: payload.fieldType,
        field_options: nextOptions,
        is_required: payload.isRequired ?? false,
      },
    });

    if (response.error || !response.data) {
      return { error: response.error || "Failed to update custom field." };
    }

    return { data: response.data as unknown as Record<string, unknown> };
  }

  /**
   * Maps a fleet entity type to its corresponding database table name.
   */
  public static mapEntityToTable(entityType: FleetEntityType): string {
    switch (entityType) {
      case "vehicles":
        return "vehicles";
      case "drivers":
        return "driver_assignments";
      case "maintenance":
        return "vehicle_maintenance";
      default:
        return entityType;
    }
  }

  /**
   * Lists rows for a fleet table with optional search and pagination.
   * Handles entity-specific joining and shaping for complex views.
   */
  public static async listRows({
    supabase,
    companyId,
    entityType,
    page = 1,
    pageSize = 50,
    search,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    entityType: FleetEntityType;
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<
    ServiceResult<{ rows: Record<string, unknown>[]; count: number }>
  > {
    const table = this.mapEntityToTable(entityType);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query;
    if (entityType === "drivers") {
      // Driver assignments view with joined employee and vehicle details
      query = supabase
        .from("driver_assignments")
        .select(
          `
          id,
          start_date,
          end_date,
          notes,
          created_at,
          driver_id,
          vehicle_id,
          custom_fields,
          employees!driver_assignments_driver_id_fkey (
            id,
            first_name,
            last_name,
            email,
            job_title,
            employee_code
          ),
          vehicles!driver_assignments_vehicle_id_fkey (
            id,
            vehicle_number,
            make,
            model,
            license_plate
          )
        `,
          { count: "exact" },
        )
        .eq("company_id", companyId)
        .is("deleted_at", null);
    } else if (entityType === "maintenance") {
      // Vehicle maintenance view with vehicle details
      query = supabase
        .from("vehicle_maintenance")
        .select(
          `
          id,
          vehicle_id,
          maintenance_date,
          type,
          description,
          cost,
          odometer_reading,
          performed_by,
          next_due_date,
          notes,
          custom_fields,
          vehicles!vehicle_maintenance_vehicle_id_fkey (
            id,
            vehicle_number,
            make,
            model,
            license_plate
          )
        `,
          { count: "exact" },
        )
        .eq("company_id", companyId)
        .is("deleted_at", null);
    } else {
      // Standard table view
      query = supabase
        .from(table)
        .select("*", { count: "exact" })
        .eq("company_id", companyId)
        .is("deleted_at", null);
    }

    if (search) {
      const q = `%${search}%`;
      if (entityType === "vehicles") {
        query = query.or(
          `vehicle_number.ilike.${q},make.ilike.${q},model.ilike.${q},license_plate.ilike.${q}`,
        );
      } else if (entityType === "drivers") {
        query = query.or(`notes.ilike.${q}`);
        // Note: Joining and searching on related tables is more complex in Supabase JS client
        // For now we search notes, client-side search handles the rest or we add inner joins if needed
      } else if (entityType === "maintenance") {
        query = query.or(`description.ilike.${q},performed_by.ilike.${q}`);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return { error: error.message };

    // Shape the data for specific entities to match UI expectations
    let shapedData = data ?? [];
    if (entityType === "drivers") {
      shapedData = (data ?? []).map((a: any) => {
        const emp = a.employees;
        const veh = a.vehicles;
        return {
          ...a,
          driver_name: emp
            ? `${emp.first_name} ${emp.last_name}`.trim()
            : "Unknown",
          driver_email: emp?.email || "",
          driver_title: emp?.job_title || "",
          driver_code: emp?.employee_code || "",
          vehicle_label: veh ? `${veh.make} ${veh.model}` : null,
          vehicle_plate: veh?.license_plate || veh?.vehicle_number || "",
          vehicle_number: veh?.vehicle_number || "",
        };
      });
    } else if (entityType === "maintenance") {
      shapedData = (data ?? []).map((m: any) => {
        const veh = m.vehicles;
        return {
          ...m,
          vehicle_label: veh
            ? `${veh.make ?? ""} ${veh.model ?? ""}`.trim()
            : "",
          vehicle_plate: veh?.license_plate || "",
          vehicle_number: veh?.vehicle_number || "",
        };
      });
    }

    return { data: { rows: shapedData, count: count ?? 0 } };
  }

  /**
   * Deletes a custom field definition.
   */
  public static async deleteCustomField({
    supabase,
    companyId,
    fieldId,
  }: {
    supabase: SupabaseClient;
    companyId: string;
    fieldId: string;
  }): Promise<ServiceResult<null>> {
    const { data: company, error } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!company) return { data: null };

    const metadata = normalizeMetadata(company.settings);
    for (const entityType of ["vehicles", "drivers", "maintenance"] as const) {
      const values = metadata[entityType] ?? [];
      metadata[entityType] = values.filter(
        (entry) => entry.id !== fieldId && entry.field_name !== fieldId,
      );
    }

    const nextSettings = applyMetadataToSettings(company.settings, metadata);
    const { error: updateError } = await supabase
      .from("companies")
      .update({ settings: nextSettings })
      .eq("id", companyId)
      .is("deleted_at", null);

    if (updateError) return { error: updateError.message };

    return { data: null };
  }
}
