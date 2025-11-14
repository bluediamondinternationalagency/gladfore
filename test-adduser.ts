import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nuexakcydimzdrntjshi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZXhha2N5ZGltemRybnRqc2hpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI5MTM4NSwiZXhwIjoyMDc3ODY3Mzg1fQ.-y-MxSNKQTSenRDDMwuuQoux3KF57fSbivUjO7-_AeQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAddUser() {
  console.log('Testing AddUsers functionality...\n');
  
  // Test farmer creation
  const testFarmerData = {
    userType: "farmer",
    fullName: "Test Farmer John",
    phone: "+234801234567" + Math.floor(Math.random() * 1000), // Random to avoid conflicts
    email: "testfarmer@example.com",
    farmSize: "5 hectares",
    farmLocation: "Lagos State",
    cropTypes: ["maize", "cassava"],
    idType: "national_id",
    idNumber: "12345678901",
    guarantorName: "Chief Adebayo",
    guarantorPhone: "+234802345678",
    guarantorType: "chief",
    creditLimit: "75000",
    autoApproveKyc: true
  };

  console.log('Creating test farmer with data:', testFarmerData);

  try {
    // Simulate the Netlify function call
    const response = await fetch('http://localhost:8888/.netlify/functions/admin-create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testFarmerData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ User created successfully:', result);
    } else {
      console.log('❌ Error creating user:', result);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    
    // Try direct database test instead
    console.log('\nTesting direct database access...');
    
    try {
      // Check existing users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(5);
        
      if (usersError) {
        console.log('❌ Users table error:', usersError.message);
      } else {
        console.log('✅ Users table accessible, sample data:', users);
      }
      
      // Check farmer profiles
      const { data: farmers, error: farmersError } = await supabase
        .from('farmer_profiles')
        .select('*')
        .limit(5);
        
      if (farmersError) {
        console.log('❌ Farmer profiles table error:', farmersError.message);
      } else {
        console.log('✅ Farmer profiles table accessible, sample data:', farmers);
      }
      
    } catch (dbError) {
      console.log('❌ Database error:', dbError.message);
    }
  }
}

testAddUser().catch(console.error);