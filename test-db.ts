import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://nuexakcydimzdrntjshi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZXhha2N5ZGltemRybnRqc2hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI5MTM4NSwiZXhwIjoyMDc3ODY3Mzg1fQ.-y-MxSNKQTSenRDDMwuuQoux3KF57fSbivUjO7-_AeQ';

console.log('Supabase URL:', supabaseUrl);
console.log('Key available:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking Supabase database schema...\n');
  
  // Check if tables exist
  const tables = ['users', 'farmer_profiles', 'agent_profiles', 'notifications', 'audit_logs'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: exists (${data.length} records found)`);
      }
    } catch (e) {
      console.log(`❌ Table ${table}: ${(e as Error).message}`);
    }
  }
  
  // Try to get table schema information
  try {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'users' });
    if (!error && data) {
      console.log('\nUsers table columns:', data);
    }
  } catch (e) {
    // Ignore RPC errors for now
  }
}

checkTables().catch(console.error);