import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient()
    
    // Get the authenticated user from the request
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

    // Get farmer profile to get farmer_id
    const { data: profile, error: profileError } = await supabase
      .from('farmer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Farmer profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get payments for this farmer's orders
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        order:orders!order_id(id, total_cost)
      `)
      .eq('farmer_id', profile.id)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payments', details: paymentsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform snake_case to camelCase for frontend
    const transformedPayments = (payments || []).map((payment: any) => ({
      id: payment.id,
      orderId: payment.order_id,
      farmerId: payment.farmer_id,
      amount: payment.amount,
      paymentType: payment.payment_type,
      paymentMethod: payment.payment_method,
      status: payment.status,
      createdAt: payment.created_at,
      order: payment.order,
    }))

    return new Response(
      JSON.stringify({ payments: transformedPayments }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching farmer payments:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch payments',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
