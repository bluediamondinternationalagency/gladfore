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

    // Get total farmers count
    const { count: totalFarmers } = await supabase
      .from('farmer_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentProfile.id)

    // Get total orders count
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentProfile.id)

    // Get pending collections (sum of outstanding balances)
    const { data: ordersData } = await supabase
      .from('orders')
      .select('balance')
      .eq('agent_id', agentProfile.id)
      .in('status', ['approved', 'delivered'])

    const pendingCollections = (ordersData || []).reduce((sum, order) => 
      sum + (parseFloat(order.balance) || 0), 0
    )

    // Get monthly orders (current month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: monthlyOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentProfile.id)
      .gte('created_at', startOfMonth.toISOString())

    // Get total commission
    const { data: profileData } = await supabase
      .from('agent_profiles')
      .select('total_commission_earned, pending_commission')
      .eq('id', agentProfile.id)
      .single()

    const totalCommission = parseFloat(profileData?.total_commission_earned || '0')
    const pendingCommission = parseFloat(profileData?.pending_commission || '0')

    // Calculate monthly commission from recent orders
    const { data: monthlyOrdersData } = await supabase
      .from('orders')
      .select('total_cost')
      .eq('agent_id', agentProfile.id)
      .eq('status', 'approved')
      .gte('created_at', startOfMonth.toISOString())

    const monthlyCommission = (monthlyOrdersData || []).reduce((sum, order) => 
      sum + (parseFloat(order.total_cost) * 0.025), 0
    )

    const stats = {
      totalFarmers: totalFarmers || 0,
      totalOrders: totalOrders || 0,
      totalCommission,
      pendingCommission,
      pendingCollections,
      monthlyOrders: monthlyOrders || 0,
      monthlyCommission,
    }

    return new Response(
      JSON.stringify({ stats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching agent stats:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
