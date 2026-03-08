import { NextResponse } from "next/server";
import { requireFleetAuth } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

// ─── GET ──────────────────────────────────────────────────────────────────────
// Returns all maintenance records for the company, joined with vehicle info.

export async function GET(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get("vehicle_id");

    // Pagination and Filtering params
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all";

    let query = supabase
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
        created_at,
        updated_at,
        vehicles (
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

    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    if (search) {
      query = query.or(
        `description.ilike.%${search}%,notes.ilike.%${search}%,performed_by.ilike.%${search}%`,
      );
    }

    if (
      type !== "all" &&
      ["routine", "repair", "inspection", "emergency"].includes(type)
    ) {
      query = query.eq("type", type);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order("maintenance_date", { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Shape the response to include flat vehicle fields for the table
    const shaped = (data || []).map((r: any) => ({
      id: r.id,
      vehicle_id: r.vehicle_id,
      vehicle_label: r.vehicles
        ? `${r.vehicles.make ?? ""} ${r.vehicles.model ?? ""}`.trim()
        : "",
      vehicle_plate:
        r.vehicles?.license_plate || r.vehicles?.vehicle_number || "",
      vehicle_number: r.vehicles?.vehicle_number || "",
      maintenance_date: r.maintenance_date,
      type: r.type,
      description: r.description,
      cost: r.cost,
      odometer_reading: r.odometer_reading,
      performed_by: r.performed_by,
      next_due_date: r.next_due_date,
      notes: r.notes,
      custom_fields: r.custom_fields || {},
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    // Fallback frontend search for the joined vehicles fields
    let textFiltered = shaped;
    if (search) {
      const q = search.toLowerCase();
      textFiltered = shaped.filter(
        (a) =>
          (a.description && a.description.toLowerCase().includes(q)) ||
          (a.notes && a.notes.toLowerCase().includes(q)) ||
          (a.performed_by && a.performed_by.toLowerCase().includes(q)) ||
          (a.vehicle_label && a.vehicle_label.toLowerCase().includes(q)) ||
          (a.vehicle_plate && a.vehicle_plate.toLowerCase().includes(q)),
      );
    }

    return NextResponse.json({
      data: textFiltered,
      total: search ? textFiltered.length : count || 0,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("[Fleet Maintenance API] GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
// Creates a new maintenance record & optionally updates vehicle status.

export async function POST(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const body = await req.json();

    if (!body.vehicle_id)
      return NextResponse.json(
        { error: "vehicle_id is required" },
        { status: 400 },
      );

    const { data, error } = await supabase
      .from("vehicle_maintenance")
      .insert({
        company_id: companyId,
        vehicle_id: body.vehicle_id,
        maintenance_date:
          body.maintenance_date || new Date().toISOString().split("T")[0],
        type: body.type || "routine",
        description: body.description || null,
        cost: body.cost ? Number(body.cost) : null,
        odometer_reading: body.odometer_reading
          ? Number(body.odometer_reading)
          : null,
        performed_by: body.performed_by || null,
        next_due_date: body.next_due_date || null,
        notes: body.notes || null,
        custom_fields: body.custom_fields || {},
      })
      .select()
      .single();

    if (error) throw error;

    // If this is a repair or emergency, automatically set the vehicle status to maintenance
    if (body.type === "repair" || body.type === "emergency") {
      await supabase
        .from("vehicles")
        .update({ status: "maintenance" })
        .eq("id", body.vehicle_id)
        .eq("company_id", companyId);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Fleet Maintenance API] POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
// Updates an existing maintenance record.

export async function PATCH(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id)
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 },
      );

    // Build the update object – only include known DB columns
    const updatePayload: Record<string, any> = {};
    const allowed = [
      "vehicle_id",
      "maintenance_date",
      "type",
      "description",
      "cost",
      "odometer_reading",
      "performed_by",
      "next_due_date",
      "notes",
      "custom_fields",
    ];
    for (const key of allowed) {
      if (key in fields) {
        updatePayload[key] = fields[key] === "" ? null : fields[key];
      }
    }

    if (updatePayload.cost !== undefined && updatePayload.cost !== null)
      updatePayload.cost = Number(updatePayload.cost);
    if (
      updatePayload.odometer_reading !== undefined &&
      updatePayload.odometer_reading !== null
    )
      updatePayload.odometer_reading = Number(updatePayload.odometer_reading);

    const { data, error } = await supabase
      .from("vehicle_maintenance")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Fleet Maintenance API] PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
// Soft-deletes a maintenance record.

export async function DELETE(req: Request) {
  try {
    const auth = await requireFleetAuth();
    if (auth instanceof NextResponse) return auth;
    const { supabase, companyId } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 },
      );

    const { error } = await supabase
      .from("vehicle_maintenance")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Fleet Maintenance API] DELETE Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
