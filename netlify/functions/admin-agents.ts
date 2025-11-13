// netlify/functions/admin-agents.ts
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
    const { data: agents, error } = await supabase
      .from("agent_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ agents: agents || [] }),
    };
  } catch (error) {
    console.error("Error fetching agents:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to fetch agents",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};