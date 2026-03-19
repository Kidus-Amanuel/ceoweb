const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");

// Load environment variables from .env.local
const envPath = ".env.local";
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`❌ Error: ${envPath} file not found`);
  process.exit(1);
}

console.log("Seeding CRM Deals...");

// Get credentials from .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log(
  "Supabase Anon Key:",
  supabaseAnonKey ? "***" + supabaseAnonKey.slice(-5) : "Not found",
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Error: Supabase credentials not found in .env file");
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test function to seed CRM deals
async function seedCrmDeals() {
  console.log("\nSeeding CRM Deals...");

  try {
    // First, check if there are any customers
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, name");

    if (customersError) {
      console.error("❌ Error fetching customers:", customersError.message);
      return false;
    }

    if (customers.length === 0) {
      console.error("❌ No customers found. Please seed customers first.");
      return false;
    }

    // Create test deals
    const deals = [
      {
        customer_id: customers[0].id,
        title: "Enterprise Software License",
        value: 15000.0,
        stage: "negotiation",
        probability: 75,
        expected_close_date: new Date("2026-03-30").toISOString().split("T")[0],
      },
      {
        customer_id: customers[0].id,
        title: "Cloud Migration Project",
        value: 25000.0,
        stage: "proposal",
        probability: 50,
        expected_close_date: new Date("2026-04-15").toISOString().split("T")[0],
      },
      {
        customer_id: customers[1]?.id || customers[0].id,
        title: "Website Redesign",
        value: 8000.0,
        stage: "closed_won",
        probability: 100,
        expected_close_date: new Date("2026-03-20").toISOString().split("T")[0],
      },
      {
        customer_id: customers[2]?.id || customers[0].id,
        title: "Marketing Automation Platform",
        value: 12000.0,
        stage: "qualified",
        probability: 30,
        expected_close_date: new Date("2026-04-30").toISOString().split("T")[0],
      },
      {
        customer_id: customers[3]?.id || customers[0].id,
        title: "Data Analytics Dashboard",
        value: 18000.0,
        stage: "closed_lost",
        probability: 0,
        expected_close_date: new Date("2026-03-15").toISOString().split("T")[0],
      },
    ];

    // Insert deals
    const { data, error } = await supabase.from("deals").insert(deals).select();

    if (error) {
      console.error("❌ Error inserting deals:", error.message);
      console.error("Error details:", error);
      return false;
    }

    console.log(`✅ Successfully seeded ${data.length} deals into CRM:`);
    data.forEach((deal, index) => {
      console.log(
        `${index + 1}. ${deal.title} - ${deal.stage} - $${deal.value.toFixed(2)}`,
      );
    });

    return true;
  } catch (err) {
    console.error("❌ Exception seeding CRM deals:", err);
    return false;
  }
}

// Run seed
(async () => {
  await seedCrmDeals();
})();
