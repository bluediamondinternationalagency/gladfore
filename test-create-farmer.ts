import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nuexakcydimzdrntjshi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZXhha2N5ZGltemRybnRqc2hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI5MTM4NSwiZXhwIjoyMDc3ODY3Mzg1fQ.-y-MxSNKQTSenRDDMwuuQoux3KF57fSbivUjO7-_AeQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateFarmer() {
  console.log('Testing farmer creation...\n');
  
  // Agent user ID for bilalsalau@gmail.com
  const agentUserId = '4a0fefee-d23d-4ff0-b225-88ad99d02a6b';
  
  // Get agent profile
  console.log('Step 1: Getting agent profile...');
  const { data: agentProfile, error: agentError } = await supabase
    .from('agent_profiles')
    .select('id')
    .eq('user_id', agentUserId)
    .single();
    
  if (agentError || !agentProfile) {
    console.error('❌ Agent profile not found:', agentError?.message);
    return;
  }
  
  console.log('✅ Agent profile found:', agentProfile.id);
  
  // Test data
  const testEmail = `testfarmer${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testData = {
    email: testEmail,
    password: testPassword,
    fullName: 'Test Farmer',
    phone: '+2348012345678',
    farmLocation: 'Test Location',
    farmSize: '5 hectares',
    cropTypes: ['Maize', 'Rice'],
    creditLimit: '100000'
  };
  
  console.log('\nStep 2: Creating auth user...');
  console.log('Email:', testEmail);
  
  try {
    const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: testData.fullName,
        phone: testData.phone,
        role: 'farmer'
      }
    });
    
    if (createAuthError) {
      console.error('❌ Failed to create auth user:', createAuthError.message);
      console.error('Error details:', JSON.stringify(createAuthError, null, 2));
      return;
    }
    
    if (!authData.user) {
      console.error('❌ No user returned from createUser');
      return;
    }
    
    console.log('✅ Auth user created:', authData.user.id);
    
    console.log('\nStep 2.5: Creating public.users entry...');
    const { error: publicUserError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: testEmail,
        phone: testData.phone,
        password_hash: 'managed_by_supabase_auth',
        role: 'farmer',
        is_active: true
      });
      
    if (publicUserError) {
      console.error('❌ Failed to create public.users entry:', publicUserError.message);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }
    
    console.log('✅ Public user entry created');
    
    console.log('\nStep 3: Creating farmer profile...');
    const { data: farmerProfile, error: profileError } = await supabase
      .from('farmer_profiles')
      .insert({
        user_id: authData.user.id,
        agent_id: agentProfile.id,
        full_name: testData.fullName,
        phone: testData.phone,
        farm_size: testData.farmSize,
        farm_location: testData.farmLocation,
        crop_types: testData.cropTypes,
        id_type: 'national_id',
        id_number: 'pending',
        credit_limit: testData.creditLimit,
        kyc_status: 'pending'
      })
      .select()
      .single();
      
    if (profileError) {
      console.error('❌ Failed to create farmer profile:', profileError.message);
      console.error('Error details:', JSON.stringify(profileError, null, 2));
      
      // Rollback: delete auth user
      console.log('\nRolling back...');
      await supabase.from('users').delete().eq('id', authData.user.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.log('✅ Rollback complete');
      return;
    }
    
    console.log('✅ Farmer profile created:', farmerProfile.id);
    console.log('\n🎉 SUCCESS! Farmer created successfully');
    console.log('User ID:', authData.user.id);
    console.log('Farmer ID:', farmerProfile.id);
    console.log('Email:', authData.user.email);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testCreateFarmer().catch(console.error);
