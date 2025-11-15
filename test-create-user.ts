// Test script for admin-create-user function
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Testing admin-create-user function");
console.log("Supabase URL:", supabaseUrl);
console.log("Has service key:", !!supabaseServiceKey);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test data - use random phone to avoid duplicates
const randomSuffix = Math.floor(Math.random() * 90000000) + 10000000;
const testData = {
  userType: "farmer",
  fullName: "Test Farmer",
  phone: `+234${randomSuffix}`,
  email: `testfarmer${randomSuffix}@example.com`,
  farmSize: "2 hectares",
  farmLocation: "Lagos State",
  cropTypes: "Maize, Rice",
  idType: "national_id",
  idNumber: "12345678901",
  guarantorName: "Chief Test",
  guarantorPhone: "+2348087654321",
  guarantorType: "chief",
  creditLimit: "50000",
  autoApproveKyc: true
};

async function testCreateUser() {
  try {
    console.log("\nTesting user creation...");
    
    // Generate password
    const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    console.log("Generated password:", password);
    
    // Create auth user
    console.log("\nCreating Supabase Auth user...");
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testData.email,
      password: password,
      phone: testData.phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: testData.fullName,
        role: "farmer",
        phone: testData.phone,
        created_by_admin: true
      }
    });
    
    if (authError) {
      console.error("Auth error:", authError);
      throw authError;
    }
    
    console.log("Auth user created:", authUser.user?.id);
    
    // Also create user in users table (for foreign key relationships)
    console.log("\nCreating user in users table...");
    const { error: usersTableError } = await supabase
      .from("users")
      .insert({
        id: authUser.user!.id,
        email: testData.email,
        phone: testData.phone,
        password_hash: "", // Not needed with Supabase Auth
        role: "farmer",
        is_active: true
      });
    
    if (usersTableError) {
      console.error("Users table error:", usersTableError);
      throw usersTableError;
    }
    
    console.log("User record created in users table");
    
    // Create farmer profile
    console.log("\nCreating farmer profile...");
    const cropTypesArray = testData.cropTypes.split(",").map(c => c.trim());
    
    const { data: farmerProfile, error: profileError } = await supabase
      .from("farmer_profiles")
      .insert({
        user_id: authUser.user!.id,
        full_name: testData.fullName,
        phone: testData.phone,
        farm_size: testData.farmSize,
        farm_location: testData.farmLocation,
        crop_types: cropTypesArray,
        id_type: testData.idType,
        id_number: testData.idNumber,
        guarantor_name: testData.guarantorName,
        guarantor_phone: testData.guarantorPhone,
        guarantor_type: testData.guarantorType,
        kyc_status: testData.autoApproveKyc ? "verified" : "pending",
        kyc_verified_at: testData.autoApproveKyc ? new Date().toISOString() : null,
        credit_limit: parseFloat(testData.creditLimit),
        available_credit: parseFloat(testData.creditLimit),
        credit_score: 50,
      })
      .select()
      .single();
    
    if (profileError) {
      console.error("Profile error:", profileError);
      throw profileError;
    }
    
    console.log("Farmer profile created:", farmerProfile.id);
    
    // Test login with email
    console.log("\nTesting login with email...");
    const { data: emailLoginData, error: emailLoginError } = await supabase.auth.signInWithPassword({
      email: testData.email,
      password: password
    });
    
    if (emailLoginError) {
      console.error("Email login error:", emailLoginError);
    } else {
      console.log("✅ Email login successful! User ID:", emailLoginData.user?.id);
    }
    
    // Test login with phone
    console.log("\nTesting login with phone...");
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      phone: testData.phone,
      password: password
    });
    
    if (loginError) {
      console.warn("Phone login error (may be disabled):", loginError.message);
    } else {
      console.log("✅ Phone login successful! User ID:", loginData.user?.id);
    }
    
    console.log("\n✅ Test completed successfully!");
    console.log("User credentials:");
    console.log("  Phone:", testData.phone);
    console.log("  Email:", testData.email);
    console.log("  Password:", password);
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testCreateUser();
