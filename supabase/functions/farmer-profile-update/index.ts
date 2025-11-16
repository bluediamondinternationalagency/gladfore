import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

    // Get the update data
    const updateData = await req.json()

    // Get farmer profile to verify ownership
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

    // Build update object with allowed fields (convert camelCase to snake_case)
    const allowedUpdates: any = {}
    
    if (updateData.phone !== undefined) allowedUpdates.phone = updateData.phone
    if (updateData.farmSize !== undefined) allowedUpdates.farm_size = updateData.farmSize
    if (updateData.farmLocation !== undefined) allowedUpdates.farm_location = updateData.farmLocation
    if (updateData.cropTypes !== undefined) allowedUpdates.crop_types = updateData.cropTypes
    if (updateData.idType !== undefined) allowedUpdates.id_type = updateData.idType
    if (updateData.idNumber !== undefined) allowedUpdates.id_number = updateData.idNumber
    if (updateData.guarantorName !== undefined) allowedUpdates.guarantor_name = updateData.guarantorName
    if (updateData.guarantorPhone !== undefined) allowedUpdates.guarantor_phone = updateData.guarantorPhone
    if (updateData.guarantorType !== undefined) allowedUpdates.guarantor_type = updateData.guarantorType

    // Prevent updates to sensitive fields
    // Full name, credit limits, KYC status, etc. should only be updated by admins

    if (Object.keys(allowedUpdates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid fields to update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('farmer_profiles')
      .update(allowedUpdates)
      .eq('id', profile.id)
      .select()
      .single()

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update profile', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform response to camelCase
    const transformedProfile = {
      id: updatedProfile.id,
      userId: updatedProfile.user_id,
      fullName: updatedProfile.full_name,
      phone: updatedProfile.phone,
      farmSize: updatedProfile.farm_size,
      farmLocation: updatedProfile.farm_location,
      cropTypes: updatedProfile.crop_types,
      idNumber: updatedProfile.id_number,
      idType: updatedProfile.id_type,
      guarantorName: updatedProfile.guarantor_name,
      guarantorPhone: updatedProfile.guarantor_phone,
      guarantorType: updatedProfile.guarantor_type,
      kycStatus: updatedProfile.kyc_status,
      creditLimit: updatedProfile.credit_limit,
      creditScore: updatedProfile.credit_score,
      availableCredit: updatedProfile.available_credit,
      createdAt: updatedProfile.created_at,
      updatedAt: updatedProfile.updated_at,
    }

    return new Response(
      JSON.stringify({ profile: transformedProfile }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating farmer profile:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
