// Check database schema
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function checkSchema() {
  // Check if users table exists
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("*")
    .limit(1);
  
  console.log("Users table check:");
  console.log("  Error:", usersError?.message || "None");
  console.log("  Has data:", !!users);
  
  // Check farmer_profiles structure
  const { data: farmers, error: farmersError } = await supabase
    .from("farmer_profiles")
    .select("*")
    .limit(1);
  
  console.log("\nFarmer profiles check:");
  console.log("  Error:", farmersError?.message || "None");
  if (farmers && farmers.length > 0) {
    console.log("  Sample fields:", Object.keys(farmers[0]));
  }
  
  // Check if we can query auth.users (usually we can't directly, but profiles might reference it)
  console.log("\nTrying to understand the relationship...");
  const { data: farmerWithUser, error: joinError } = await supabase
    .from("farmer_profiles")
    .select("*, user_id")
    .limit(1)
    .single();
  
  console.log("  Farmer profile user_id field exists:", !!farmerWithUser);
  if (farmerWithUser) {
    console.log("  Sample user_id:", farmerWithUser.user_id);
  }
}

checkSchema();
