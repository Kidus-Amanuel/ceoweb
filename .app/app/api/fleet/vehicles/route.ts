import { NextResponse } from "next/server";
import { FleetService } from "@/services/fleet.service";
import { requireFleetAuth } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qv_company_id = searchParams.get("company_id"); // Cache buster
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    // 1. Fetch from CEO Database
    const { data: dbVehicles, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_types(name)")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    console.log(
      `[Fleet API] DB Vehicles for company ${companyId}:`,
      dbVehicles?.length || 0,
    );

    // 2. Fetch live data from Traccar
    try {
      // Fetch both devices (for status) and positions (for coordinates)
      const [traccarDevices, traccarPositions] = (await Promise.all([
        FleetService.getDevices(),
        FleetService.getPositions(),
      ])) as [any[], any[]];

      console.log(
        `[Fleet API] Live Data: ${traccarDevices?.length || 0} devices, ${traccarPositions?.length || 0} positions.`,
      );

      // Merge live data from Traccar into CEO database records
      const mergedData = dbVehicles.map((vehicle: any) => {
        const vehicleGpsId = vehicle.custom_fields?.gps_id
          ? String(vehicle.custom_fields.gps_id).trim()
          : null;
        const vehiclePlate = vehicle.license_plate
          ? String(vehicle.license_plate).trim()
          : null;

        // Match by GPS ID first (correct identifier).
        // Fall back to plate for backward-compatibility with devices that were
        // registered before the GPS-ID-as-identifier policy was enforced.
        const traccarDevice =
          (vehicleGpsId &&
            traccarDevices?.find((d: any) => d.uniqueId === vehicleGpsId)) ||
          (vehiclePlate &&
            traccarDevices?.find((d: any) => d.uniqueId === vehiclePlate)) ||
          undefined;

        if (traccarDevice) {
          // 2. Find the Position (for coordinates)
          const position = traccarPositions?.find(
            (p: any) => p.deviceId === traccarDevice.id,
          );

          // Preference: 1. Live Position, 2. Device fields, 3. DB Cache
          const lat =
            position?.latitude ??
            traccarDevice.latitude ??
            vehicle.last_known_lat;
          const lng =
            position?.longitude ??
            traccarDevice.longitude ??
            vehicle.last_known_lng;

          return {
            ...vehicle,
            last_known_lat: lat,
            last_known_lng: lng,
            last_location_at:
              position?.deviceTime ||
              traccarDevice.lastUpdate ||
              vehicle.last_location_at,
            traccar_status: traccarDevice.status?.trim(),
            ignition_status:
              position?.attributes?.ignition ?? vehicle.ignition_status,
            is_active:
              traccarDevice.status?.trim() === "online" ||
              (traccarDevice.lastUpdate &&
                new Date().getTime() -
                  new Date(traccarDevice.lastUpdate).getTime() <
                  30 * 60 * 1000),
          };
        }
        return vehicle;
      });

      // Cache Traccar live data for 30 s — reduces external HTTP calls
      const res = NextResponse.json(mergedData);
      res.headers.set(
        "Cache-Control",
        "private, max-age=30, stale-while-revalidate=60",
      );
      return res;
    } catch (traccarError) {
      console.warn("[Fleet API] Traccar Live Fetch Failed:", traccarError);
      return NextResponse.json(dbVehicles);
    }
  } catch (error: any) {
    console.error("[Fleet API] GET Vehicles Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const formData = await req.json();

    // 2. Insert vehicle into ERP database
    const vehicleNumber =
      formData.vehicle_number ||
      formData.custom_fields?.gps_id ||
      formData.license_plate ||
      `VEH-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: vehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        company_id: companyId,
        vehicle_number: vehicleNumber,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        license_plate: formData.license_plate,
        vin: formData.vin,
        status: formData.status || "active",
        custom_fields: formData.custom_fields || {},
        assigned_driver_id: formData.assigned_driver_id,
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
    console.error("[Fleet API] POST Vehicle Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 },
      );
    }

    // 2. Build update payload
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const allowedFields = [
      "vehicle_number",
      "make",
      "model",
      "year",
      "vin",
      "license_plate",
      "status",
      "custom_fields",
      "assigned_driver_id",
      "vehicle_type_id",
    ];

    for (const key of allowedFields) {
      if (key in fields) {
        updatePayload[key] = fields[key];
      }
    }

    // 3. Update vehicle in ERP database
    const { data: vehicle, error: updateError } = await supabase
      .from("vehicles")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 4. Sync to Traccar if relevant fields changed
    const traccarFields = ["vehicle_number", "license_plate", "custom_fields"];
    const hasTraccarChanges = traccarFields.some((f) => f in fields);

    if (hasTraccarChanges) {
      try {
        await FleetService.syncVehicleToTraccar(vehicle.id);
      } catch (syncError) {
        console.error("[Fleet API] Traccar Sync Failed:", syncError);
      }
    }

    return NextResponse.json(vehicle);
  } catch (error: any) {
    console.error("[Fleet API] PATCH Vehicle Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 },
      );
    }

    // 2. Remove device from Traccar (non-blocking — proceed even if Traccar is unreachable)
    try {
      await FleetService.deleteVehicleFromTraccar(id);
    } catch (traccarError) {
      console.error("[Fleet API] Traccar device cleanup failed:", traccarError);
    }

    // 3. Soft delete vehicle in ERP database
    const { error: deleteError } = await supabase
      .from("vehicles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Fleet API] DELETE Vehicle Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
