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

// ✨ EDIT START — added E.164 formatter + validator
function normalizePhoneE164(input: string): string | null {
  if (!input) return null;

  // Remove spaces, parentheses, hyphens
  const digits = input.replace(/[^\d+]/g, "");

  // If already starts with + and has 10–15 digits, accept it
  if (/^\+\d{10,15}$/.test(digits)) {
    return digits;
  }

  // If starts with 0 (e.g., 0803…), convert to +234 (Nigeria example)
  if (/^0\d{10}$/.test(digits)) {
    return "+234" + digits.substring(1);
  }

  // If starts with digits only and length looks like a Nigerian number
  if (/^\d{10,11}$/.test(digits)) {
    return "+234" + digits.substring(digits.length - 10);
  }

  // Not valid
  return null;
}
// ✨ EDIT END

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

    // ✨ EDIT START — Normalize phone before doing anything
    const normalizedPhone = normalizePhoneE164(userData.phone);
    if (!normalizedPhone) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "Invalid phone format. Use a valid phone number." }),
      };
    }
    // We overwrite the original phone with the normalized value
    userData.phone = normalizedPhone;
    // ✨ EDIT END

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

      // Check if phone exists
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

      // Create user with normalized phone
      const email = userData.email && userData.email.trim()
        ? userData.email.trim()
        : `${userData.phone.replace(/\+/g, '')}@gladfore-temp.com`;

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: generatedPassword,
        phone: userData.phone, // already normalized
        email_confirm: true,
        phone_confirm: true,
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

      if (!authUser.user) throw new Error("No user returned from Supabase Auth");

      // Update metadata
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

      if (updateError) console.warn("Failed to update user metadata:", updateError);

      // Create user row
      const { error: usersTableError } = await supabase
        .from("users")
        .insert({
          id: authUser.user.id,
          email: email,
          phone: userData.phone,
          password_hash: "",
          role: "farmer",
          is_active: true
        });

      if (usersTableError) {
        console.error("Failed to create user in users table:", usersTableError);
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Failed to create user record: ${usersTableError.message}`);
      }

      const user = {
        id: authUser.user.id,
        email: authUser.user.email,
        phone: userData.phone,
        role: "farmer"
      };

      // Create farmer profile
      const { data: farmerProfile, error: profileError } = await supabase
        .from("farmer_profiles")
        .insert({
          user_id: user.id,
          full_name: userData.fullName,
          phone: userData.phone, // normalized
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
        user_id: user.id,
        farmer_id: farmerProfile.id,
        title: "Welcome to Gladfore!",
        message: userData.autoApproveKyc
          ? `Your account has been created and approved. You have a credit limit of ₦${parseFloat(userData.creditLimit || "50000").toLocaleString()}.`
          : "Your account has been created. KYC verification is pending.",
        type: "general",
      });

      // Audit log
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
    }

    // AGENT BRANCH — same phone normalization applies automatically because we overwrote userData.phone
    else if (userType === "agent") {

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

      const email = userData.email && userData.email.trim()
        ? userData.email.trim()
        : `${userData.phone.replace(/\+/g, '')}@gladfore-temp.com`;

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: generatedPassword,
        phone: userData.phone, // normalized
        email_confirm: true,
        phone_confirm: true,
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

      if (!authUser.user) throw new Error("No user returned from Supabase Auth");

      await supabase.auth.admin.updateUserById(
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

      const { error: usersTableError } = await supabase
        .from("users")
        .insert({
          id: authUser.user.id,
          email: email,
          phone: userData.phone,
          password_hash: "",
          role: "agent",
          is_active: true
        });

      if (usersTableError) {
        await supabase.auth.admin.deleteUser(authUser.user.id);
        throw new Error(`Failed to create user record: ${usersTableError.message}`);
      }

      const user = {
        id: authUser.user.id,
        email: authUser.user.email,
        phone: userData.phone,
        role: "agent"
      };

      const { data: agentProfile, error: profileError } = await supabase
        .from("agent_profiles")
        .insert({
          user_id: user.id,
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

      await supabase.from("notifications").insert({
        user_id: user.id,
        agent_id: agentProfile.id,
        title: "Welcome to Gladfore Agent Network!",
        message: `Your agent account has been created. Commission rate: ${userData.commissionRate || "2.5"}%`,
        type: "general",
      });

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
    }

    // Invalid user type
    else {
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
