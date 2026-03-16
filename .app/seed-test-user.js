
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

console.log("Seeding Test User...");

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

// Test function to seed test user
async function seedTestUser() {
  console.log("\nSeeding Test User...");

  try {
    // Sign up test user
    const { data, error } = await supabase.auth.signUp({
      email: "test@test.com",
      password: "Test1234",
    });

    if (error) {
      console.error("❌ Error signing up test user:", error.message);
      return false;
    }

    console.log(`✅ Successfully signed up test user: ${data.user.email}`);
    console.log(`User ID: ${data.user.id}`);

    // Create profile for test user
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        full_name: "Test User",
        email: "test@company.com",
        phone_number: "555-1234",
        user_type: "company_user",
        company_id: null, // Will be set when user joins a company
        preferences: JSON.stringify({ theme: "light" }),
      });

    if (profileError) {
      console.error("❌ Error creating user profile:", profileError.message);
      return false;
    }

    console.log("✅ User profile created successfully");

    return true;
  } catch (err) {
    console.error("❌ Exception seeding test user:", err);
    return false;
  }
}

// Run seed
(async () => {
  await seedTestUser();
})();
