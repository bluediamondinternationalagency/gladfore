import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient()

    // Get counts
    const [
      { count: totalFarmers },
      { count: totalAgents },
      { count: totalOrders },
      { count: pendingKyc },
    ] = await Promise.all([
      supabase.from('farmer_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('agent_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('farmer_profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'pending'),
    ])

    // Get financial data
    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, status')

    const totalSales = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
    const pendingPayments = orders?.filter(o => o.status === 'pending').reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

    const stats = {
      totalFarmers: totalFarmers || 0,
      totalAgents: totalAgents || 0,
      totalOrders: totalOrders || 0,
      pendingKyc: pendingKyc || 0,
      totalSales,
      pendingPayments,
    }

    return new Response(
      JSON.stringify({ stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
