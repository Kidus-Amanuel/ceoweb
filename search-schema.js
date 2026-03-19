const fs = require("fs");
const path = require("path");

const schemaFile = path.join(__dirname, "docs", "complete_erp_schema.sql");
const schemaContent = fs.readFileSync(schemaFile, "utf8");

// Search for tables with custom_fields column
const tablePattern = /CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/g;
let match;
const tablesWithCustomFields = [];

while ((match = tablePattern.exec(schemaContent)) !== null) {
  const tableName = match[1];
  const columnsDefinition = match[2];

  if (columnsDefinition.includes("custom_fields")) {
    tablesWithCustomFields.push(tableName);
  }
}

console.log("Tables with custom_fields column:");
tablesWithCustomFields.forEach((table) => console.log(`- ${table}`));

// Display all module tables
console.log("\nAll module tables:");
const moduleTables = [
  "customers",
  "deals",
  "activities",
  "vehicles",
  "drivers",
  "maintenance",
  "products",
  "warehouses",
  "inventory_movements",
  "employees",
  "departments",
  "leave_requests",
  "invoices",
  "expenses",
  "payments",
];
moduleTables.forEach((table) => {
  const hasCustomFields = tablesWithCustomFields.includes(table);
  console.log(
    `- ${table}: ${hasCustomFields ? "✅ custom_fields exists" : "❌ custom_fields missing"}`,
  );
});
