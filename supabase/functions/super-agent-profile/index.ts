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

    const accessToken = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    console.log('Auth result:', { user: user?.id, error: userError?.message });

    if (userError || !user) {
      console.error('Authentication failed:', {
        error: userError,
        hasAuthHeader: !!authHeader,
        authHeaderStart: authHeader?.substring(0, 20)
      });
      throw new Error(`Unauthorized: ${userError?.message || 'No user found'}`);
    }

    // Check role from user_metadata
    const role = user.user_metadata?.role;
    console.log('User role from metadata:', role, 'User ID:', user.id);
    
    if (role !== "super_agent") {
      throw new Error(`Access denied. Super agent role required. Current role: ${role}`);
    }

    // Get super agent profile
    const { data: profile, error: profileError } = await supabase
      .from("super_agent_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}. Code: ${profileError.code}`);
    }

    // Get assigned agents with their details from agent_profiles using LEFT JOIN
    const { data: assignments, error: assignmentsError } = await supabase
      .from("agent_assignments")
      .select(`
        agent_id,
        assigned_at
      `)
      .eq("super_agent_id", user.id);

    if (assignmentsError) {
      console.error("Assignments fetch error:", assignmentsError);
    }

    // Get agent details for each assignment
    let assignmentsWithDetails = [];
    if (assignments && assignments.length > 0) {
      const agentIds = assignments.map((a: any) => a.agent_id);
      const { data: agentProfiles } = await supabase
        .from("agent_profiles")
        .select("user_id, full_name, phone, region")
        .in("user_id", agentIds);

      assignmentsWithDetails = assignments.map((assignment: any) => {
        const agentProfile = agentProfiles?.find((ap: any) => ap.user_id === assignment.agent_id);
        return {
          agent_id: assignment.agent_id,
          assigned_at: assignment.assigned_at,
          agent_profiles: agentProfile || null
        };
      });
    }

    return new Response(JSON.stringify({ 
      profile: {
        ...profile,
        assigned_agents_count: assignments?.length || 0,
        assigned_agents: assignmentsWithDetails
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
