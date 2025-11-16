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

    // Get farmer profile using user_id
    const { data: profile, error: profileError } = await supabase
      .from('farmer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Farmer profile not found', details: profileError.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform snake_case to camelCase for frontend
    const transformedProfile = {
      id: profile.id,
      userId: profile.user_id,
      fullName: profile.full_name,
      phone: profile.phone,
      farmSize: profile.farm_size,
      farmLocation: profile.farm_location,
      cropTypes: profile.crop_types,
      idNumber: profile.id_number,
      idType: profile.id_type,
      guarantorName: profile.guarantor_name,
      guarantorPhone: profile.guarantor_phone,
      guarantorType: profile.guarantor_type,
      kycStatus: profile.kyc_status,
      kycVerifiedAt: profile.kyc_verified_at,
      creditLimit: profile.credit_limit,
      creditScore: profile.credit_score,
      availableCredit: profile.available_credit,
      totalSpent: profile.total_spent,
      totalPaid: profile.total_paid,
      defaultCount: profile.default_count,
      isBlacklisted: profile.is_blacklisted,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }

    return new Response(
      JSON.stringify({ profile: transformedProfile }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching farmer profile:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
