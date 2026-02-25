import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FleetService } from '@/services/fleet.service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_types(name)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
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
    const { data: vehicle, error: insertError } = await supabase
      .from("vehicles")
      .insert({
        company_id: profile.company_id,
        vehicle_number: formData.vehicle_number,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        license_plate: formData.license_plate,
        vin: formData.vin,
        status: formData.status || 'active',
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
