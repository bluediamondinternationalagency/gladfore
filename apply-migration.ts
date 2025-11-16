import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nuexakcydimzdrntjshi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZXhha2N5ZGltemRybnRqc2hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI5MTM4NSwiZXhwIjoyMDc3ODY3Mzg1fQ.-y-MxSNKQTSenRDDMwuuQoux3KF57fSbivUjO7-_AeQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying migration to add agent_id column...\n');
  
  const migration = `
-- Add agent_id column to farmer_profiles table
ALTER TABLE farmer_profiles 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agent_profiles(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_agent_id ON farmer_profiles(agent_id);
  `;
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migration });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('\nTrying alternative method...');
      
      // Alternative: Use direct SQL via service role
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: migration })
      });
      
      if (!response.ok) {
        console.error('❌ Alternative method also failed');
        console.log('\n⚠️  Please run the migration manually in Supabase Dashboard SQL Editor');
        return;
      }
    }
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the column was added
    const { data: testData, error: testError } = await supabase
      .from('farmer_profiles')
      .select('id, agent_id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Verification failed:', testError.message);
    } else {
      console.log('✅ Verified: agent_id column exists');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n⚠️  Please run the migration manually in Supabase Dashboard SQL Editor');
  }
}

applyMigration().catch(console.error);
