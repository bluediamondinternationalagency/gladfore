// Check users table structure
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

async function checkUsersTable() {
  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .limit(3);
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Users table structure:");
  if (users && users.length > 0) {
    console.log("Fields:", Object.keys(users[0]));
    console.log("\nSample data:");
    users.forEach((user, i) => {
      console.log(`\nUser ${i + 1}:`);
      console.log("  ID:", user.id);
      console.log("  Email:", user.email);
      console.log("  Phone:", user.phone);
      console.log("  Role:", user.role);
      console.log("  Created:", user.created_at);
    });
  }
}

checkUsersTable();
