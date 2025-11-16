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

    // Get orders for this farmer
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        agent:agent_profiles!agent_id(full_name, phone)
      `)
      .eq('farmer_id', profile.id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch orders', details: ordersError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform snake_case to camelCase for frontend
    const transformedOrders = (orders || []).map((order: any) => ({
      id: order.id,
      farmerId: order.farmer_id,
      agentId: order.agent_id,
      totalCost: order.total_cost,
      downPayment: order.down_payment,
      balance: order.balance,
      status: order.status,
      dueDate: order.due_date,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: order.items,
      agent: order.agent,
    }))

    return new Response(
      JSON.stringify({ orders: transformedOrders }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching farmer orders:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
