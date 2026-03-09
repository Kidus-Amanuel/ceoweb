import { createClient } from "@/lib/supabase/server";
import cache from "@/utils/cache";

interface ReadResponse {
  data?: any;
  error?: string;
}

// Define module configuration based on user's schema
const moduleConfig: Record<string, { table: string; fields: string[] }> = {
  crm: {
    table: "customers",
    fields: ["id", "name", "email", "phone", "type", "status", "created_at"],
  },
  fleet: {
    table: "vehicles",
    fields: ["id", "name", "type", "status", "created_at"],
  },
  inventory: {
    table: "products",
    fields: ["id", "name", "category", "status", "created_at"],
  },
  hr: {
    table: "employees",
    fields: [
      "id",
      "name",
      "email",
      "phone",
      "department",
      "status",
      "created_at",
    ],
  },
  finance: {
    table: "invoices",
    fields: ["id", "number", "status", "amount", "created_at"],
  },
};

// Define valid user types and their permissions
const userTypePermissions: Record<string, string[]> = {
  super_admin: ["crm", "fleet", "inventory", "hr", "finance"],
  admin: ["crm", "fleet", "inventory", "hr", "finance"],
  manager: ["crm", "fleet", "inventory"],
  employee: ["crm", "fleet"],
};

export async function readModuleData(
  module: string,
  filters: any = {},
  traceId?: string,
) {
  // Create cache key based on module and filters
  const cacheKey = `readModuleData:${module}:${JSON.stringify(filters)}:${traceId}`;

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`[readModuleData] Returning cached data for: ${cacheKey}`);
    return cachedData;
  }
  try {
    console.log("=== Tool: readModuleData Started ===");
    console.log("Module:", module);
    console.log("Raw filters:", filters);
    console.log("Trace ID:", traceId);

    // Create Supabase client - This already includes user JWT and respects RLS
    console.log("Creating Supabase client...");
    const supabase = await createClient();

    // Get current user's session to extract company/tenant ID
    console.log("Getting current user from session...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User not authenticated:", userError);
      throw new Error("User not authenticated");
    }

    const userId = user.id;
    console.log("User ID obtained:", userId);

    // Get user's company/tenant ID and user type from profiles table
    console.log("Getting user profile...");
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("company_id, user_type")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Failed to get user profile:", profileError);
      throw new Error(`Failed to get user profile: ${profileError.message}`);
    }

    const companyId = profileData.company_id;
    const userType = profileData.user_type;
    console.log("Company ID obtained:", companyId);
    console.log("User Type obtained:", userType);

    // Check if user has permission to access this module
    console.log("Checking user permissions...");
    const allowedModules = userTypePermissions[userType] || [];
    if (!allowedModules.includes(module)) {
      console.error(
        `User type ${userType} does not have permission to access module:`,
        module,
      );
      throw new Error(`You don't have permission to access ${module} data`);
    }

    const config = moduleConfig[module];
    if (!config) {
      console.error("Unknown module:", module);
      throw new Error(`Unknown module: ${module}`);
    }

    console.log("Module configuration:", config);

    // Clean filters - remove any invalid fields like _entity
    console.log("Cleaning filters...");
    const validFilters = {} as any;
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        // Skip invalid fields like _entity
        if (key !== "_entity" && key !== "company_id") {
          validFilters[key] = value;
        }
      });
    }
    console.log("Valid filters after cleaning:", validFilters);

    // Build query with filters
    console.log("Building Supabase query...");
    let query = supabase.from(config.table).select(config.fields.join(","));

    // Always filter by company/tenant ID for multi-tenancy
    query = query.eq("company_id", companyId);

    // Always exclude deleted records
    query = query.is("deleted_at", null);

    if (validFilters && Object.keys(validFilters).length > 0) {
      Object.entries(validFilters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Order by creation date (latest first)
    query = query.order("created_at", { ascending: false });

    // Limit results to reasonable number
    query = query.limit(100);

    // Execute query - RLS will enforce permissions and multi-tenancy
    console.log("Executing query...");
    const { data, error } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      throw new Error(`readModuleData failed: ${error.message}`);
    }

    console.log(
      `Query returned ${Array.isArray(data) ? data.length : 0} records`,
    );

    // Clean up data to remove validation messages
    console.log("Cleaning up response data...");
    const cleanedData = data.map((item: any) => {
      const newItem = { ...item };
      // Remove any validation error fields (starting with standardData.)
      Object.keys(newItem).forEach((key) => {
        if (key.startsWith("standardData.") || key.includes("Please enter")) {
          delete newItem[key];
        }
      });
      // Truncate long strings
      Object.keys(newItem).forEach((key) => {
        if (typeof newItem[key] === "string" && newItem[key].length > 50) {
          newItem[key] = newItem[key].substring(0, 47) + "...";
        }
      });
      return newItem;
    });

    console.log("=== Tool: readModuleData Completed ===");
    // Cache the result with appropriate TTL (1 minute for potentially changing data)
    cache.set(cacheKey, cleanedData, 60 * 1000); // 1 minute TTL
    return cleanedData;
  } catch (err: any) {
    console.error("=== Tool: readModuleData Failed ===");
    console.error("Error message:", err?.message);
    console.error("Error stack:", err?.stack);
    throw err;
  }
}
