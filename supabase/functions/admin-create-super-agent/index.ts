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

    // Verify admin role from user metadata or users table
    const userRole = user.user_metadata?.role
    
    // If not in metadata, check users table
    let isAdmin = userRole === 'admin'
    
    if (!isAdmin) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      
      isAdmin = userData?.role === 'admin'
    }
    
    if (!isAdmin) {
      console.error('Access denied for user:', user.id, 'metadata role:', userRole)
      return new Response(
        JSON.stringify({ 
          error: 'Admin access required',
          debug: {
            userId: user.id,
            metadataRole: userRole,
            email: user.email
          }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const { fullName, phone, email, password, region } = await req.json()

      if (!fullName || !phone || !password) {
        return new Response(
          JSON.stringify({ error: 'Full name, phone, and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create auth user with super_agent role
      const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
        email: email || `${phone}@gladfore.com`,
        phone: phone,
        password: password,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          role: 'super_agent',
          full_name: fullName,
          phone: phone,
        }
      })

      if (createError) {
        console.error('User creation error:', createError)
        throw new Error(createError.message)
      }

      // Create super agent profile
      const { data: profile, error: profileError } = await supabase
        .from('super_agent_profiles')
        .insert({
          user_id: authUser.user.id,
          full_name: fullName,
          phone: phone,
          region: region || null,
        })
        .select()
        .single()

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Rollback: delete the auth user
        await supabase.auth.admin.deleteUser(authUser.user.id)
        throw new Error('Failed to create super agent profile')
      }

      // Create entry in users table (for compatibility)
      await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          phone: phone,
          email: email || `${phone}@gladfore.com`,
          role: 'super_agent',
          is_active: true,
        })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Super agent created successfully',
          superAgent: {
            id: profile.id,
            user_id: authUser.user.id,
            full_name: profile.full_name,
            phone: profile.phone,
            region: profile.region,
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // Get all super agents
      const { data: superAgents, error: fetchError } = await supabase
        .from('super_agent_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        // Return empty array if table doesn't exist yet
        if (fetchError.code === '42P01') {
          return new Response(
            JSON.stringify({ superAgents: [], message: 'Super agent table not yet created. Please run the migration.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw fetchError
      }

      return new Response(
        JSON.stringify({ superAgents: superAgents || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
