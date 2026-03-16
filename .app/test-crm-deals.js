
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

console.log("Testing CRM Deals...");

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

// Test function to fetch data from CRM deals
async function testCrmDeals() {
  console.log("\nTesting CRM Deals...");

  try {
    const { data, error } = await supabase
      .from("deals")
      .select("id, title, stage, value, customer_id")
      .limit(5);

    if (error) {
      console.error("❌ Error fetching CRM deals:", error.message);
      console.error("Error details:", error);
      return false;
    }

    console.log(`✅ Found ${data.length} deals in CRM:`);
    data.forEach((deal, index) => {
     console.log(
         `${index + 1}. ${deal.title} - ${deal.stage} - ${deal.value} - Customer ID: ${deal.customer_id}`,
       );
    });

    return true;
  } catch (err) {
    console.error("❌ Exception fetching CRM deals:", err);
    return false;
  }
}

// Run test
(async () => {
  await testCrmDeals();
})();
