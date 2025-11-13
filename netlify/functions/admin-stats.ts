// netlify/functions/admin-stats.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  // Add CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    console.log("Fetching admin stats...");

    // Total farmers
    const { count: totalFarmers } = await supabase
      .from("farmer_profiles")
      .select("*", { count: "exact", head: true });

    // Active farmers (not blacklisted)
    const { count: activeFarmers } = await supabase
      .from("farmer_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_blacklisted", false);

    // Blacklisted farmers
    const { count: blacklistedFarmers } = await supabase
      .from("farmer_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_blacklisted", true);

    // Total agents
    const { count: totalAgents } = await supabase
      .from("agent_profiles")
      .select("*", { count: "exact", head: true });

    // Pending KYC
    const { count: pendingKyc } = await supabase
      .from("farmer_profiles")
      .select("*", { count: "exact", head: true })
      .eq("kyc_status", "pending");

    // Verified farmers
    const { count: verifiedFarmers } = await supabase
      .from("farmer_profiles")
      .select("*", { count: "exact", head: true })
      .eq("kyc_status", "verified");

    // Active orders
    const { count: activeOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["approved", "delivered"]);

    // Pending orders
    const { count: pendingOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Total outstanding
    const { data: outstandingData } = await supabase
      .from("orders")
      .select("balance")
      .in("status", ["approved", "delivered"]);
    
    const totalOutstanding = outstandingData?.reduce(
      (sum, order) => sum + parseFloat(order.balance || "0"),
      0
    ) || 0;

    // Total collected
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "completed");
    
    const totalCollected = paymentsData?.reduce(
      (sum, payment) => sum + parseFloat(payment.amount || "0"),
      0
    ) || 0;

    // Total revenue
    const { data: revenueData } = await supabase
      .from("orders")
      .select("total_cost")
      .in("status", ["approved", "delivered", "completed"]);
    
    const totalRevenue = revenueData?.reduce(
      (sum, order) => sum + parseFloat(order.total_cost || "0"),
      0
    ) || 0;

    // Monthly revenue (current month)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { data: monthlyData } = await supabase
      .from("orders")
      .select("total_cost")
      .in("status", ["approved", "delivered", "completed"])
      .gte("created_at", firstDayOfMonth.toISOString());
    
    const monthlyRevenue = monthlyData?.reduce(
      (sum, order) => sum + parseFloat(order.total_cost || "0"),
      0
    ) || 0;

    // Collection rate
    const collectionRate = totalRevenue > 0 
      ? Math.round((totalCollected / totalRevenue) * 100) 
      : 0;

    // Default rate (overdue orders)
    const { count: overdueOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["approved", "delivered"])
      .lt("due_date", new Date().toISOString())
      .gt("balance", "0");
    
    const defaultRate = (activeOrders || 0) > 0 
      ? Math.round(((overdueOrders || 0) / (activeOrders || 1)) * 100) 
      : 0;

    const stats = {
      totalFarmers: totalFarmers || 0,
      activeFarmers: activeFarmers || 0,
      blacklistedFarmers: blacklistedFarmers || 0,
      totalAgents: totalAgents || 0,
      activeOrders: activeOrders || 0,
      pendingOrders: pendingOrders || 0,
      totalOutstanding: totalOutstanding.toString(),
      totalCollected: totalCollected.toString(),
      collectionRate,
      defaultRate,
      pendingKyc: pendingKyc || 0,
      verifiedFarmers: verifiedFarmers || 0,
      totalRevenue: totalRevenue.toString(),
      monthlyRevenue: monthlyRevenue.toString(),
    };

    console.log("Stats fetched successfully:", stats);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ stats }),
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to fetch stats",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};