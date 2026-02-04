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

    const userRole = user.user_metadata?.role
    let isSuperAgent = userRole === 'super_agent'

    if (!isSuperAgent) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      isSuperAgent = userData?.role === 'super_agent'
    }

    if (!isSuperAgent) {
      return new Response(
        JSON.stringify({ error: 'Super agent access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('agent_assignments')
      .select('agent_id')
      .eq('super_agent_id', user.id)

    if (assignmentsError) {
      throw assignmentsError
    }

    const agentUserIds = (assignments || []).map((a: { agent_id: string }) => a.agent_id)
    if (agentUserIds.length === 0) {
      return new Response(JSON.stringify({ farmers: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: agentProfiles, error: agentProfilesError } = await supabase
      .from('agent_profiles')
      .select('id, user_id, full_name, phone, region')
      .in('user_id', agentUserIds)

    if (agentProfilesError) {
      throw agentProfilesError
    }

    const agentProfileIds = (agentProfiles || []).map((ap: { id: string }) => ap.id)
    if (agentProfileIds.length === 0) {
      return new Response(JSON.stringify({ farmers: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
        created_at,
        agent_id
      `)
      .in('agent_id', agentProfileIds)
      .order('created_at', { ascending: false })

    if (farmersError) {
      throw farmersError
    }

    const farmersWithStats = await Promise.all(
      (farmers || []).map(async (farmer: {
        id: string
        full_name: string
        phone: string | null
        farm_size: string | null
        farm_location: string | null
        crop_types: string[] | null
        credit_limit: string | null
        available_credit: string | null
        kyc_status: string | null
        agent_id: string | null
      }) => {
        const { count: orderCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('farmer_id', farmer.id)

        const { data: ordersData } = await supabase
          .from('orders')
          .select('balance')
          .eq('farmer_id', farmer.id)
          .in('status', ['approved', 'delivered'])

        const outstandingBalance = (ordersData || []).reduce(
          (sum: number, order: { balance: string }) => sum + (parseFloat(order.balance) || 0),
          0
        )

        const agentProfile = agentProfiles?.find((ap: { id: string }) => ap.id === farmer.agent_id)

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
          agent: agentProfile ? {
            id: agentProfile.id,
            userId: agentProfile.user_id,
            fullName: agentProfile.full_name,
            phone: agentProfile.phone,
            region: agentProfile.region,
          } : null,
        }
      })
    )

    return new Response(
      JSON.stringify({ farmers: farmersWithStats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching super agent farmers:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch farmers',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
