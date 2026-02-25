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
   * 4. Assigns a Device to a specific Traccar User
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
   * If not already mapped, creates a device in Traccar and links it.
   */
  public static async syncVehicleToTraccar(vehicleId: string) {
    const supabase = await createClient();

    // 1. Get vehicle and company mapping details
    const { data: vehicle, error: vError } = await supabase
      .from('vehicles')
      .select('*, vehicle_types(name)')
      .eq('id', vehicleId)
      .single();

    if (vError || !vehicle) throw new Error('Vehicle not found');

    // 2. Ensure Traccar Tenant User exists for this company
    const traccarUserId = await this.getOrCreateTenantMapping(supabase, vehicle.company_id);

    // 2. Check if already mapped
    const { data: deviceMapping } = await supabase
      .from('traccar_device_mappings')
      .select('traccar_device_id')
      .eq('erp_vehicle_id', vehicleId)
      .single();

    if (deviceMapping) {
      // Update existing device
      await this.fetchTraccar(`/devices/${deviceMapping.traccar_device_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          id: deviceMapping.traccar_device_id,
          name: vehicle.vehicle_number,
          uniqueId: vehicle.vin || vehicle.license_plate || vehicle.id,
        } as TraccarDevicePayload & { id: number }),
      });
      return deviceMapping.traccar_device_id;
    }

    // 3. Create new device
    const traccarDevice = await this.createDevice({
      name: vehicle.vehicle_number,
      uniqueId: vehicle.vin || vehicle.license_plate || vehicle.id,
    });

    // 4. Link device to company user
    await this.assignDeviceToUser(traccarDevice.id, traccarUserId);

    // 5. Save mapping
    await supabase.from('traccar_device_mappings').insert({
      company_id: vehicle.company_id,
      erp_vehicle_id: vehicle.id,
      traccar_device_id: traccarDevice.id,
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
    });

    return traccarDevice.id;
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
}
