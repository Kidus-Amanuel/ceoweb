import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FleetService } from '@/services/fleet.service';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 1. Fetch from CEO Database
    const { data: dbVehicles, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_types(name)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 2. Fetch live data from Traccar
    try {
      // Fetch both devices (for status) and positions (for coordinates)
      const [traccarDevices, traccarPositions] = await Promise.all([
        FleetService.getDevices(),
        FleetService.getPositions()
      ]) as [any[], any[]];
      
      console.log(`[Fleet API] Live Data: ${traccarDevices?.length || 0} devices, ${traccarPositions?.length || 0} positions.`);

      // Merge live data from Traccar into CEO database records
      const mergedData = dbVehicles.map((vehicle: any) => {
        const vehicleGpsId = vehicle.custom_fields?.gps_id;
        const vehiclePlate = vehicle.license_plate;

        // 1. Find the Device (for status)
        const traccarDevice = traccarDevices?.find((d: any) => 
           (vehicleGpsId && d.uniqueId === vehicleGpsId) || 
           (vehiclePlate && d.uniqueId === vehiclePlate)
        );
        
        if (traccarDevice) {
           // 2. Find the Position (for coordinates)
           const position = traccarPositions?.find((p: any) => p.deviceId === traccarDevice.id);

           // Preference: 1. Live Position, 2. Device fields, 3. DB Cache
           const lat = position?.latitude ?? traccarDevice.latitude ?? vehicle.last_known_lat;
           const lng = position?.longitude ?? traccarDevice.longitude ?? vehicle.last_known_lng;

           return {
             ...vehicle,
             last_known_lat: lat,
             last_known_lng: lng,
             last_location_at: position?.deviceTime || traccarDevice.lastUpdate || vehicle.last_location_at,
             traccar_status: traccarDevice.status?.trim(),
             ignition_status: position?.attributes?.ignition ?? vehicle.ignition_status,
             is_active: traccarDevice.status?.trim() === 'online' || (traccarDevice.lastUpdate && (new Date().getTime() - new Date(traccarDevice.lastUpdate).getTime() < 30 * 60 * 1000))
           };
        }
        return vehicle;
      });

      return NextResponse.json(mergedData);
    } catch (traccarError) {
      console.warn('[Fleet API] Traccar Live Fetch Failed:', traccarError);
      return NextResponse.json(dbVehicles);
    }
  } catch (error: any) {
    console.error('[Fleet API] GET Vehicles Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const formData = await req.json();

    // 1. Get current user and company
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    // 2. Insert vehicle into ERP database
    const vehicleNumber = formData.vehicle_number || 
                          formData.custom_fields?.gps_id || 
                          formData.license_plate || 
                          `VEH-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: vehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        company_id: profile.company_id,
        vehicle_number: vehicleNumber,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        license_plate: formData.license_plate,
        vin: formData.vin,
        status: formData.status || 'active',
        custom_fields: formData.custom_fields || {},
        assigned_driver_id: formData.assigned_driver_id
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 3. Sync to Traccar (Backend to Backend)
    try {
      await FleetService.syncVehicleToTraccar(vehicle.id);
    } catch (syncError) {
      console.error("[Fleet API] Traccar Sync Failed:", syncError);
    }

    return NextResponse.json(vehicle);
  } catch (error: any) {
    console.error('[Fleet API] POST Vehicle Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
