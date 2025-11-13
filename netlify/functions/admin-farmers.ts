// netlify/functions/admin-farmers.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

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
    // Debug logging
    console.log("=== DEBUG INFO ===");
    console.log("VITE_SUPABASE_URL exists:", !!process.env.VITE_SUPABASE_URL);
    console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("VITE_SUPABASE_URL value:", process.env.VITE_SUPABASE_URL);
    console.log("Service key length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: "Missing environment variables",
          debug: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey
          }
        }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client created");

    const params = event.queryStringParameters || {};
    const { search, status } = params;

    console.log("Query params:", { search, status });

    const { data: farmers, error } = await supabase
      .from("farmer_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Query executed");
    console.log("Error:", error);
    console.log("Farmers count:", farmers?.length || 0);

    if (error) {
      console.error("Supabase error:", error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: "Supabase query failed",
          details: error.message,
          code: error.code,
          hint: error.hint
        }),
      };
    }

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

    // Filter by KYC status if provided
    if (status && status !== "all") {
      filteredFarmers = filteredFarmers.filter(f => f.kyc_status === status);
    }

    console.log("Filtered farmers count:", filteredFarmers.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ farmers: filteredFarmers }),
    };
  } catch (error) {
    console.error("Caught error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Failed to fetch farmers",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
    };
  }
};