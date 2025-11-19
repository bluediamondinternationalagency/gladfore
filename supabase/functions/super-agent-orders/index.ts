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

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending_super_agent";

    // Build query for orders assigned to this super agent
    let query = supabase
      .from("orders")
      .select("*")
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
      throw new Error(`Failed to fetch orders: ${ordersError.message}. Code: ${ordersError.code}. Details: ${ordersError.details}`);
    }

    // Fetch related data separately
    if (orders && orders.length > 0) {
      const farmerIds = [...new Set(orders.map((o: any) => o.farmer_id).filter(Boolean))];
      const agentIds = [...new Set(orders.map((o: any) => o.agent_id).filter(Boolean))];
      const productIds = [...new Set(orders.map((o: any) => o.product_id).filter(Boolean))];

      const [farmersResult, agentsResult, productsResult] = await Promise.all([
        farmerIds.length > 0 ? supabase.from("farmer_profiles").select("user_id, full_name, phone, village, district").in("user_id", farmerIds) : { data: [] },
        agentIds.length > 0 ? supabase.from("agent_profiles").select("user_id, full_name, phone, region").in("user_id", agentIds) : { data: [] },
        productIds.length > 0 ? supabase.from("products").select("id, name, unit").in("id", productIds) : { data: [] }
      ]);

      // Merge the data
      const ordersWithDetails = orders.map((order: any) => ({
        ...order,
        farmer_profiles: farmersResult.data?.find((f: any) => f.user_id === order.farmer_id) || null,
        agent_profiles: agentsResult.data?.find((a: any) => a.user_id === order.agent_id) || null,
        products: productsResult.data?.find((p: any) => p.id === order.product_id) || null
      }));

      return new Response(JSON.stringify({ orders: ordersWithDetails }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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
