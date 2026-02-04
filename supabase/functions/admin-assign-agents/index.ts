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
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { superAgentId, agentIds } = await req.json()

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Agent IDs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (superAgentId) {
      const { data: superAgent, error: superAgentError } = await supabase
        .from('super_agent_profiles')
        .select('user_id')
        .eq('user_id', superAgentId)
        .single()

      if (superAgentError || !superAgent) {
        return new Response(
          JSON.stringify({ error: 'Super agent not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get agent user IDs from agent_profiles
    const { data: agents, error: agentsError } = await supabase
      .from('agent_profiles')
      .select('id, user_id, full_name')
      .in('user_id', agentIds)

    if (agentsError || !agents || agents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid agents found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove existing assignments for these agents
    const { error: deleteError } = await supabase
      .from('agent_assignments')
      .delete()
      .in('agent_id', agentIds)

    if (deleteError) {
      console.error('Delete error:', deleteError)
    }

    let newAssignments: any[] | null = null

    if (superAgentId) {
      const assignments = agentIds.map(agentId => ({
        super_agent_id: superAgentId,
        agent_id: agentId,
      }))

      const { data, error: assignError } = await supabase
        .from('agent_assignments')
        .insert(assignments)
        .select()

      if (assignError) {
        console.error('Assignment error:', assignError)
        throw new Error('Failed to assign agents')
      }

      newAssignments = data || []

      // Notify each agent
      const notifications = agentIds.map(agentId => ({
        user_id: agentId,
        title: 'Assigned to Super Agent',
        message: 'You have been assigned to a super agent. Your orders will now be reviewed by your super agent before admin approval.',
        type: 'assignment_update',
      }))

      await supabase.from('notifications').insert(notifications)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: superAgentId
          ? `${agentIds.length} agent(s) assigned successfully`
          : `${agentIds.length} agent(s) unassigned successfully`,
        assignments: newAssignments,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to assign agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
