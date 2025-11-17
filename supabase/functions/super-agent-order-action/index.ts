import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderActionRequest {
  orderId: string;
  action: "approve" | "reject";
  rejectionReason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const role = user.user_metadata?.role;
    if (role !== "super_agent") {
      throw new Error("Access denied. Super agent role required.");
    }

    const { orderId, action, rejectionReason }: OrderActionRequest = await req.json();

    if (!orderId || !action) {
      throw new Error("Order ID and action are required");
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, agent:agent_profiles!orders_agent_id_fkey(user_id, full_name)")
      .eq("id", orderId)
      .eq("super_agent_id", user.id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found or access denied");
    }

    let updateData: any = {};
    let notificationMessage = "";
    let notificationType = "";

    if (action === "approve") {
      updateData = {
        super_agent_approved_at: new Date().toISOString(),
        super_agent_rejected_at: null,
        super_agent_rejection_reason: null,
      };
      notificationMessage = `Your order #${orderId.slice(0, 8)} has been approved by the super agent and sent to admin for final approval.`;
      notificationType = "order_super_agent_approved";
    } else if (action === "reject") {
      if (!rejectionReason) {
        throw new Error("Rejection reason is required");
      }
      updateData = {
        super_agent_rejected_at: new Date().toISOString(),
        super_agent_rejection_reason: rejectionReason,
        super_agent_approved_at: null,
        status: "rejected",
      };
      notificationMessage = `Your order #${orderId.slice(0, 8)} has been rejected by the super agent. Reason: ${rejectionReason}`;
      notificationType = "order_super_agent_rejected";
    } else {
      throw new Error("Invalid action");
    }

    // Update order
    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error("Order update error:", updateError);
      throw new Error("Failed to update order");
    }

    // Send notification to agent
    if (order.agent?.user_id) {
      await supabase.from("notifications").insert({
        user_id: order.agent.user_id,
        type: notificationType,
        title: action === "approve" ? "Order Approved by Super Agent" : "Order Rejected by Super Agent",
        message: notificationMessage,
        related_id: orderId,
      });
    }

    // If approved, also notify admin
    if (action === "approve") {
      const { data: admins } = await supabase
        .from("auth.users")
        .select("id")
        .eq("raw_user_meta_data->role", "admin");

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          user_id: admin.id,
          type: "order_pending_admin_approval",
          title: "New Order Pending Your Approval",
          message: `Order #${orderId.slice(0, 8)} has been approved by super agent and requires your final approval.`,
          related_id: orderId,
        }));

        await supabase.from("notifications").insert(adminNotifications);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Order ${action}d successfully`,
        order: { ...order, ...updateData }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
