// @ts-ignore - Deno runtime import
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin role from user metadata or users table
    const userRole = user.user_metadata?.role
    let isAdmin = userRole === 'admin'

    if (!isAdmin) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      isAdmin = userData?.role === 'admin'
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { agentProfileId, farmerIds } = await req.json()

    if (!Array.isArray(farmerIds) || farmerIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Farmer IDs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let agentProfile: { id: string; full_name: string } | null = null

    if (agentProfileId) {
      const { data: agentData, error: agentError } = await supabase
        .from('agent_profiles')
        .select('id, full_name')
        .eq('id', agentProfileId)
        .single()

      if (agentError || !agentData) {
        return new Response(
          JSON.stringify({ error: 'Agent profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      agentProfile = agentData
    }

    const { data: updatedFarmers, error: updateError } = await supabase
      .from('farmer_profiles')
      .update({ agent_id: agentProfileId || null })
      .in('id', farmerIds)
      .select('id, full_name, phone, agent_id')

    if (updateError) {
      throw updateError
    }

    const actionMessage = agentProfile
      ? `${updatedFarmers?.length || 0} farmer(s) assigned to ${agentProfile.full_name}`
      : `${updatedFarmers?.length || 0} farmer(s) unassigned`

    return new Response(
      JSON.stringify({
        success: true,
        message: actionMessage,
        farmers: updatedFarmers || [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to assign farmers',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
