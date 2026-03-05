import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables from .env.local
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.error(`❌ Error: ${envPath} file not found`);
  process.exit(1);
}

console.log('Testing Supabase Edge Function...');

// Get credentials from .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? '***' + supabaseAnonKey.slice(-5) : 'Not found');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Supabase credentials not found in .env file');
  process.exit(1);
}

// Test function to call the readModuleData Edge Function
async function testReadModuleData(module, filters = {}) {
  console.log(`\nTesting readModuleData function for ${module} module...`);
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/readModuleData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        module: module,
        filters: filters,
        traceId: `test-trace-${Date.now()}`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Error calling readModuleData: ${data.error || 'Unknown error'}`);
      return false;
    }

    if (!data.data) {
      console.error('❌ Error: No data returned from function');
      return false;
    }

    console.log(`✅ Success: Found ${data.data.length} records in ${module} module`);
    if (data.data.length > 0) {
      console.log('First record:', JSON.stringify(data.data[0], null, 2));
    }

    return true;
  } catch (err) {
    console.error(`❌ Exception calling readModuleData for ${module}:`, err);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Supabase Edge Function Test ===\n');

  // Test each module
  const crmSuccess = await testReadModuleData('crm', { status: 'active' });
  const fleetSuccess = await testReadModuleData('fleet', { status: 'active' });
  const inventorySuccess = await testReadModuleData('inventory', { is_active: true });

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
