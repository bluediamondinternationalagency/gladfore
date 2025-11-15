// netlify/functions/admin-create-user.ts
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Use environment variables with fallback
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables:", {
    url: !!supabaseUrl,
    key: !!supabaseServiceKey
  });
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceKey! // Use service role key for admin operations
);

// Helper to generate password
const generatePassword = (): string => {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log("Function called:", event.httpMethod, event.path);
  console.log("Environment check:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceKey
  });

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse request body
    const { userType, ...userData } = JSON.parse(event.body || "{}");

    // Generate password (Supabase Auth will handle hashing)
    const generatedPassword = generatePassword();

    if (userType === "farmer") {
      // Validate required fields
      if (!userData.fullName || !userData.phone || !userData.farmLocation) {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if phone already exists in farmer profiles
      const { data: existingFarmer } = await supabase
        .from("farmer_profiles")
        .select("id")
        .eq("phone", userData.phone)
        .single();

      if (existingFarmer) {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ error: "Phone number already registered" }),
        };
      }

      // Create user with Supabase Auth
      const email = userData.email && userData.email.trim() ? userData.email.trim() : `${userData.phone.replace(/\+/g, '')}@gladfore-temp.com`;
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: generatedPassword,
        phone: userData.phone,
        email_confirm: true, // Auto-confirm email for admin-created users
        phone_confirm: true, // Auto-confirm phone for admin-created users
        user_metadata: {
          full_name: userData.fullName,
          role: "farmer",
          phone: userData.phone,
          created_by_admin: true
        }
      });

      if (authError) {
        console.error("Supabase Auth error:", authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      if (!authUser.user) {
        throw new Error("No user returned from Supabase Auth");
      }

      // Update the user's profile in auth.users table with additional metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.user.id,
        {
          user_metadata: {
            full_name: userData.fullName,
            role: "farmer",
            phone: userData.phone,
            created_by_admin: true,
            original_email: userData.email || null
          }
        }
      );

      if (updateError) {
        console.warn("Failed to update user metadata:", updateError);
      }

      // Also create user in the users table (for foreign key relationships)
      const { error: usersTableError } = await supabase
        .from("users")
        .insert({
          id: authUser.user.id, // Use same ID as auth.users
          email: email,
          phone: userData.phone,
          password_hash: "", // Not needed since we use Supabase Auth
          role: "farmer",
          is_active: true
        });

      if (usersTableError) {
        console.error("Failed to create user in users table:", usersTableError);
        // Try to clean up the auth user
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Failed to create user record: ${usersTableError.message}`);
      }

      const user = {
        id: authUser.user.id,
        email: authUser.user.email,
        phone: authUser.user.phone || userData.phone,
        role: "farmer"
      };

      // Create farmer profile linked to auth user
      const { data: farmerProfile, error: profileError } = await supabase
        .from("farmer_profiles")
        .insert({
          user_id: user.id, // This now links to auth.users.id
          full_name: userData.fullName,
          phone: userData.phone,
          farm_size: userData.farmSize,
          farm_location: userData.farmLocation,
          crop_types: userData.cropTypes || [],
          id_type: userData.idType || "national_id",
          id_number: userData.idNumber || "",
          guarantor_name: userData.guarantorName || "",
          guarantor_phone: userData.guarantorPhone || "",
          guarantor_type: userData.guarantorType || "chief",
          kyc_status: userData.autoApproveKyc ? "verified" : "pending",
          kyc_verified_at: userData.autoApproveKyc ? new Date().toISOString() : null,
          credit_limit: parseFloat(userData.creditLimit || "50000"),
          available_credit: parseFloat(userData.creditLimit || "50000"),
          credit_score: 50,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id, // Auth user ID
        farmer_id: farmerProfile.id,
        title: "Welcome to Gladfore!",
        message: userData.autoApproveKyc
          ? `Your account has been created and approved. You have a credit limit of ₦${parseFloat(userData.creditLimit || "50000").toLocaleString()}.`
          : "Your account has been created. KYC verification is pending.",
        type: "general",
      });

      // Create audit log
      await supabase.from("audit_logs").insert({
        action: "farmer_created",
        entity_type: "farmer",
        entity_id: farmerProfile.id,
        new_values: {
          fullName: userData.fullName,
          phone: userData.phone,
          autoApproveKyc: userData.autoApproveKyc,
        },
      });

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({
          user: {
            id: farmerProfile.id,
            fullName: userData.fullName,
            phone: userData.phone,
            email: userData.email,
            password: generatedPassword,
            role: "farmer",
            creditLimit: userData.creditLimit || "50000",
          },
        }),
      };

    } else if (userType === "agent") {
      // Validate required fields
      if (!userData.fullName || !userData.phone || !userData.region) {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if phone already exists in agent profiles
      const { data: existingAgent } = await supabase
        .from("agent_profiles")
        .select("id")
        .eq("phone", userData.phone)
        .single();

      if (existingAgent) {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
          },
          body: JSON.stringify({ error: "Phone number already registered" }),
        };
      }

      // Create user with Supabase Auth
      const email = userData.email && userData.email.trim() ? userData.email.trim() : `${userData.phone.replace(/\+/g, '')}@gladfore-temp.com`;
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: generatedPassword,
        phone: userData.phone,
        email_confirm: true, // Auto-confirm email for admin-created users
        phone_confirm: true, // Auto-confirm phone for admin-created users
        user_metadata: {
          full_name: userData.fullName,
          role: "agent",
          phone: userData.phone,
          created_by_admin: true
        }
      });

      if (authError) {
        console.error("Supabase Auth error:", authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      if (!authUser.user) {
        throw new Error("No user returned from Supabase Auth");
      }

      // Update the user's profile in auth.users table with additional metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.user.id,
        {
          user_metadata: {
            full_name: userData.fullName,
            role: "agent",
            phone: userData.phone,
            created_by_admin: true,
            original_email: userData.email || null
          }
        }
      );

      if (updateError) {
        console.warn("Failed to update user metadata:", updateError);
      }

      // Also create user in the users table (for foreign key relationships)
      const { error: usersTableError } = await supabase
        .from("users")
        .insert({
          id: authUser.user.id, // Use same ID as auth.users
          email: email,
          phone: userData.phone,
          password_hash: "", // Not needed since we use Supabase Auth
          role: "agent",
          is_active: true
        });

      if (usersTableError) {
        console.error("Failed to create user in users table:", usersTableError);
        // Try to clean up the auth user
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Failed to create user record: ${usersTableError.message}`);
      }

      const user = {
        id: authUser.user.id,
        email: authUser.user.email,
        phone: authUser.user.phone || userData.phone,
        role: "agent"
      };

      // Create agent profile linked to auth user  
      const { data: agentProfile, error: profileError } = await supabase
        .from("agent_profiles")
        .insert({
          user_id: user.id, // This now links to auth.users.id
          full_name: userData.fullName,
          phone: userData.phone,
          region: userData.region,
          commission_rate: parseFloat(userData.commissionRate || "2.5"),
          collection_commission_rate: parseFloat(userData.collectionCommissionRate || "1.0"),
          total_sales: 0,
          total_commission_earned: 0,
          pending_commission: 0,
          is_suspended: false,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id, // Auth user ID
        agent_id: agentProfile.id,
        title: "Welcome to Gladfore Agent Network!",
        message: `Your agent account has been created. Commission rate: ${userData.commissionRate || "2.5"}%`,
        type: "general",
      });

      // Create audit log
      await supabase.from("audit_logs").insert({
        action: "agent_created",
        entity_type: "agent",
        entity_id: agentProfile.id,
        new_values: {
          fullName: userData.fullName,
          phone: userData.phone,
          region: userData.region,
        },
      });

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({
          user: {
            id: agentProfile.id,
            fullName: userData.fullName,
            phone: userData.phone,
            email: userData.email,
            password: generatedPassword,
            role: "agent",
          },
        }),
      };

    } else {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "Invalid user type" }),
      };
    }

  } catch (error) {
    console.error("Error creating user:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ 
        error: "Failed to create user",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};