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

    // Get orders with farmer details
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        farmer_id,
        total_cost,
        down_payment,
        balance,
        status,
        due_date,
        delivery_date,
        delivery_address,
        notes,
        created_at,
        farmer_profiles!inner(full_name)
      `)
      .eq('agent_id', agentProfile.id)
      .order('created_at', { ascending: false })

    if (ordersError) {
      throw ordersError
    }

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select(`
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          `)
          .eq('order_id', order.id)

        return {
          id: order.id,
          farmerId: order.farmer_id,
          farmerName: order.farmer_profiles?.full_name || 'Unknown',
          totalCost: parseFloat(order.total_cost || '0'),
          downPayment: parseFloat(order.down_payment || '0'),
          balance: parseFloat(order.balance || '0'),
          status: order.status,
          dueDate: order.due_date,
          deliveryDate: order.delivery_date,
          deliveryAddress: order.delivery_address,
          notes: order.notes,
          createdAt: order.created_at,
          items: (items || []).map((item) => ({
            id: item.id,
            productName: item.product_name,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price || '0'),
            totalPrice: parseFloat(item.total_price || '0'),
          })),
        }
      })
    )

    return new Response(
      JSON.stringify({ orders: ordersWithItems }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching agent orders:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
