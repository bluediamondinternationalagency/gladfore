// netlify/functions/admin-create-user.ts
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin operations
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
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse request body
    const { userType, ...userData } = JSON.parse(event.body || "{}");

    // Generate password
    const generatedPassword = generatePassword();
    const passwordHash = await bcrypt.hash(generatedPassword, 10);

    if (userType === "farmer") {
      // Validate required fields
      if (!userData.fullName || !userData.phone || !userData.farmLocation) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if phone already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("phone", userData.phone)
        .single();

      if (existingUser) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Phone number already registered" }),
        };
      }

      // Create user account
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          phone: userData.phone,
          email: userData.email || null,
          password_hash: passwordHash,
          role: "farmer",
          is_active: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create farmer profile
      const { data: farmerProfile, error: profileError } = await supabase
        .from("farmer_profiles")
        .insert({
          user_id: user.id,
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
          credit_limit: userData.creditLimit || "50000",
          available_credit: userData.creditLimit || "50000",
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
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if phone already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("phone", userData.phone)
        .single();

      if (existingUser) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Phone number already registered" }),
        };
      }

      // Create user account
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          phone: userData.phone,
          email: userData.email || null,
          password_hash: passwordHash,
          role: "agent",
          is_active: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create agent profile
      const { data: agentProfile, error: profileError } = await supabase
        .from("agent_profiles")
        .insert({
          user_id: user.id,
          full_name: userData.fullName,
          phone: userData.phone,
          region: userData.region,
          commission_rate: userData.commissionRate || "2.5",
          collection_commission_rate: userData.collectionCommissionRate || "1.0",
          total_sales: "0",
          total_commission_earned: "0",
          pending_commission: "0",
          is_suspended: false,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id,
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
        body: JSON.stringify({ error: "Invalid user type" }),
      };
    }

  } catch (error) {
    console.error("Error creating user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Failed to create user",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};