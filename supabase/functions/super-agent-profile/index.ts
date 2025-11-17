import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const role = user.user_metadata?.role;
    if (role !== "super_agent") {
      throw new Error("Access denied. Super agent role required.");
    }

    // Get super agent profile
    const { data: profile, error: profileError } = await supabase
      .from("super_agent_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch profile");
    }

    // Get assigned agents with their details from agent_profiles
    const { data: assignments, error: assignmentsError } = await supabase
      .from("agent_assignments")
      .select(`
        agent_id,
        assigned_at,
        agent_profiles!agent_assignments_agent_id_fkey(
          full_name,
          phone,
          region
        )
      `)
      .eq("super_agent_id", user.id);

    if (assignmentsError) {
      console.error("Assignments fetch error:", assignmentsError);
    }

    return new Response(JSON.stringify({ 
      profile: {
        ...profile,
        assigned_agents_count: assignments?.length || 0,
        assigned_agents: assignments || []
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
