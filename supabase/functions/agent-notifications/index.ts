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

    // Get last 50 notifications for agent
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select(`
        id,
        message,
        type,
        is_read,
        agent_id,
        created_at
      `)
      .eq('agent_id', agentProfile.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (notificationsError) {
      throw notificationsError
    }

    const notificationsData = (notifications || []).map((notification) => ({
      id: notification.id,
      message: notification.message,
      type: notification.type,
      isRead: notification.is_read,
      agentId: notification.agent_id,
      createdAt: notification.created_at,
    }))

    return new Response(
      JSON.stringify({ notifications: notificationsData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching agent notifications:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
