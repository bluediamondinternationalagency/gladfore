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

    // Get farmers with their stats
    const { data: farmers, error: farmersError } = await supabase
      .from('farmer_profiles')
      .select(`
        id,
        full_name,
        phone,
        farm_size,
        farm_location,
        crop_types,
        credit_limit,
        available_credit,
        kyc_status,
        created_at
      `)
      .eq('agent_id', agentProfile.id)
      .order('created_at', { ascending: false })

    if (farmersError) {
      throw farmersError
    }

    // Get order counts and outstanding balances for each farmer
    const farmersWithStats = await Promise.all(
      (farmers || []).map(async (farmer) => {
        // Count orders
        const { count: orderCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('farmer_id', farmer.id)

        // Sum outstanding balance
        const { data: ordersData } = await supabase
          .from('orders')
          .select('balance')
          .eq('farmer_id', farmer.id)
          .in('status', ['approved', 'delivered'])

        const outstandingBalance = (ordersData || []).reduce((sum, order) => 
          sum + (parseFloat(order.balance) || 0), 0
        )

        return {
          id: farmer.id,
          fullName: farmer.full_name,
          phone: farmer.phone,
          farmSize: farmer.farm_size,
          farmLocation: farmer.farm_location,
          cropTypes: farmer.crop_types,
          creditLimit: parseFloat(farmer.credit_limit || '0'),
          creditUsed: outstandingBalance,
          availableCredit: parseFloat(farmer.available_credit || '0'),
          kycStatus: farmer.kyc_status,
          orderCount: orderCount || 0,
          outstandingBalance,
        }
      })
    )

    return new Response(
      JSON.stringify({ farmers: farmersWithStats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching agent farmers:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch farmers',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
