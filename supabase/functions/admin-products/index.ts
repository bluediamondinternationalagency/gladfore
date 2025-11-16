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

    // Verify user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // Get all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true })

      if (productsError) {
        throw productsError
      }

      const productsData = (products || []).map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        unitPrice: parseFloat(product.unit_price || '0'),
        unitMeasure: product.unit_measure,
        stockQuantity: product.stock_quantity,
        isAvailable: product.is_available,
        createdAt: product.created_at,
      }))

      return new Response(
        JSON.stringify({ products: productsData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      // Create new product
      const body = await req.json()
      const { name, description, category, unitPrice, unitMeasure, stockQuantity, isAvailable } = body

      if (!name || !unitPrice) {
        return new Response(
          JSON.stringify({ error: 'Name and unit price are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: product, error: createError } = await supabase
        .from('products')
        .insert({
          name,
          description: description || null,
          category: category || 'Fertilizer',
          unit_price: parseFloat(unitPrice).toFixed(2),
          unit_measure: unitMeasure || '50kg bag',
          stock_quantity: stockQuantity || 0,
          is_available: isAvailable !== undefined ? isAvailable : true
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      return new Response(
        JSON.stringify({ 
          message: 'Product created successfully',
          product: {
            id: product.id,
            name: product.name,
            unitPrice: parseFloat(product.unit_price)
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PUT') {
      // Update product
      const body = await req.json()
      const { id, name, description, category, unitPrice, unitMeasure, stockQuantity, isAvailable } = body

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Product ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: any = { updated_at: new Date().toISOString() }
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (category !== undefined) updateData.category = category
      if (unitPrice !== undefined) updateData.unit_price = parseFloat(unitPrice).toFixed(2)
      if (unitMeasure !== undefined) updateData.unit_measure = unitMeasure
      if (stockQuantity !== undefined) updateData.stock_quantity = stockQuantity
      if (isAvailable !== undefined) updateData.is_available = isAvailable

      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({ message: 'Product updated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      // Delete product
      const url = new URL(req.url)
      const id = url.searchParams.get('id')

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Product ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      return new Response(
        JSON.stringify({ message: 'Product deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error managing products:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to manage products',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
