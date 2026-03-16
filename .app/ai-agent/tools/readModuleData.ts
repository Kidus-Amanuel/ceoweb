import { createClient } from "@/lib/supabase/server";
import cache from "@/utils/cache";

interface ReadResponse {
  data?: any;
  error?: string;
}

// Define module configuration with support for all existing modules
const moduleConfig: Record<
  string,
  { 
    defaultTable: string; 
    defaultFields: string[]; 
    defaultDisplayColumns: string[];
    entityTypes?: string[]; // For modules with multiple entity types (like CRM)
    entityConfig?: Record<string, { 
      fields: string[]; 
      displayColumns: string[];
      relationships?: { [key: string]: { table: string; foreignKey: string; fields: string[]; displayField: string } } // Table relationships
    }>; // Entity-specific configuration
    metadataKey?: string; // Module-specific metadata key in company.settings
    customFieldsColumn?: string; // Column name for custom fields JSON data
  }
> = {
  crm: {
    defaultTable: "customers",
    defaultFields: ["id", "name", "email", "phone", "type", "status", "created_at", "custom_fields"],
    defaultDisplayColumns: ["Id", "Name", "Email", "Phone", "Status"],
    entityTypes: ["customers", "deals", "activities", "overviews"],
    entityConfig: {
      customers: {
        fields: ["id", "name", "email", "phone", "type", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Email", "Phone", "Status"],
        relationships: {
          deals: { table: "deals", foreignKey: "customer_id", fields: ["id", "title", "stage", "value", "status"], displayField: "title" },
          activities: { table: "activities", foreignKey: "customer_id", fields: ["id", "title", "type", "date", "status"], displayField: "title" }
        }
      },
      deals: {
        fields: ["id", "title", "stage", "value", "customer_id", "created_at", "custom_fields"],
        displayColumns: ["Id", "Title", "Stage", "Value", "Customer ID"],
        relationships: {
          customer: { table: "customers", foreignKey: "customer_id", fields: ["id", "name", "email"], displayField: "name" }
        }
      },
      activities: {
        fields: ["id", "title", "type", "date", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Title", "Type", "Date", "Status"],
        relationships: {
          customer: { table: "customers", foreignKey: "customer_id", fields: ["id", "name", "email"], displayField: "name" },
          deal: { table: "deals", foreignKey: "deal_id", fields: ["id", "title", "stage"], displayField: "title" }
        }
      },
      overviews: {
        fields: ["id", "name", "value", "type", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Value", "Type"],
        relationships: {}
      },
    },
    metadataKey: "crm_metadata",
    customFieldsColumn: "custom_fields",
  },
  fleet: {
    defaultTable: "vehicles",
    defaultFields: ["id", "vehicle_number", "license_plate", "status", "created_at", "custom_fields"],
    defaultDisplayColumns: ["Id", "Vehicle Number", "License Plate", "Status"],
    entityTypes: ["vehicles", "drivers", "maintenance"],
    entityConfig: {
      vehicles: {
        fields: ["id", "vehicle_number", "license_plate", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Vehicle Number", "License Plate", "Status"],
      },
      drivers: {
        fields: ["id", "first_name", "last_name", "license_number", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "First Name", "Last Name", "License Number", "Status"],
      },
      maintenance: {
        fields: ["id", "vehicle_id", "type", "status", "cost", "created_at", "custom_fields"],
        displayColumns: ["Id", "Vehicle ID", "Type", "Status", "Cost"],
      },
    },
    metadataKey: "fleet_metadata",
    customFieldsColumn: "custom_fields",
  },
  inventory: {
    defaultTable: "products",
    defaultFields: ["id", "name", "category", "status", "created_at", "custom_fields"],
    defaultDisplayColumns: ["Id", "Name", "Category", "Status"],
    entityTypes: ["products", "warehouses", "inventory_movements", "suppliers", "vendors", "purchase_orders", "stock"],
    entityConfig: {
      products: {
        fields: ["id", "name", "category", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Category", "Status"],
      },
      warehouses: {
        fields: ["id", "name", "location", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Location", "Status"],
      },
      inventory_movements: {
        fields: ["id", "product_id", "warehouse_id", "type", "quantity", "created_at", "custom_fields"],
        displayColumns: ["Id", "Product ID", "Warehouse ID", "Type", "Quantity"],
      },
      suppliers: {
        fields: ["id", "name", "contact", "email", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Contact", "Email", "Status"],
      },
      vendors: {
        fields: ["id", "name", "contact", "email", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Contact", "Email", "Status"],
      },
      purchase_orders: {
        fields: ["id", "order_number", "vendor_id", "status", "total_amount", "created_at", "custom_fields"],
        displayColumns: ["Id", "Order Number", "Vendor ID", "Status", "Total Amount"],
      },
      stock: {
        fields: ["id", "product_id", "warehouse_id", "quantity", "created_at", "custom_fields"],
        displayColumns: ["Id", "Product ID", "Warehouse ID", "Quantity"],
      },
    },
    metadataKey: "inventory_metadata",
    customFieldsColumn: "custom_fields",
  },
  hr: {
    defaultTable: "employees",
    defaultFields: ["id", "first_name", "last_name", "email", "job_title", "status", "created_at", "custom_fields"],
    defaultDisplayColumns: ["Id", "First Name", "Last Name", "Email", "Job Title", "Status"],
    entityTypes: ["employees", "departments", "leave_requests", "attendance", "payroll", "performance"],
    entityConfig: {
      employees: {
        fields: ["id", "first_name", "last_name", "email", "job_title", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "First Name", "Last Name", "Email", "Job Title", "Status"],
      },
      departments: {
        fields: ["id", "name", "manager_id", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Manager ID", "Status"],
      },
      leave_requests: {
        fields: ["id", "employee_id", "type", "start_date", "end_date", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Employee ID", "Type", "Start Date", "End Date", "Status"],
      },
      attendance: {
        fields: ["id", "employee_id", "date", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Employee ID", "Date", "Status"],
      },
      payroll: {
        fields: ["id", "employee_id", "amount", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Employee ID", "Amount", "Status"],
      },
      performance: {
        fields: ["id", "employee_id", "rating", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Employee ID", "Rating", "Status"],
      },
    },
    metadataKey: "hr_metadata",
    customFieldsColumn: "custom_fields",
  },
  finance: {
    defaultTable: "invoices",
    defaultFields: ["id", "number", "status", "amount", "created_at", "custom_fields"],
    defaultDisplayColumns: ["Id", "Number", "Status", "Amount", "Created At"],
    entityTypes: ["invoices", "expenses", "payments"],
    entityConfig: {
      invoices: {
        fields: ["id", "number", "status", "amount", "created_at", "custom_fields"],
        displayColumns: ["Id", "Number", "Status", "Amount", "Created At"],
      },
      expenses: {
        fields: ["id", "description", "amount", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Description", "Amount", "Status", "Created At"],
      },
      payments: {
        fields: ["id", "invoice_id", "amount", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Invoice ID", "Amount", "Status", "Created At"],
      },
    },
    metadataKey: "finance_metadata",
    customFieldsColumn: "custom_fields",
  },
  internationaltrade: {
    defaultTable: "shipments",
    defaultFields: ["id", "shipment_number", "status", "created_at", "custom_fields"],
    defaultDisplayColumns: ["Id", "Shipment Number", "Status", "Created At"],
    entityTypes: ["shipments", "containers", "ports", "vessels", "clearance"],
    entityConfig: {
      shipments: {
        fields: ["id", "shipment_number", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Shipment Number", "Status", "Created At"],
      },
      containers: {
        fields: ["id", "container_number", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Container Number", "Status", "Created At"],
      },
      ports: {
        fields: ["id", "name", "code", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Code", "Status", "Created At"],
      },
      vessels: {
        fields: ["id", "name", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Name", "Status", "Created At"],
      },
      clearance: {
        fields: ["id", "shipment_id", "status", "created_at", "custom_fields"],
        displayColumns: ["Id", "Shipment ID", "Status", "Created At"],
      },
    },
    metadataKey: "internationaltrade_metadata",
    customFieldsColumn: "custom_fields",
  },
};

// Type definitions for column metadata
interface ColumnDefinition {
  id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: string;
  field_options: string[] | null;
  is_required: boolean;
  is_active: boolean;
}

type ModuleMetadata = Partial<Record<string, ColumnDefinition[]>>;

// Check if custom fields column exists in the table
async function checkCustomFieldsColumn(supabase: any, table: string, customFieldsColumn: string): Promise<boolean> {
  try {
    // Try to select just the custom fields column to check if it exists
    const { data, error } = await supabase
      .from(table)
      .select(customFieldsColumn)
      .limit(0); // Limit 0 to avoid fetching any data
    
    return !error;
  } catch (error) {
    console.error(`Error checking custom fields column '${customFieldsColumn}' in table '${table}':`, error);
    return false;
  }
}

// Normalize metadata from company settings for any module
const normalizeMetadata = (settings: unknown, metadataKey: string, entityTypes: string[]): ModuleMetadata => {
  const parsedSettings =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  const rawMetadata =
    parsedSettings[metadataKey] &&
    typeof parsedSettings[metadataKey] === "object" &&
    !Array.isArray(parsedSettings[metadataKey])
      ? (parsedSettings[metadataKey] as Record<string, unknown>)
      : {};

  const metadata: ModuleMetadata = {};
  for (const entityType of entityTypes) {
    const values = rawMetadata[entityType];
    if (!Array.isArray(values)) {
      metadata[entityType] = [];
      continue;
    }

    metadata[entityType] = values
      .map((entry) =>
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? {
              ...(entry as Partial<ColumnDefinition>),
              entity_type: entityType,
              field_name:
                typeof (entry as Partial<ColumnDefinition>).field_name ===
                "string"
                  ? (entry as Partial<ColumnDefinition>).field_name!
                  : "",
            } as ColumnDefinition
          : null,
      )
      .filter((entry): entry is ColumnDefinition =>
        Boolean(entry && entry.field_name),
      );
  }

  return metadata;
};

// Define valid user types and their permissions
const userTypePermissions: Record<string, string[]> = {
  super_admin: ["crm", "fleet", "inventory", "hr", "finance", "internationaltrade"],
  admin: ["crm", "fleet", "inventory", "hr", "finance", "internationaltrade"],
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

    // Determine table based on entity type (for modules with multiple entities)
    const entityType = filters?._entity || config.defaultTable; // Default to module's default table
    const table = config.entityTypes?.includes(entityType) ? entityType : config.defaultTable;
    
    // Get fields and display columns based on entity type (using entity-specific config if available)
    let fields: string[];
    let displayColumns: string[];
    
    if (config.entityConfig && config.entityConfig[entityType]) {
      fields = config.entityConfig[entityType].fields;
      displayColumns = [...config.entityConfig[entityType].displayColumns];
    } else {
      fields = config.defaultFields;
      displayColumns = [...config.defaultDisplayColumns];
    }

    console.log("Module configuration:", config);
    console.log("Entity type:", entityType);
    console.log("Table to query:", table);

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

    // Get custom column definitions for the current module/entity
    let customColumns: ColumnDefinition[] = [];
    if (config.metadataKey) {
      console.log("Fetching custom column definitions...");
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", companyId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!companyError && company) {
        try {
          const entityTypes = config.entityTypes || [config.defaultTable];
          const metadata = normalizeMetadata(company.settings, config.metadataKey, entityTypes);
          customColumns = (metadata[entityType] ?? []).filter((entry) => entry.is_active);
          
          // Add custom columns to display columns
          customColumns.forEach(column => {
            displayColumns.push(column.field_label);
          });
          
          console.log("Custom columns found:", customColumns.map(c => c.field_label));
        } catch (error) {
          console.error("Error processing metadata for module:", module, error);
          customColumns = [];
        }
      }
    }

    // Check if custom_fields column exists before including it in the query
    const hasCustomFieldsColumn = config.customFieldsColumn ? await checkCustomFieldsColumn(supabase, table, config.customFieldsColumn) : false;
    if (!hasCustomFieldsColumn && config.customFieldsColumn && fields.includes(config.customFieldsColumn)) {
      fields = fields.filter(field => field !== config.customFieldsColumn);
      console.log(`Custom fields column '${config.customFieldsColumn}' not found, removed from query`);
    }

    // Check if table exists before querying
    console.log(`Checking if table '${table}' exists...`);
    let query: any;
    try {
      // Try to query the table to see if it exists
      query = supabase.from(table).select(fields.join(","));
    } catch (error) {
      console.error(`Table '${table}' does not exist or is not accessible:`, error);
      return {
        data: [],
        columns: displayColumns,
        hasMore: false,
        totalCount: 0,
        insights: { activeCount: 0, recentCount: 0, averageNameLength: 0 },
      };
    }

    // Always filter by company/tenant ID for multi-tenancy
    query = query.eq("company_id", companyId);

    // Always exclude deleted records
    query = query.is("deleted_at", null);

    if (validFilters && Object.keys(validFilters).length > 0) {
      Object.entries(validFilters).forEach(([key, value]) => {
        // Convert key to lowercase to handle case sensitivity
        const lowerKey = key.toLowerCase();
        query = query.eq(lowerKey, value);
      });
    }

    // Order by creation date (latest first)
    query = query.order("created_at", { ascending: false });

    // Limit results to reasonable number for chat interface
    const limit = 10; // Show first 10 records for compact chat display
    query = query.limit(limit + 1); // Fetch one extra to check if there are more

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
    
    // Detailed logging of data structure
    console.log("=== Raw Query Results ===");
    console.log(JSON.stringify(data, null, 2));
    
    // Log custom fields extraction
    console.log("=== Custom Fields Extraction ===");
    const customFieldsColumn = config.customFieldsColumn || "custom_fields";
    data.forEach((item: any, index: number) => {
      if (item[customFieldsColumn]) {
        console.log(`Record ${index + 1} ${customFieldsColumn}:`, item[customFieldsColumn]);
      } else {
        console.log(`Record ${index + 1} has no ${customFieldsColumn}`);
      }
    });

    // Check if there are more records
    const hasMore = data.length > limit;
    const resultsToReturn = hasMore ? data.slice(0, limit) : data;

    // Fetch related data if configured and includeRelated parameter is true
    const includeRelated = validFilters?.includeRelated || false;
    let processedData = [...resultsToReturn];
    
    if (includeRelated && config.entityConfig && config.entityConfig[entityType]?.relationships) {
      console.log("Fetching related data...");
      const relationships = config.entityConfig[entityType].relationships;
      
      processedData = await Promise.all(
        resultsToReturn.map(async (item: any) => {
          const itemWithRelated = { ...item };
          
          // Fetch related data for each configured relationship
          for (const [relationName, relationConfig] of Object.entries(relationships)) {
            try {
              console.log(`Fetching ${relationName} data for item ${item.id}...`);
              
              // Query related table
              const { data: relatedData, error: relatedError } = await supabase
                .from(relationConfig.table)
                .select(relationConfig.fields.join(","))
                .eq(relationConfig.foreignKey, item.id)
                .is("deleted_at", null);
                
              if (relatedError) {
                console.error(`Error fetching ${relationName} data:`, relatedError);
                continue;
              }
              
              // Add related data to the item
              itemWithRelated[relationName] = relatedData;
              
              // If it's a single relationship (not one-to-many), extract the first item
              if (relatedData.length === 1 && relationName !== "deals" && relationName !== "activities") {
                itemWithRelated[relationName] = relatedData[0];
              }
              
            } catch (error) {
              console.error(`Error fetching ${relationName} data:`, error);
            }
          }
          
          return itemWithRelated;
        })
      );
    } else {
      // If no related data is needed, just use the original data
      processedData = resultsToReturn;
    }

    // Clean up data to remove validation messages and ensure id is included
    console.log("Cleaning up response data...");
    const cleanedData = processedData.map((item: any) => {
      const newItem = { ...item };
      
      // Handle HR module specific name formatting (first_name + last_name)
      if (module === "hr" && newItem.first_name && newItem.last_name) {
        newItem.name = `${newItem.first_name} ${newItem.last_name}`.trim();
      }
      
      // Remove any validation error fields (starting with standardData.)
      Object.keys(newItem).forEach((key) => {
        if (key.startsWith("standardData.") || key.includes("Please enter")) {
          delete newItem[key];
        }
      });
      
      // Extract custom fields from custom fields JSON column
      if (config.customFieldsColumn && newItem[config.customFieldsColumn]) {
        try {
          const customFields = typeof newItem[config.customFieldsColumn] === "string" 
            ? JSON.parse(newItem[config.customFieldsColumn]) 
            : newItem[config.customFieldsColumn];
          
          // Add custom fields as top-level properties with proper formatting
          if (typeof customFields === "object" && customFields !== null) {
            Object.entries(customFields).forEach(([key, value]) => {
              // Find the column definition to get the proper field label
              const columnDef = customColumns.find(col => col.field_name === key);
              const displayKey = columnDef?.field_label || key;
              newItem[displayKey] = value;
            });
          }
        } catch (parseError) {
          console.error("Error parsing custom fields:", parseError);
        }
        // Remove the raw custom fields column to avoid duplication
        delete newItem[config.customFieldsColumn];
      }
      
      // Truncate long strings for chat display
      Object.keys(newItem).forEach((key) => {
        if (typeof newItem[key] === "string" && newItem[key].length > 40) {
          newItem[key] = newItem[key].substring(0, 37) + "...";
        }
      });
      // Ensure id is always present and first in the row for URL creation
      if (!newItem.id) {
        // If no id, create a temporary one from name or index
        newItem.id = item.name
          ? item.name.toLowerCase().replace(/\s+/g, "-")
          : `temp-${Math.random().toString(36).substr(2, 9)}`;
      }
      return newItem;
    });

    console.log("=== Final Cleaned Data ===");
    console.log(JSON.stringify(cleanedData, null, 2));
    
    console.log("=== Display Columns ===");
    console.log(displayColumns);
    
    console.log("=== Tool: readModuleData Completed ===");
    
    // Calculate basic insights for contextual awareness
    const insights = {
      activeCount: 0,
      recentCount: 0,
      averageNameLength: 0,
    };
    
    // Get today's date for recent activity calculation
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Calculate insights from data
    if (cleanedData.length > 0) {
      insights.activeCount = (cleanedData as any[]).filter(item => item.status === "active").length;
      insights.recentCount = (cleanedData as any[]).filter(item => new Date(item.created_at) >= thirtyDaysAgo).length;
      
      const totalNameLength = (cleanedData as any[]).reduce((sum: number, item: any) => sum + (item.name || "").length, 0);
      insights.averageNameLength = Math.round(totalNameLength / cleanedData.length);
    }
    
    // Cache the result with appropriate TTL (1 minute for potentially changing data)
    const result = {
      data: cleanedData,
      columns: displayColumns,
      hasMore: hasMore,
      totalCount: hasMore ? limit + " plus more" : cleanedData.length,
      insights: insights,
    };
    cache.set(cacheKey, result, 60 * 1000); // 1 minute TTL
    return result;
  } catch (err: any) {
    console.error("=== Tool: readModuleData Failed ===");
    console.error("Error message:", err?.message);
    console.error("Error stack:", err?.stack);
    throw err;
  }
}
