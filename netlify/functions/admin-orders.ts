// netlify/functions/admin-orders.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const { search, status } = params;

    // Fetch orders with related data
    let query = supabase
      .from("orders")
      .select(`
        *,
        farmer:farmer_profiles!farmer_id (
          id,
          full_name
        ),
        agent:agent_profiles!agent_id (
          id,
          full_name
        ),
        items:order_items (
          id,
          product_name,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order("created_at", { ascending: false });

    // Filter by status if provided
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Format orders for frontend
    const formattedOrders =
      orders?.map((order) => ({
        ...order,
        farmerName: order.farmer?.full_name || "Unknown",
        agentName: order.agent?.full_name,
        items:
          order.items?.map((item: OrderItem) => ({
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
          })) || [],
      })) || [];

    // Client-side search filter
    let filteredOrders = formattedOrders;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredOrders = formattedOrders.filter(
        (o) =>
          o.farmerName?.toLowerCase().includes(searchLower) ||
          o.id?.toLowerCase().includes(searchLower)
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ orders: filteredOrders }),
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to fetch orders",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
