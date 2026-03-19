const axios = require("axios");

async function testAIAgentCustomFields() {
  try {
    console.log("=== Testing AI Agent Custom Fields ===");

    // Test 1: Ask for customer data with custom fields
    console.log("\nTest 1: Asking for customer data...");
    const response1 = await axios.post("http://localhost:3000/api/ai/agent", {
      messages: [
        {
          role: "user",
          content:
            "Show all customer data including custom fields like Value Bought",
        },
      ],
      traceId: "test-custom-fields-1",
    });

    console.log("Response received:", response1.data.content);

    // Test 2: Ask specifically for the Value Bought field
    console.log("\nTest 2: Asking specifically for Value Bought...");
    const response2 = await axios.post("http://localhost:3000/api/ai/agent", {
      messages: [
        {
          role: "user",
          content: "Can you show the Value Bought column for all customers?",
        },
      ],
      traceId: "test-custom-fields-2",
    });

    console.log("Response received:", response2.data.content);

    console.log("\n=== Tests completed ===");
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testAIAgentCustomFields();
