// netlify/functions/admin-kyc-pending.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { data: applications, error } = await supabase
      .from("farmer_profiles")
      .select("*")
      .eq("kyc_status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ applications: applications || [] }),
    };
  } catch (error) {
    console.error("Error fetching KYC applications:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Failed to fetch KYC applications",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};