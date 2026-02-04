import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient()

    const { data: farmers, error} = await supabase
      .from('farmer_profiles')
      .select(`
        *,
        agent:agent_profiles!agent_id(id, full_name, phone, region)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return new Response(
      JSON.stringify({ farmers: farmers || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch farmers',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
