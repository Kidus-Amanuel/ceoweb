import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FleetService } from "@/services/fleet.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 },
      );
    }

    // 1. Update vehicle in CEO
    const { data: vehicle, error: updateError } = await supabase
      .from("vehicles")
      .update({
        vehicle_number: body.vehicle_number,
        make: body.make,
        model: body.model,
        year: body.year,
        license_plate: body.license_plate,
        vin: body.vin,
        status: body.status,
        custom_fields: body.custom_fields,
        assigned_driver_id: body.assigned_driver_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Sync to Traccar
    try {
      await FleetService.syncVehicleToTraccar(id);
    } catch (syncError) {
      console.error("[Fleet API] Traccar Update Sync Failed:", syncError);
    }

    return NextResponse.json(vehicle);
  } catch (error: any) {
    console.error("[Fleet API] PATCH Vehicle Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 },
      );
    }

    // 1. Delete from Traccar first (Transactional-safe)
    try {
      await FleetService.deleteVehicleFromTraccar(id);
    } catch (traccarError: any) {
      console.error("[Fleet API] Traccar Delete Failed:", traccarError);
      return NextResponse.json(
        {
          error: `Could not delete vehicle from Traccar: ${traccarError.message}. Deletion aborted.`,
        },
        { status: 500 },
      );
    }

    // 2. Delete from CEO
    const { error } = await supabase.from("vehicles").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Fleet API] DELETE Vehicle Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
