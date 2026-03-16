
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

console.log("Seeding CRM Customers...");

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

// Test function to seed CRM customers
async function seedCrmCustomers() {
  console.log("\nSeeding CRM Customers...");

  try {
    // First, check if there are any companies, and create one if not
    const { data: existingCompanies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name");

    if (companiesError) {
      console.error("❌ Error fetching companies:", companiesError.message);
      return false;
    }

    let companyId;
    if (existingCompanies.length === 0) {
      console.log("Creating a new company...");
      const { data: newCompany, error: newCompanyError } = await supabase
        .from("companies")
        .insert([{
          name: "Test Company",
          slug: "test-company",
          status: "active"
        }])
        .select("id")
        .single();

      if (newCompanyError) {
        console.error("❌ Error creating company:", newCompanyError.message);
        return false;
      }
      companyId = newCompany.id;
      console.log(`✅ Created company with ID: ${companyId}`);
    } else {
      companyId = existingCompanies[0].id;
      console.log(`Using existing company with ID: ${companyId}`);
    }

    // Create test customers
    const customers = [
      {
        company_id: companyId,
        name: "Acme Corp",
        email: "contact@acmecorp.com",
        phone: "555-1234",
        type: "enterprise",
        status: "active",
        custom_fields: JSON.stringify({
          "Value Bought": "15000",
          "Industry": "Technology",
          "Source": "Website"
        })
      },
      {
        company_id: companyId,
        name: "Beta LLC",
        email: "info@betallc.com",
        phone: "555-5678",
        type: "small_business",
        status: "active",
        custom_fields: JSON.stringify({
          "Value Bought": "8000",
          "Industry": "Marketing",
          "Source": "Referral"
        })
      },
      {
        company_id: companyId,
        name: "Gamma Inc",
        email: "sales@gammainc.com",
        phone: "555-9012",
        type: "medium_business",
        status: "inactive",
        custom_fields: JSON.stringify({
          "Value Bought": "0",
          "Industry": "Healthcare",
          "Source": "Trade Show"
        })
      },
      {
        company_id: companyId,
        name: "Delta Systems",
        email: "support@deltasystems.com",
        phone: "555-3456",
        type: "enterprise",
        status: "active",
        custom_fields: JSON.stringify({
          "Value Bought": "25000",
          "Industry": "Manufacturing",
          "Source": "Partner"
        })
      }
    ];

    // Insert customers
    const { data, error } = await supabase
      .from("customers")
      .insert(customers)
      .select();

    if (error) {
      console.error("❌ Error inserting customers:", error.message);
      console.error("Error details:", error);
      return false;
    }

    console.log(`✅ Successfully seeded ${data.length} customers into CRM:`);
    data.forEach((customer, index) => {
      console.log(
        `${index + 1}. ${customer.name} - ${customer.email} - ${customer.status}`,
      );
    });

    return true;
  } catch (err) {
    console.error("❌ Exception seeding CRM customers:", err);
    return false;
  }
}

// Run seed
(async () => {
  await seedCrmCustomers();
})();
