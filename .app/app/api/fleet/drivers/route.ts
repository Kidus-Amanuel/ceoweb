import { NextResponse } from "next/server";
import { requireFleetAuth } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qv_company_id = searchParams.get("company_id"); // Cache buster
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    // Fetch driver assignments with employee and vehicle details
    const { data: assignments, error } = await supabase
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
          employee_code,
          custom_fields
        ),
        vehicles!driver_assignments_vehicle_id_fkey (
          id,
          vehicle_number,
          make,
          model,
          license_plate
        )
      `,
      )
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    console.log(`[Fleet API] DB Driver Assignments for company ${companyId}:`, assignments?.length || 0);

    // Shape the data
    const shaped = assignments.map((a: any) => {
      const emp = a.employees;
      const veh = a.vehicles;
      return {
        id: a.id,
        driver_id: a.driver_id,
        vehicle_id: a.vehicle_id,
        start_date: a.start_date,
        end_date: a.end_date,
        notes: a.notes || "",
        custom_fields: a.custom_fields || {},
        // Employee fields (read-only display)
        driver_name: emp
          ? `${emp.first_name} ${emp.last_name}`.trim()
          : "Unknown",
        driver_email: emp?.email || "",
        driver_title: emp?.job_title || "",
        driver_code: emp?.employee_code || "",
        // Vehicle fields (read-only display)
        vehicle_label: veh ? `${veh.make} ${veh.model}` : null,
        vehicle_plate: veh?.license_plate || veh?.vehicle_number || "",
        vehicle_number: veh?.vehicle_number || "",
      };
    });

    return NextResponse.json(shaped);
  } catch (error: any) {
    console.error("[Fleet Drivers API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const body = await req.json();

    if (!body.driver_id)
      return NextResponse.json(
        { error: "Driver (employee) is required" },
        { status: 400 },
      );
    if (!body.start_date)
      return NextResponse.json(
        { error: "Start date is required" },
        { status: 400 },
      );

    const { data, error } = await supabase
      .from("driver_assignments")
      .insert({
        company_id: companyId,
        driver_id: body.driver_id,
        vehicle_id: body.vehicle_id || null,
        start_date: body.start_date,
        end_date: body.end_date || null,
        notes: body.notes || null,
        custom_fields: body.custom_fields || {},
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Fleet Drivers API] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const body = await req.json();
    const { id, driver_id, vehicle_id, start_date, end_date, notes } = body;

    if (!id)
      return NextResponse.json(
        { error: "Assignment ID required" },
        { status: 400 },
      );

    const { data, error } = await supabase
      .from("driver_assignments")
      .update({
        driver_id,
        vehicle_id: vehicle_id || null,
        start_date,
        end_date: end_date || null,
        notes: notes || null,
        custom_fields: body.custom_fields || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId)  // ✅ Security: scope to current company
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Fleet Drivers API] PATCH Error:", error);
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

    if (!id)
      return NextResponse.json(
        { error: "Assignment ID required" },
        { status: 400 },
      );

    // Soft delete
    const { error } = await supabase
      .from("driver_assignments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);  // ✅ Security: scope to current company

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Fleet Drivers API] DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
