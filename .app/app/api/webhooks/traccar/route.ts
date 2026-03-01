import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // 1. Validate Webhook Secret (Shared Secret between Traccar and ERP)
    const authHeader = req.headers.get("Authorization");
    const secret = process.env.TRACCAR_WEBHOOK_SECRET;

    if (secret && authHeader !== `Bearer ${secret}`) {
      console.error("[Traccar Webhook] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    console.log("[Traccar Webhook] Received payload:", JSON.stringify(payload));

    // Traccar forward logic typically sends an array of positions or a single position object
    // Depending on 'forward.json' and 'forward.type' settings in traccar.xml
    const positions = Array.isArray(payload.positions)
      ? payload.positions
      : [payload.position].filter(Boolean);

    if (positions.length === 0 && payload.deviceId) {
      // Fallback for some Traccar versions or configurations
      positions.push(payload);
    }

    if (positions.length === 0) {
      return NextResponse.json({
        status: "ignored",
        message: "No position data found",
      });
    }

    const supabase = await createClient();

    for (const pos of positions) {
      const { deviceId, latitude, longitude, serverTime, attributes } = pos;

      if (!deviceId) continue;

      // 2. Find the ERP Vehicle ID from Traccar Device ID
      const { data: mapping, error: mappingError } = await supabase
        .from("traccar_device_mappings")
        .select("erp_vehicle_id, company_id")
        .eq("traccar_device_id", deviceId)
        .single();

      if (mappingError || !mapping) {
        console.warn(
          `[Traccar Webhook] No mapping found for Traccar Device ID: ${deviceId}`,
        );
        continue;
      }

      // 3. Update Vehicle Cache
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({
          last_known_lat: latitude,
          last_known_lng: longitude,
          last_location_at: serverTime || new Date().toISOString(),
          ignition_status: attributes?.ignition || false,
        })
        .eq("id", mapping.erp_vehicle_id);

      if (updateError) {
        console.error(
          `[Traccar Webhook] Failed to update vehicle ${mapping.erp_vehicle_id}:`,
          updateError,
        );
      } else {
        console.log(
          `[Traccar Webhook] Updated vehicle ${mapping.erp_vehicle_id} location`,
        );
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("[Traccar Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
