import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient()

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        farmer:farmer_profiles(*),
        agent:agent_profiles(*),
        items:order_items(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return new Response(
      JSON.stringify({ orders: orders || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
