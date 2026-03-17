import { readModuleData } from "./ai-agent/tools/readModuleData";

async function testReadModuleData() {
  console.log("Testing readModuleData tool...");

  try {
    // Test CRM module with default entity (customers)
    console.log("=== Testing CRM Module (Customers) ===");
    const crmResult = await readModuleData("crm", {}, "test-trace-id");
    console.log("CRM Result:", JSON.stringify(crmResult, null, 2));

    // Test Fleet module
    console.log("=== Testing Fleet Module (Vehicles) ===");
    const fleetResult = await readModuleData("fleet", {}, "test-trace-id");
    console.log("Fleet Result:", JSON.stringify(fleetResult, null, 2));

    // Test Inventory module
    console.log("=== Testing Inventory Module (Products) ===");
    const inventoryResult = await readModuleData(
      "inventory",
      {},
      "test-trace-id",
    );
    console.log("Inventory Result:", JSON.stringify(inventoryResult, null, 2));

    // Test HR module
    console.log("=== Testing HR Module (Employees) ===");
    const hrResult = await readModuleData("hr", {}, "test-trace-id");
    console.log("HR Result:", JSON.stringify(hrResult, null, 2));

    console.log("All tests passed");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testReadModuleData();
