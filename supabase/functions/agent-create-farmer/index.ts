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

    console.log('Agent lookup - user.id:', user.id)
    console.log('Agent lookup - agentProfile:', agentProfile)
    console.log('Agent lookup - agentError:', agentError)

    if (agentError || !agentProfile) {
      return new Response(
        JSON.stringify({ error: 'Agent profile not found', userId: user.id, details: agentError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get farmer data from request body
    const body = await req.json()
    console.log('Request body:', body)
    
    const {
      email,
      password,
      fullName,
      phone,
      farmSize,
      farmLocation,
      cropTypes,
      idType,
      idNumber,
      guarantorName,
      guarantorPhone,
      guarantorType,
      creditLimit
    } = body

    // Validate required fields
    if (!email || !password || !fullName || !phone || !farmLocation) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create auth user
    const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: 'farmer'
      }
    })

    if (createAuthError || !authData.user) {
      return new Response(
        JSON.stringify({ error: createAuthError?.message || 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Create entry in public.users table (required for foreign key constraint)
    const { error: publicUserError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        phone,
        password_hash: 'managed_by_supabase_auth',
        role: 'farmer',
        is_active: true
      })

    if (publicUserError) {
      console.error('Failed to create public.users entry:', publicUserError)
      // Rollback: delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile', details: publicUserError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Public user entry created')

    // Create farmer profile
    const farmerCreditLimit = creditLimit || '100000'
    const { data: farmerProfile, error: profileError } = await supabase
      .from('farmer_profiles')
      .insert({
        user_id: authData.user.id,
        agent_id: agentProfile.id,
        full_name: fullName,
        phone,
        farm_size: farmSize || null,
        farm_location: farmLocation,
        crop_types: cropTypes || null,
        id_type: idType || 'national_id',
        id_number: idNumber || 'pending',
        guarantor_name: guarantorName || null,
        guarantor_phone: guarantorPhone || null,
        guarantor_type: guarantorType || null,
        credit_limit: farmerCreditLimit,
        available_credit: farmerCreditLimit,
        kyc_status: 'pending'
      })
      .select()
      .single()

    if (profileError) {
      // Rollback: delete both public.users and auth user if profile creation fails
      await supabase.from('users').delete().eq('id', authData.user.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return new Response(
      JSON.stringify({ 
        message: 'Farmer created successfully',
        farmer: {
          id: farmerProfile.id,
          userId: authData.user.id,
          email: authData.user.email,
          fullName: farmerProfile.full_name,
          phone: farmerProfile.phone,
          kycStatus: farmerProfile.kyc_status
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating farmer:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorDetails = error instanceof Error && error.stack ? error.stack : errorMessage
    console.error('Error details:', errorDetails)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create farmer',
        details: errorMessage,
        stack: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
