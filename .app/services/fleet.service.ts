import { createClient } from '@/lib/supabase/server';
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

export class FleetService {
  private static readonly TRACCAR_URL = process.env.TRACCAR_URL || 'http://localhost:8082';
  private static readonly TRACCAR_ADMIN_EMAIL = process.env.TRACCAR_ADMIN_EMAIL || 'admin';
  private static readonly TRACCAR_ADMIN_PASSWORD = process.env.TRACCAR_ADMIN_PASSWORD || 'admin';

  /**
   * Generates Basic Auth header for administrative API calls to Traccar
   */
  private static getAdminAuthHeader(): string {
    const credentials = `${this.TRACCAR_ADMIN_EMAIL}:${this.TRACCAR_ADMIN_PASSWORD}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  /**
   * Helper to make Traccar API calls
   */
  private static async fetchTraccar(endpoint: string, options: RequestInit = {}) {
    const url = `${this.TRACCAR_URL}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    // Merge default headers with provided options
    const headers = new Headers(options.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', this.getAdminAuthHeader());
    }
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
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
      throw new Error(`Traccar API Error (${response.status}): ${errorMessage}`);
    }

    // Some Traccar endpoints (like DELETE) return 204 No Content
    if (response.status === 204) return null;
    
    // Some return text instead of JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
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

    return this.fetchTraccar('/users', {
      method: 'POST',
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
      params.append('expiration', expirationDate);
    } else {
      const expiration = new Date();
      expiration.setHours(expiration.getHours() + 12);
      params.append('expiration', expiration.toISOString());
    }

    // Notice we use the standard token generation endpoint.
    // If we want it for a specific user, we might need a workaround if Traccar 
    // strictly generates tokens for the currently authenticated user.
    // In our architecture, Traccar allows generating tokens by passing userId as parameter as an admin, 
    // or we must impersonate them.
    // Traccar standard API typically supports `userId` param for admins on /api/session/token
    params.append('userId', userId.toString());

    const tokenResponse = await this.fetchTraccar(`/session/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    return typeof tokenResponse === 'string' ? tokenResponse : tokenResponse.token;
  }

  /**
   * 3. Creates a new Device in Traccar
   */
  public static async createDevice(payload: TraccarDevicePayload) {
    return this.fetchTraccar('/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * 4. Updates an existing Device in Traccar
   */
  public static async updateDevice(deviceId: number, payload: TraccarDevicePayload) {
    return this.fetchTraccar(`/devices/${deviceId}`, {
      method: 'PUT',
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
      method: 'DELETE',
    });
  }

  /**
   * 6. Gets all devices from Traccar (optional filtering)
   */
  public static async getDevices(params?: URLSearchParams) {
    const endpoint = params ? `/devices?${params.toString()}` : '/devices';
    return this.fetchTraccar(endpoint);
  }

  /**
   * 7. Gets latest positions for all devices
   */
  public static async getPositions() {
    return this.fetchTraccar('/positions');
  }

  /**
   * 8. Assigns a Device to a specific Traccar User
   */
  public static async assignDeviceToUser(deviceId: number, userId: number) {
    return this.fetchTraccar('/permissions', {
      method: 'POST',
      body: JSON.stringify({ deviceId, userId }),
    });
  }

  /**
   * PHASES 2 & 5: Fleet Sync & Intelligence
   */

  /**
   * Internal helper to ensure a Traccar tenant exists for a company
   */
  private static async getOrCreateTenantMapping(supabase: any, companyId: string) {
    const { data: mapping, error } = await supabase
      .from('traccar_tenant_mappings')
      .select('traccar_user_id')
      .eq('company_id', companyId)
      .single();

    if (mapping) return mapping.traccar_user_id;

    // Auto-provision
    const newTraccarUser = await this.createTraccarUser({
      name: `Company_${companyId.substring(0, 8)}_Fleet_Admin`,
      email: `${companyId}@erp-system.local`,
      password: crypto.randomUUID(),
    });

    const { data: newMapping, error: insertError } = await supabase
      .from('traccar_tenant_mappings')
      .insert({
        company_id: companyId,
        traccar_user_id: newTraccarUser.id
      })
      .select('traccar_user_id')
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
      .from('vehicles')
      .select('*, vehicle_types(name)')
      .eq('id', vehicleId)
      .single();

    if (vError || !vehicle) throw new Error('Vehicle not found');

    const gpsId = vehicle.custom_fields?.gps_id;
    const plate = vehicle.license_plate;
    
    // Identifier for Traccar is strictly GPS ID if available, else we can't track it
    const uniqueId = gpsId || plate;
    
    if (!uniqueId) {
       console.log(`[FleetService] Skipping Traccar sync for vehicle ${vehicleId} (No GPS ID or Plate).`);
       return null;
    }

    const traccarName = plate || vehicle.vehicle_number || uniqueId;
    const traccarUserId = await this.getOrCreateTenantMapping(supabase, vehicle.company_id);

    // 2. Resolve Mapping or Find existing device in Traccar
    let traccarDeviceId: number | null = null;
    const { data: deviceMapping } = await supabase
      .from('traccar_device_mappings')
      .select('traccar_device_id')
      .eq('erp_vehicle_id', vehicleId)
      .single();

    if (deviceMapping) {
      traccarDeviceId = deviceMapping.traccar_device_id;
    } else {
      // Try to find by uniqueId in Traccar directly
      console.log(`[FleetService] No mapping for ${vehicleId}, searching Traccar for uniqueId: ${uniqueId}`);
      try {
        const search = await this.getDevices(new URLSearchParams({ uniqueId }));
        if (Array.isArray(search) && search.length > 0) {
          traccarDeviceId = search[0].id;
          console.log(`[FleetService] Found existing device in Traccar by identity: ${traccarDeviceId}`);
        }
      } catch (e) {
        console.warn(`[FleetService] Search failed for ${uniqueId}`);
      }
    }

    if (traccarDeviceId) {
      // Update existing
      console.log(`[FleetService] Updating Traccar device ${traccarDeviceId} (name: ${traccarName}, uniqueId: ${uniqueId})`);
      await this.updateDevice(traccarDeviceId, {
        name: traccarName,
        uniqueId: uniqueId,
      });
    } else {
      // Create new
      console.log(`[FleetService] Creating new Traccar device (name: ${traccarName}, uniqueId: ${uniqueId})`);
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

    await supabase.from('traccar_device_mappings').upsert({
      company_id: vehicle.company_id,
      erp_vehicle_id: vehicle.id,
      traccar_device_id: traccarDeviceId,
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
    }, { onConflict: 'erp_vehicle_id' });

    return traccarDeviceId;
  }

  /**
   * Deletes a vehicle mapping and the device in Traccar.
   * Includes fallback to search by uniqueId if mapping is missing.
   */
  public static async deleteVehicleFromTraccar(vehicleId: string) {
    const supabase = await createClient();

    // 1. Get identifiers from CEO for cleanup search
    const { data: vehicle } = await supabase.from('vehicles').select('*').eq('id', vehicleId).single();
    const identifiers = vehicle ? [vehicle.custom_fields?.gps_id, vehicle.license_plate].filter(Boolean) : [];

    // 2. Try mapping first
    const { data: mapping } = await supabase
      .from('traccar_device_mappings')
      .select('traccar_device_id')
      .eq('erp_vehicle_id', vehicleId)
      .single();

    let deletedFromTraccar = false;

    if (mapping) {
      console.log(`[FleetService] Deleting Traccar device by mapping: ${mapping.traccar_device_id}`);
      try {
        await this.deleteDevice(mapping.traccar_device_id);
        deletedFromTraccar = true;
      } catch (traccarError) {
        console.warn(`[FleetService] Mapping delete failed, item might be gone or ID changed. Trying identifier search.`);
      }
    }

    // 3. Fallback: Search Traccar by known identifiers (GPS ID or Plate)
    if (!deletedFromTraccar) {
       for (const uniqueId of identifiers) {
          try {
             console.log(`[FleetService] Searching Traccar for uniqueId ${uniqueId} to delete...`);
             const search = await this.getDevices(new URLSearchParams({ uniqueId }));
             if (Array.isArray(search) && search.length > 0) {
                await this.deleteDevice(search[0].id);
                console.log(`[FleetService] Successfully deleted Traccar device ${search[0].id} found via identifier.`);
                deletedFromTraccar = true;
                break;
             }
          } catch (e) {
             // continue
          }
       }
    }

    // 4. Cleanup mapping table
    await supabase.from('traccar_device_mappings').delete().eq('erp_vehicle_id', vehicleId);
    console.log(`[FleetService] Finished cleanup for vehicle ${vehicleId}`);
  }

  /**
   * Generates a high-level fleet summary for AI agent consumption.
   */
  public static async getFleetSummary(companyId: string) {
    const supabase = await createClient();

    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('vehicle_number, status, last_known_lat, last_known_lng, last_location_at, ignition_status')
      .eq('company_id', companyId);

    if (error) throw error;

    const maintenanceCount = vehicles.filter((v: { status: string }) => v.status === 'maintenance').length;
    const activeCount = vehicles.filter((v: { status: string }) => v.status === 'active').length;

    return {
      total_vehicles: vehicles.length,
      active: activeCount,
      in_maintenance: maintenanceCount,
      details: vehicles.map((v: any) => ({
        id: v.vehicle_number,
        status: v.status,
        last_seen: v.last_location_at,
        is_moving: v.ignition_status,
        has_gps: !!(v.last_known_lat && v.last_known_lng)
      }))
    };
  }

  // ─── Maintenance ────────────────────────────────────────────────────────────

  /**
   * Fetches all Traccar maintenance schedules (tc_maintenances) for reference.
   * These are the global service intervals defined in the Traccar system.
   */
  public static async getTraccarMaintenanceSchedules() {
    // Traccar exposes maintenances via /api/maintenance
    return this.fetchTraccar('/maintenance');
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
      .from('vehicle_maintenance')
      .select(`
        id,
        vehicle_id,
        type,
        cost,
        maintenance_date,
        next_due_date,
        vehicles ( vehicle_number, make, model, license_plate )
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('maintenance_date', { ascending: false });

    if (error) throw error;

    const now = new Date();
    const totalCost = records.reduce((s: number, r: any) => s + (r.cost ?? 0), 0);
    const overdue = records.filter(
      (r: any) => r.next_due_date && new Date(r.next_due_date) < now
    );

    return {
      total_records: records.length,
      total_cost: totalCost,
      overdue_count: overdue.length,
      overdue_vehicles: overdue.map((r: any) => ({
        vehicle_number: r.vehicles?.vehicle_number,
        next_due_date: r.next_due_date,
      })),
      by_type: ['routine', 'repair', 'inspection', 'emergency'].map((t) => ({
        type: t,
        count: records.filter((r: any) => r.type === t).length,
        cost: records
          .filter((r: any) => r.type === t)
          .reduce((s: number, r: any) => s + (r.cost ?? 0), 0),
      })),
    };
  }
}
