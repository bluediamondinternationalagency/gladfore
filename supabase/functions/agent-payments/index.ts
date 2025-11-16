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

    // Get payments with order and farmer details
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        order_id,
        amount,
        payment_method,
        payment_reference,
        payment_type,
        status,
        processed_at,
        notes,
        created_at,
        orders!inner(
          id,
          farmer_id,
          total_cost,
          balance,
          farmer_profiles!inner(full_name)
        )
      `)
      .eq('orders.agent_id', agentProfile.id)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      throw paymentsError
    }

    const paymentsData = (payments || []).map((payment) => ({
      id: payment.id,
      orderId: payment.order_id,
      amount: parseFloat(payment.amount || '0'),
      paymentMethod: payment.payment_method,
      paymentReference: payment.payment_reference,
      paymentType: payment.payment_type,
      status: payment.status,
      processedAt: payment.processed_at,
      notes: payment.notes,
      createdAt: payment.created_at,
      orderTotal: parseFloat(payment.orders?.total_cost || '0'),
      orderBalance: parseFloat(payment.orders?.balance || '0'),
      farmerName: payment.orders?.farmer_profiles?.full_name || 'Unknown',
    }))

    return new Response(
      JSON.stringify({ payments: paymentsData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching agent payments:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
