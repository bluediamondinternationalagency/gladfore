// netlify/functions/admin-payments.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        *,
        order:orders (
          id
        ),
        farmer:farmer_profiles!farmer_id (
          id,
          full_name
        ),
        agent:agent_profiles!agent_id (
          id,
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ payments: payments || [] }),
    };
  } catch (error) {
    console.error("Error fetching payments:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to fetch payments",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};