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

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending_super_agent";

    // Build query for orders assigned to this super agent
    let query = supabase
      .from("orders")
      .select(`
        *,
        farmer_profiles!orders_farmer_id_fkey(full_name, phone, village, district),
        agent_profiles!orders_agent_id_fkey(full_name, phone, region),
        products(name, unit)
      `)
      .eq("super_agent_id", user.id)
      .order("created_at", { ascending: false });

    // Filter by status - default to pending review
    if (status === "pending_super_agent") {
      query = query
        .is("super_agent_approved_at", null)
        .is("super_agent_rejected_at", null);
    } else if (status === "approved_by_super_agent") {
      query = query.not("super_agent_approved_at", "is", null);
    } else if (status === "rejected_by_super_agent") {
      query = query.not("super_agent_rejected_at", "is", null);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);
      throw new Error("Failed to fetch orders: " + ordersError.message);
    }

    return new Response(JSON.stringify({ orders: orders || [] }), {
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
