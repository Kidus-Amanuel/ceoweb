import { NextResponse } from "next/server";
import { FleetService } from "@/services/fleet.service";
import { requireFleetAuth } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    // 1. Build Query
    let query = supabase
      .from("vehicles")
      .select("*, vehicle_types(name)", { count: "exact" })
      .eq("company_id", companyId)
      .is("deleted_at", null);

    // 2. Apply Filters
    if (search) {
      query = query.or(
        `vehicle_number.ilike.%${search}%,license_plate.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`,
      );
    }

    // Note: status filter is primarily Traccar-based (online/offline),
    // but we can filter by DB status if it's 'active'/'inactive'.
    if (status !== "all" && ["active", "inactive"].includes(status)) {
      query = query.eq("status", status);
    }

    // 3. Apply Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const {
      data: dbVehicles,
      error,
      count,
    } = await query.order("created_at", { ascending: false }).range(from, to);

    if (error) throw error;

    // 4. Fetch live data from Traccar for CURRENT PAGE only
    try {
      const [traccarDevices, traccarPositions] = (await Promise.all([
        FleetService.getDevices(),
        FleetService.getPositions(),
      ])) as [any[], any[]];

      // Merge live data
      const mergedData = (dbVehicles || []).map((vehicle: any) => {
        const vehicleGpsId = vehicle.custom_fields?.gps_id
          ? String(vehicle.custom_fields.gps_id).trim()
          : null;
        const vehiclePlate = vehicle.license_plate
          ? String(vehicle.license_plate).trim()
          : null;

        const traccarDevice =
          (vehicleGpsId &&
            traccarDevices?.find((d: any) => d.uniqueId === vehicleGpsId)) ||
          (vehiclePlate &&
            traccarDevices?.find((d: any) => d.uniqueId === vehiclePlate));

        if (traccarDevice) {
          const position = traccarPositions?.find(
            (p: any) => p.deviceId === traccarDevice.id,
          );

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

      // Filter by Traccar status if requested
      let filteredData = mergedData;
      if (status === "online") {
        filteredData = mergedData.filter(
          (v) => v.traccar_status === "online" || v.is_active,
        );
      } else if (status === "offline") {
        filteredData = mergedData.filter(
          (v) => v.traccar_status !== "online" && !v.is_active,
        );
      }

      return NextResponse.json({
        data: filteredData,
        total: count || 0,
        page,
        pageSize,
      });
    } catch (traccarError) {
      console.warn("[Fleet API] Traccar Live Fetch Failed:", traccarError);
      return NextResponse.json({
        data: dbVehicles,
        total: count || 0,
        page,
        pageSize,
      });
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
