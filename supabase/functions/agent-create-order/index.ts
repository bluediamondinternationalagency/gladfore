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

    // Get order data from request body
    const body = await req.json()
    console.log('Received order request:', JSON.stringify(body))
    
    const {
      farmerId,
      items, // Array of { productId, productName, quantity, unitPrice }
      dueDate,
      deliveryAddress,
      notes
    } = body

    // Validate required fields
    if (!farmerId || !items || !Array.isArray(items) || items.length === 0 || !dueDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (farmerId, items, dueDate)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Step 1: Fetching farmer profile...')
    // Verify farmer exists and belongs to this agent
    const { data: farmer, error: farmerError } = await supabase
      .from('farmer_profiles')
      .select('id, agent_id, credit_limit, available_credit')
      .eq('id', farmerId)
      .single()

    if (farmerError || !farmer) {
      return new Response(
        JSON.stringify({ error: 'Farmer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (farmer.agent_id !== agentProfile.id) {
      return new Response(
        JSON.stringify({ error: 'You can only create orders for your own farmers' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Step 2: Calculating totals...')
    // Calculate totals
    let totalCost = 0
    for (const item of items) {
      const itemTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice)
      totalCost += itemTotal
    }

    // Calculate down payment (50%)
    const downPayment = totalCost * 0.5
    const balance = totalCost - downPayment

    console.log(`Totals - Total: ${totalCost}, Down: ${downPayment}, Balance: ${balance}`)
    console.log(`Available credit: ${farmer.available_credit}`)

    // Check credit availability
    const availableCredit = parseFloat(farmer.available_credit || '0')

    if (balance > availableCredit) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credit limit',
          details: `Available credit: ₦${availableCredit.toFixed(2)}, Required: ₦${balance.toFixed(2)}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Step 3: Creating order...')
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        farmer_id: farmerId,
        agent_id: agentProfile.id,
        total_cost: totalCost.toFixed(2),
        down_payment: downPayment.toFixed(2),
        balance: balance.toFixed(2),
        status: 'pending',
        due_date: dueDate,
        delivery_address: deliveryAddress || null,
        notes: notes || null
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      throw orderError
    }

    console.log('Order created:', order.id)
    console.log('Step 4: Creating order items...')
    
    // Create order items - look up product IDs by name if not provided
    const orderItems = await Promise.all(items.map(async (item) => {
      let productId = item.productId || null
      
      // If no productId provided, try to find product by name
      if (!productId && item.productName) {
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .ilike('name', item.productName.trim())
          .single()
        
        if (product) {
          productId = product.id
        }
      }
      
      return {
        order_id: order.id,
        product_id: productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: parseFloat(item.unitPrice).toFixed(2),
        total_price: (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2)
      }
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      // Rollback: delete the order if items creation fails
      await supabase.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    console.log('Order items created')
    console.log('Step 5: Updating available credit...')
    // Update farmer's available credit (reduce by the balance amount since down payment is paid upfront)
    const newAvailableCredit = availableCredit - balance
    
    const { error: updateCreditError } = await supabase
      .from('farmer_profiles')
      .update({ 
        available_credit: newAvailableCredit.toFixed(2),
        updated_at: new Date().toISOString()
      })
      .eq('id', farmerId)

    if (updateCreditError) {
      console.error('Failed to update available credit:', updateCreditError)
      // Don't rollback the order, just log the error
    }

    // Get super agent for this agent (if assigned)
    const { data: assignment } = await supabase
      .from('agent_assignments')
      .select('super_agent_id')
      .eq('agent_id', user.id)
      .single()

    // Create notification for super agent (if assigned)
    if (assignment?.super_agent_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: assignment.super_agent_id,
          title: 'New Order Pending Review',
          type: 'order_pending_super_agent',
          message: `New order #${order.id.substring(0, 8)} from agent needs your review. Total: ₦${totalCost.toFixed(2)}.`,
          related_id: order.id,
          is_read: false
        })
    }

    // Create notification for farmer
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: farmerId,
        farmer_id: farmerId,
        title: 'New Order Created',
        type: 'order_update',
        message: `New order #${order.id.substring(0, 8)} has been created. Total: ₦${totalCost.toFixed(2)}. Down payment required: ₦${downPayment.toFixed(2)}.`,
        is_read: false
      })
    
    if (notifError) {
      console.error('Failed to create notification:', notifError)
      // Don't fail the whole operation if notification fails
    }

    return new Response(
      JSON.stringify({ 
        message: 'Order created successfully',
        order: {
          id: order.id,
          farmerId: order.farmer_id,
          totalCost: parseFloat(order.total_cost),
          downPayment: parseFloat(order.down_payment),
          balance: parseFloat(order.balance),
          status: order.status,
          dueDate: order.due_date,
          createdAt: order.created_at
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating order:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error && error.stack ? error.stack : errorMessage
    console.error('Error details:', errorStack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create order',
        details: errorMessage,
        stack: errorStack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
