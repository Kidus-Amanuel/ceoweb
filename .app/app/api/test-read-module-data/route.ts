import { NextRequest, NextResponse } from "next/server";
import { readModuleData } from "@/ai-agent/tools/readModuleData";

export async function GET(request: NextRequest) {
  try {
    // Test CRM module with default entity (customers)
    const crmResult = await readModuleData("crm", {}, "test-trace-id");
    const fleetResult = await readModuleData("fleet", {}, "test-trace-id");
    const inventoryResult = await readModuleData(
      "inventory",
      {},
      "test-trace-id",
    );
    const hrResult = await readModuleData("hr", {}, "test-trace-id");

    return NextResponse.json({
      crm: crmResult,
      fleet: fleetResult,
      inventory: inventoryResult,
      hr: hrResult,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
