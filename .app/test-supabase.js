const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`❌ Error: ${envPath} file not found`);
  process.exit(1);
}

console.log('Testing Supabase connection...');

// Get credentials from .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-5) : 'Not found');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Supabase credentials not found in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test function to fetch data from CRM module
async function testCrmModule() {
  console.log('\nTesting CRM module...');
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, status')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching CRM customers:', error.message);
      console.error('Error details:', error);
      return false;
    }

    console.log(`✅ Found ${data.length} customers in CRM:`);
    data.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.email}) - ${customer.status}`);
    });
    
    return true;
  } catch (err) {
    console.error('❌ Exception fetching CRM customers:', err);
    return false;
  }
}

// Test function to fetch data from Fleet module
async function testFleetModule() {
  console.log('\nTesting Fleet module...');
  
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, vehicle_number, make, model, status')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching Fleet vehicles:', error.message);
      console.error('Error details:', error);
      return false;
    }

    console.log(`✅ Found ${data.length} vehicles in Fleet:`);
    data.forEach((vehicle, index) => {
      console.log(`${index + 1}. ${vehicle.name} (${vehicle.model}) - ${vehicle.status}`);
    });
    
    return true;
  } catch (err) {
    console.error('❌ Exception fetching Fleet vehicles:', err);
    return false;
  }
}

// Test function to fetch data from Inventory module
async function testInventoryModule() {
  console.log('\nTesting Inventory module...');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, stock_quantity')
      .limit(5);

    if (error) {
      console.error('❌ Error fetching Inventory products:', error.message);
      console.error('Error details:', error);
      return false;
    }

    console.log(`✅ Found ${data.length} products in Inventory:`);
    data.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.category}) - ${product.stock_quantity} units`);
    });
    
    return true;
  } catch (err) {
    console.error('❌ Exception fetching Inventory products:', err);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Supabase Connection Test ===\n');

  // Test connection
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
      console.error('Error details:', error);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection established successfully');
  } catch (err) {
    console.error('❌ Connection test exception:', err);
    process.exit(1);
  }

  // Test modules
  const crmSuccess = await testCrmModule();
  const fleetSuccess = await testFleetModule();
  const inventorySuccess = await testInventoryModule();

  console.log('\n=== Test Results ===');
  console.log(`CRM Module: ${crmSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`Fleet Module: ${fleetSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`Inventory Module: ${inventorySuccess ? '✅ Success' : '❌ Failed'}`);

  const overallSuccess = crmSuccess || fleetSuccess || inventorySuccess;
  console.log(`\nOverall: ${overallSuccess ? '✅ At least one module working' : '❌ All modules failed'}`);
}

// Run test
main().catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
