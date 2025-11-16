import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

// Generate random password
const generatePassword = (): string => {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Normalize phone to E.164 format with better error handling
const normalizePhoneE164 = (input: string): string => {
  if (!input || input.trim() === '') {
    throw new Error('Phone number is required')
  }
  
  // Remove all whitespace, dashes, parentheses, dots
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '')
  
  // If already in E.164 format with +234 and 10 digits
  if (/^\+234\d{10}$/.test(cleaned)) {
    return cleaned
  }
  
  // If has + with other country code (10-15 digits total)
  if (/^\+\d{10,15}$/.test(cleaned)) {
    return cleaned
  }
  
  // Remove + if present for further processing
  cleaned = cleaned.replace(/^\+/, '')
  
  // If starts with 234 (country code without +)
  if (/^234\d{10}$/.test(cleaned)) {
    return '+' + cleaned
  }
  
  // If starts with 0 (Nigerian local format: 0803...)
  if (/^0\d{10}$/.test(cleaned)) {
    return '+234' + cleaned.substring(1)
  }
  
  // If just 10 digits (assume Nigerian)
  if (/^\d{10}$/.test(cleaned)) {
    return '+234' + cleaned
  }
  
  throw new Error(`Invalid phone format: "${input}". Use: 0803... or +234803...`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createSupabaseClient()
    const { userType, ...userData } = await req.json()

    // Normalize phone number with better error handling
    try {
      userData.phone = normalizePhoneE164(userData.phone)
      
      // Also normalize guarantor phone if present (not empty or undefined)
      if (userData.guarantorPhone && typeof userData.guarantorPhone === 'string' && userData.guarantorPhone.trim()) {
        userData.guarantorPhone = normalizePhoneE164(userData.guarantorPhone)
      } else {
        userData.guarantorPhone = null // Set to null if not provided
      }
    } catch (phoneError) {
      return new Response(
        JSON.stringify({ 
          error: phoneError instanceof Error ? phoneError.message : 'Invalid phone format' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const generatedPassword = generatePassword()

    // Convert cropTypes to array if it's a string
    if (userData.cropTypes && typeof userData.cropTypes === 'string') {
      userData.cropTypes = userData.cropTypes.split(',').map((s: string) => s.trim()).filter((s: string) => s)
    }

    if (userType === 'farmer') {
      if (!userData.fullName || !userData.phone || !userData.farmLocation) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: existingFarmer } = await supabase
        .from('farmer_profiles')
        .select('id')
        .eq('phone', userData.phone)
        .single()

      if (existingFarmer) {
        return new Response(
          JSON.stringify({ error: 'Phone number already registered' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const email = userData.email && userData.email.trim()
        ? userData.email.trim()
        : `${userData.phone.replace(/\+/g, '')}@gladfore-temp.com`

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        phone: userData.phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: userData.fullName,
          role: 'farmer',
          phone: userData.phone,
          created_by_admin: true
        }
      })

      if (authError) throw new Error(`Auth error: ${authError.message}`)
      if (!authUser.user) throw new Error('No user returned')

      const { error: usersTableError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email,
          phone: userData.phone,
          password_hash: '',
          role: 'farmer',
          is_active: true
        })

      if (usersTableError) {
        await supabase.auth.admin.deleteUser(authUser.user.id)
        throw new Error(`User table error: ${usersTableError.message}`)
      }

      const { data: farmerProfile, error: profileError } = await supabase
        .from('farmer_profiles')
        .insert({
          user_id: authUser.user.id,
          full_name: userData.fullName,
          phone: userData.phone,
          farm_size: userData.farmSize,
          farm_location: userData.farmLocation,
          crop_types: userData.cropTypes || [],
          id_type: userData.idType || 'national_id',
          id_number: userData.idNumber || '',
          guarantor_name: userData.guarantorName || '',
          guarantor_phone: userData.guarantorPhone || null,
          guarantor_type: userData.guarantorType || 'chief',
          kyc_status: userData.autoApproveKyc ? 'verified' : 'pending',
          kyc_verified_at: userData.autoApproveKyc ? new Date().toISOString() : null,
          credit_limit: parseFloat(userData.creditLimit || '50000'),
          available_credit: parseFloat(userData.creditLimit || '50000'),
          credit_score: 50,
        })
        .select()
        .single()

      if (profileError) throw profileError

      await supabase.from('notifications').insert({
        user_id: authUser.user.id,
        farmer_id: farmerProfile.id,
        title: 'Welcome to Gladfore!',
        message: userData.autoApproveKyc
          ? `Account approved. Credit limit: ₦${parseFloat(userData.creditLimit || '50000').toLocaleString()}`
          : 'Account created. KYC pending.',
        type: 'general',
      })

      await supabase.from('audit_logs').insert({
        action: 'farmer_created',
        entity_type: 'farmer',
        entity_id: farmerProfile.id,
        new_values: { fullName: userData.fullName, phone: userData.phone },
      })

      return new Response(
        JSON.stringify({
          user: {
            id: farmerProfile.id,
            fullName: userData.fullName,
            phone: userData.phone,
            email: userData.email,
            password: generatedPassword,
            role: 'farmer',
            creditLimit: userData.creditLimit || '50000',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    
    else if (userType === 'agent') {
      if (!userData.fullName || !userData.phone || !userData.region) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: existingAgent } = await supabase
        .from('agent_profiles')
        .select('id')
        .eq('phone', userData.phone)
        .single()

      if (existingAgent) {
        return new Response(
          JSON.stringify({ error: 'Phone number already registered' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const email = userData.email && userData.email.trim()
        ? userData.email.trim()
        : `${userData.phone.replace(/\+/g, '')}@gladfore-temp.com`

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: generatedPassword,
        phone: userData.phone,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: userData.fullName,
          role: 'agent',
          phone: userData.phone,
          created_by_admin: true
        }
      })

      if (authError) throw new Error(`Auth error: ${authError.message}`)
      if (!authUser.user) throw new Error('No user returned')

      const { error: usersTableError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email,
          phone: userData.phone,
          password_hash: '',
          role: 'agent',
          is_active: true
        })

      if (usersTableError) {
        await supabase.auth.admin.deleteUser(authUser.user.id)
        throw new Error(`User table error: ${usersTableError.message}`)
      }

      const { data: agentProfile, error: profileError } = await supabase
        .from('agent_profiles')
        .insert({
          user_id: authUser.user.id,
          full_name: userData.fullName,
          phone: userData.phone,
          region: userData.region,
          commission_rate: parseFloat(userData.commissionRate || '2.5'),
          collection_commission_rate: parseFloat(userData.collectionCommissionRate || '1.0'),
          total_sales: 0,
          total_commission_earned: 0,
          pending_commission: 0,
          is_suspended: false,
        })
        .select()
        .single()

      if (profileError) throw profileError

      await supabase.from('notifications').insert({
        user_id: authUser.user.id,
        agent_id: agentProfile.id,
        title: 'Welcome to Gladfore Agent Network!',
        message: `Agent account created. Commission: ${userData.commissionRate || '2.5'}%`,
        type: 'general',
      })

      await supabase.from('audit_logs').insert({
        action: 'agent_created',
        entity_type: 'agent',
        entity_id: agentProfile.id,
        new_values: { fullName: userData.fullName, phone: userData.phone, region: userData.region },
      })

      return new Response(
        JSON.stringify({
          user: {
            id: agentProfile.id,
            fullName: userData.fullName,
            phone: userData.phone,
            email: userData.email,
            password: generatedPassword,
            role: 'agent',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    
    else {
      return new Response(
        JSON.stringify({ error: 'Invalid user type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error creating user:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error)
    } else {
      errorMessage = String(error)
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create user',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        rawError: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
