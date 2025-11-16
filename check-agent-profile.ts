import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://nuexakcydimzdrntjshi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZXhha2N5ZGltemRybnRqc2hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI5MTM4NSwiZXhwIjoyMDc3ODY3Mzg1fQ.-y-MxSNKQTSenRDDMwuuQoux3KF57fSbivUjO7-_AeQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgentProfiles() {
  console.log('Checking agent profiles...\n');
  
  // Get all agent profiles
  const { data: agents, error } = await supabase
    .from('agent_profiles')
    .select('*');
    
  if (error) {
    console.error('Error fetching agents:', error.message);
    return;
  }
  
  if (!agents || agents.length === 0) {
    console.log('❌ No agent profiles found in database');
    console.log('\nYou need to create an agent user first!');
    console.log('Go to Admin Dashboard → Create User → Select role "agent"');
    return;
  }
  
  console.log(`✅ Found ${agents.length} agent profile(s):\n`);
  
  for (const agent of agents) {
    console.log(`Agent ID: ${agent.id}`);
    console.log(`User ID: ${agent.user_id}`);
    console.log(`Name: ${agent.full_name}`);
    console.log(`Phone: ${agent.phone}`);
    console.log(`Email: ${agent.email || 'N/A'}`);
    console.log(`Region: ${agent.region || 'N/A'}`);
    console.log(`Commission Rate: ${agent.commission_rate}%`);
    console.log('---');
  }
  
  // Get auth users to see emails
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (!usersError && users) {
    console.log('\n\nAll auth users:');
    for (const user of users) {
      const role = user.user_metadata?.role || 'unknown';
      console.log(`- ${user.email} (${role}) - ID: ${user.id}`);
    }
  }
}

checkAgentProfiles().catch(console.error);
