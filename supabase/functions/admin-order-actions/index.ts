import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabase.ts'

interface ActionRequest {
  orderId: string;
  action: "approve" | "reject" | "deliver" | "cancel" | "add_note";
  reason?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body: ActionRequest = await req.json();
      const { orderId, action, reason, notes } = body;

      if (!orderId || !action) {
        return new Response(
          JSON.stringify({ error: "orderId and action are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current order details
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          farmer:farmer_profiles!farmer_id (
            id,
            full_name,
            available_credit,
            credit_limit
          ),
          agent:agent_profiles!agent_id (
            id,
            full_name
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let updateData: any = {};
      let additionalActions: Array<Promise<any>> = [];

      switch (action) {
        case "approve":
          if (order.status !== "pending") {
            return new Response(
              JSON.stringify({ error: "Only pending orders can be approved" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updateData.status = "approved";
          updateData.approved_at = new Date().toISOString();
          updateData.approved_by = user.id;
          
          // Create notifications for both agent and farmer
          additionalActions.push(
            supabase.from("notifications").insert([
              {
                user_id: order.agent_id,
                title: "Order Approved",
                message: `Order #${orderId.slice(0, 8)} has been approved by admin`,
                type: "order_update",
                related_id: orderId,
              },
              {
                user_id: order.farmer_id,
                title: "Order Approved",
                message: `Your order #${orderId.slice(0, 8)} has been approved and will be processed soon`,
                type: "order_update",
                related_id: orderId,
              }
            ])
          );
          break;

        case "reject":
          if (order.status !== "pending") {
            return new Response(
              JSON.stringify({ error: "Only pending orders can be rejected" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (!reason) {
            return new Response(
              JSON.stringify({ error: "Rejection reason is required" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updateData.status = "rejected";
          updateData.rejection_reason = reason;
          updateData.rejected_at = new Date().toISOString();
          updateData.rejected_by = user.id;

          // Restore farmer's available credit
          const creditToRestore = parseFloat(order.balance);
          additionalActions.push(
            supabase.rpc("increment_farmer_credit", {
              farmer_id: order.farmer_id,
              credit_amount: creditToRestore,
            })
          );

          // Notify agent
          additionalActions.push(
            supabase.from("notifications").insert({
              user_id: order.agent_id,
              title: "Order Rejected",
              message: `Order #${orderId.slice(0, 8)} was rejected. Reason: ${reason}`,
              type: "order_update",
              related_id: orderId,
            })
          );
          break;

        case "deliver":
          if (order.status !== "approved") {
            return new Response(
              JSON.stringify({ error: "Only approved orders can be marked as delivered" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updateData.delivered_at = new Date().toISOString();
          updateData.delivery_confirmed_by = user.id;
          
          // Notify farmer
          additionalActions.push(
            supabase.from("notifications").insert({
              user_id: order.farmer_id,
              title: "Order Delivered",
              message: `Your order #${orderId.slice(0, 8)} has been delivered`,
              type: "order_update",
              related_id: orderId,
            })
          );
          break;

        case "cancel":
          if (!["pending", "approved"].includes(order.status)) {
            return new Response(
              JSON.stringify({ error: "Cannot cancel this order" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (!reason) {
            return new Response(
              JSON.stringify({ error: "Cancellation reason is required" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updateData.status = "cancelled";
          updateData.cancellation_reason = reason;
          updateData.cancelled_at = new Date().toISOString();
          updateData.cancelled_by = user.id;

          // Restore farmer's available credit
          const balanceToRestore = parseFloat(order.balance);
          additionalActions.push(
            supabase.rpc("increment_farmer_credit", {
              farmer_id: order.farmer_id,
              credit_amount: balanceToRestore,
            })
          );

          // Notify both agent and farmer
          additionalActions.push(
            supabase.from("notifications").insert([
              {
                user_id: order.agent_id,
                title: "Order Cancelled",
                message: `Order #${orderId.slice(0, 8)} was cancelled. Reason: ${reason}`,
                type: "order_update",
                related_id: orderId,
              },
              {
                user_id: order.farmer_id,
                title: "Order Cancelled",
                message: `Your order #${orderId.slice(0, 8)} has been cancelled. Reason: ${reason}`,
                type: "order_update",
                related_id: orderId,
              },
            ])
          );
          break;

        case "add_note":
          if (!notes) {
            return new Response(
              JSON.stringify({ error: "Notes are required" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updateData.admin_notes = notes;
          updateData.notes_updated_at = new Date().toISOString();
          updateData.notes_updated_by = user.id;
          break;

        default:
          return new Response(
            JSON.stringify({ error: "Invalid action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
      }

      // Update the order
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update order", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Execute additional actions (notifications, credit updates)
      if (additionalActions.length > 0) {
        await Promise.all(additionalActions);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Order ${action}d successfully`,
          order: updatedOrder,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
