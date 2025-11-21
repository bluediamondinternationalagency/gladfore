import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  waitlistId: string;
  creditLimit?: number;
  rejectionReason?: string;
  action: "approve" | "reject";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify admin user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: adminData } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!adminData || adminData.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { waitlistId, action, creditLimit, rejectionReason }: ApprovalRequest =
      await req.json();

    // Get waitlist entry
    const { data: waitlistEntry, error: fetchError } = await supabaseAdmin
      .from("waitlist")
      .select("*")
      .eq("id", waitlistId)
      .single();

    if (fetchError || !waitlistEntry) {
      throw new Error("Waitlist entry not found");
    }

    if (waitlistEntry.status !== "pending" && waitlistEntry.status !== "under_review") {
      throw new Error("Entry has already been processed");
    }

    if (action === "reject") {
      // Reject application
      const { error: rejectError } = await supabaseAdmin
        .from("waitlist")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", waitlistId);

      if (rejectError) throw rejectError;

      return new Response(
        JSON.stringify({ success: true, message: "Application rejected" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // APPROVE ACTION
    const password = generatePassword();

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: waitlistEntry.email || \`\${waitlistEntry.phone}@gladfore.temp\`,
      phone: waitlistEntry.phone,
      password: password,
      email_confirm: true,
      phone_confirm: true,
    });

    if (authError) {
      throw new Error(\`Failed to create user: \${authError.message}\`);
    }

    const newUserId = authUser.user.id;

    // Create user profile based on type
    if (waitlistEntry.user_type === "farmer") {
      const { error: farmerError } = await supabaseAdmin.from("farmers").insert({
        id: newUserId,
        full_name: waitlistEntry.full_name,
        phone: waitlistEntry.phone,
        email: waitlistEntry.email,
        farm_size: waitlistEntry.farm_size,
        farm_location: waitlistEntry.farm_location || \`\${waitlistEntry.town_village}, \${waitlistEntry.lga}, \${waitlistEntry.state}\`,
        crop_types: waitlistEntry.crop_types,
        id_type: waitlistEntry.id_type,
        id_number: waitlistEntry.id_number,
        guarantor_name: waitlistEntry.guarantor_name,
        guarantor_phone: waitlistEntry.guarantor_phone,
        kyc_status: "pending",
        credit_limit: creditLimit?.toString() || "50000",
        credit_score: calculateCreditScore(waitlistEntry),
      });

      if (farmerError) throw farmerError;

      await supabaseAdmin.from("users").insert({
        id: newUserId,
        email: waitlistEntry.email,
        phone: waitlistEntry.phone,
        full_name: waitlistEntry.full_name,
        role: "farmer",
      });
    } else if (waitlistEntry.user_type === "agent") {
      await supabaseAdmin.from("agent_profiles").insert({
        id: newUserId,
        full_name: waitlistEntry.full_name,
        phone: waitlistEntry.phone,
        email: waitlistEntry.email,
        region: \`\${waitlistEntry.lga}, \${waitlistEntry.state}\`,
        status: "active",
      });

      await supabaseAdmin.from("users").insert({
        id: newUserId,
        email: waitlistEntry.email,
        phone: waitlistEntry.phone,
        full_name: waitlistEntry.full_name,
        role: "agent",
      });
    }

    // Update waitlist entry
    await supabaseAdmin
      .from("waitlist")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        user_id: newUserId,
        credentials_sent: true,
        credentials_sent_at: new Date().toISOString(),
      })
      .eq("id", waitlistId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Application approved and user created",
        userId: newUserId,
        credentials: { phone: waitlistEntry.phone, password },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

function generatePassword(): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

function calculateCreditScore(waitlist: any): number {
  let score = 50;
  if (waitlist.years_of_farming_experience) {
    score += Math.min(waitlist.years_of_farming_experience * 2, 20);
  }
  if (waitlist.land_ownership === "owned") score += 15;
  if (waitlist.has_bank_account) score += 10;
  if (waitlist.nin) score += 5;
  return Math.min(score, 100);
}
