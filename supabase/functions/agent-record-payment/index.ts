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
      .select('id, collection_commission_rate')
      .eq('user_id', user.id)
      .single()

    if (agentError || !agentProfile) {
      return new Response(
        JSON.stringify({ error: 'Agent profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get payment data from request body
    const body = await req.json()
    const {
      orderId,
      amount,
      paymentMethod,
      paymentReference,
      notes
    } = body

    // Validate required fields
    if (!orderId || !amount || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (orderId, amount, paymentMethod)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify order exists and belongs to agent's farmer
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, farmer_id, agent_id, total_cost, down_payment, balance, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (order.agent_id !== agentProfile.id) {
      return new Response(
        JSON.stringify({ error: 'You can only record payments for your own farmers' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const paymentAmount = parseFloat(amount)
    const currentBalance = parseFloat(order.balance)

    // Validate payment amount
    if (paymentAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Payment amount must be greater than 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (paymentAmount > currentBalance) {
      return new Response(
        JSON.stringify({ 
          error: 'Payment amount exceeds order balance',
          details: `Order balance: ₦${currentBalance.toFixed(2)}, Payment: ₦${paymentAmount.toFixed(2)}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine payment type
    const downPayment = parseFloat(order.down_payment)
    let paymentType = 'balance_payment'
    
    // Check if this is the first payment (down payment)
    const { count } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('status', 'completed')

    if (count === 0 && paymentAmount >= downPayment * 0.9) {
      paymentType = 'down_payment'
    }

    // Create payment record
    console.log('Creating payment record...')
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        farmer_id: order.farmer_id,
        agent_id: agentProfile.id,
        amount: paymentAmount.toFixed(2),
        payment_type: paymentType,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        status: 'completed',
        processed_at: new Date().toISOString(),
        notes: notes || null
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment insert error:', paymentError)
      throw new Error(`Failed to create payment: ${paymentError.message}`)
    }

    console.log('Payment created:', payment.id)

    // Update order balance
    console.log('Updating order balance...')
    const newBalance = currentBalance - paymentAmount
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        balance: newBalance.toFixed(2),
        status: newBalance <= 0 ? 'completed' : order.status,
        completed_at: newBalance <= 0 ? new Date().toISOString() : null
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Order update error:', updateError)
      throw new Error(`Failed to update order: ${updateError.message}`)
    }

    console.log('Order updated, new balance:', newBalance)

    // Update farmer's available credit (increase by payment amount)
    console.log('Updating farmer available credit...')
    const { data: farmerProfile, error: farmerError } = await supabase
      .from('farmer_profiles')
      .select('available_credit')
      .eq('id', order.farmer_id)
      .single()

    if (farmerError) {
      console.error('Farmer profile fetch error:', farmerError)
    } else if (farmerProfile) {
      const currentAvailableCredit = parseFloat(farmerProfile.available_credit || '0')
      const newAvailableCredit = currentAvailableCredit + paymentAmount
      
      const { error: creditUpdateError } = await supabase
        .from('farmer_profiles')
        .update({ 
          available_credit: newAvailableCredit.toFixed(2),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.farmer_id)

      if (creditUpdateError) {
        console.error('Credit update error:', creditUpdateError)
      } else {
        console.log('Farmer credit updated:', newAvailableCredit)
      }
    }

    // Calculate and record collection commission (collection_commission_rate is stored as percentage, e.g., 1.00 = 1%)
    const commissionRatePercent = parseFloat(agentProfile.collection_commission_rate || '1.00')
    const commissionRate = commissionRatePercent / 100
    const commissionAmount = paymentAmount * commissionRate

    console.log('Creating commission record:', {
      agent_id: agentProfile.id,
      payment_id: payment.id,
      commission_amount: commissionAmount
    })

    const { error: commissionError } = await supabase
      .from('agent_commissions')
      .insert({
        agent_id: agentProfile.id,
        payment_id: payment.id,
        commission_type: 'collection',
        amount: commissionAmount.toFixed(2),
        status: 'pending'
      })

    if (commissionError) {
      console.error('Commission insert error:', commissionError)
      // Don't throw, just log - commission can be added later
    }

    // Update agent total commission
    console.log('Calling increment_agent_commission RPC')
    const { error: rpcError } = await supabase.rpc('increment_agent_commission', {
      agent_uuid: agentProfile.id,
      commission_amount: commissionAmount
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      // Don't throw, just log - commission can be updated later
    }

    // Create notification for farmer
    console.log('Creating notification for farmer:', order.farmer_id)
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: order.farmer_id,
        title: 'Payment Received',
        type: 'order_update',
        message: `Payment of ₦${paymentAmount.toFixed(2)} received for order #${orderId.substring(0, 8)}. ${newBalance > 0 ? `Remaining balance: ₦${newBalance.toFixed(2)}` : 'Order completed!'}`,
        is_read: false
      })

    if (notificationError) {
      console.error('Notification error:', notificationError)
      // Don't throw, just log - notification is not critical
    }

    return new Response(
      JSON.stringify({ 
        message: 'Payment recorded successfully',
        payment: {
          id: payment.id,
          orderId: payment.order_id,
          amount: parseFloat(payment.amount),
          paymentType: payment.payment_type,
          paymentMethod: payment.payment_method,
          status: payment.status,
          processedAt: payment.processed_at
        },
        order: {
          id: orderId,
          newBalance,
          status: newBalance <= 0 ? 'completed' : order.status
        },
        commission: {
          amount: commissionAmount,
          rate: commissionRate * 100 + '%'
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error recording payment:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to record payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
