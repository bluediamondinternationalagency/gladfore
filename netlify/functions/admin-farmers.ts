// netlify/functions/admin-farmers.ts
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
    const params = event.queryStringParameters || {};
    const { search, status } = params;

    let query = supabase
      .from("farmer_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by KYC status if provided
    if (status && status !== "all") {
      query = query.eq("kyc_status", status);
    }

    const { data: farmers, error } = await query;

    if (error) throw error;

    // Client-side search filter
    let filteredFarmers = farmers || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFarmers = farmers?.filter(f => 
        f.full_name?.toLowerCase().includes(searchLower) ||
        f.phone?.includes(search) ||
        f.farm_location?.toLowerCase().includes(searchLower)
      ) || [];
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ farmers: filteredFarmers }),
    };
  } catch (error) {
    console.error("Error fetching farmers:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Failed to fetch farmers",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
    };
  }
};