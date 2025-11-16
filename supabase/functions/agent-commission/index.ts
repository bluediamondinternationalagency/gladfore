import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

serve(async (req) => {
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

    // Get agent profile
    const { data: agentProfile, error: agentError } = await supabase
      .from('agent_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (agentError || !agentProfile) {
      return new Response(
        JSON.stringify({ error: 'Agent profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get commission records
    const { data: commissions, error: commissionsError } = await supabase
      .from('agent_commissions')
      .select(`
        id,
        commission_type,
        amount,
        order_id,
        payment_id,
        status,
        created_at
      `)
      .eq('agent_id', agentProfile.id)
      .order('created_at', { ascending: false })

    if (commissionsError) {
      throw commissionsError
    }

    const commissionsData = (commissions || []).map((commission) => ({
      id: commission.id,
      commissionType: commission.commission_type,
      amount: parseFloat(commission.amount || '0'),
      orderId: commission.order_id,
      paymentId: commission.payment_id,
      status: commission.status,
      createdAt: commission.created_at,
    }))

    return new Response(
      JSON.stringify({ commissions: commissionsData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching agent commissions:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch commissions',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
