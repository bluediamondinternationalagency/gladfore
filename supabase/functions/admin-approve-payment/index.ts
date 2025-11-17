import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentApprovalRequest {
  paymentId: string;
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
    if (role !== "admin") {
      throw new Error("Access denied. Admin role required.");
    }

    const { paymentId, action, rejectionReason }: PaymentApprovalRequest = await req.json();

    if (!paymentId || !action) {
      throw new Error("Payment ID and action are required");
    }

    // Get payment details with order and related users
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        order:orders!payments_order_id_fkey(
          id,
          balance,
          agent_id,
          farmer_id,
          agent:agent_profiles!orders_agent_id_fkey(user_id, full_name),
          farmer:farmer_profiles!orders_farmer_id_fkey(user_id, full_name)
        ),
        recorded_by_user:auth.users!payments_recorded_by_fkey(id, raw_user_meta_data)
      `)
      .eq("id", paymentId)
      .eq("status", "pending")
      .single();

    if (paymentError || !payment) {
      console.error("Payment fetch error:", paymentError);
      throw new Error("Payment not found or already processed");
    }

    let updateData: any = {};
    let notificationMessage = "";
    let notificationType = "";
    let shouldUpdateBalance = false;

    if (action === "approve") {
      updateData = {
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      };
      notificationMessage = `Payment of ${payment.amount} for order #${payment.order_id.slice(0, 8)} has been approved.`;
      notificationType = "payment_approved";
      shouldUpdateBalance = true;
    } else if (action === "reject") {
      if (!rejectionReason) {
        throw new Error("Rejection reason is required");
      }
      updateData = {
        status: "rejected",
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        approved_by: null,
        approved_at: null,
      };
      notificationMessage = `Payment of ${payment.amount} for order #${payment.order_id.slice(0, 8)} has been rejected. Reason: ${rejectionReason}`;
      notificationType = "payment_rejected";
    } else {
      throw new Error("Invalid action");
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", paymentId);

    if (updateError) {
      console.error("Payment update error:", updateError);
      throw new Error("Failed to update payment");
    }

    // If approved, update order balance and trigger commission
    if (shouldUpdateBalance) {
      const currentBalance = parseFloat(payment.order.balance);
      const paymentAmount = parseFloat(payment.amount);
      const newBalance = currentBalance - paymentAmount;

      const { error: balanceError } = await supabase
        .from("orders")
        .update({ balance: newBalance })
        .eq("id", payment.order_id);

      if (balanceError) {
        console.error("Balance update error:", balanceError);
        throw new Error("Failed to update order balance");
      }

      // Trigger commission calculation (existing function)
      const { error: commissionError } = await supabase.rpc(
        "increment_agent_commission",
        {
          p_agent_id: payment.order.agent_id,
          p_amount: paymentAmount,
        }
      );

      if (commissionError) {
        console.error("Commission update error:", commissionError);
        // Don't fail the whole operation if commission fails
      }
    }

    // Notify super agent who recorded the payment
    if (payment.recorded_by) {
      await supabase.from("notifications").insert({
        user_id: payment.recorded_by,
        type: notificationType,
        title: action === "approve" ? "Payment Approved" : "Payment Rejected",
        message: notificationMessage,
        related_id: paymentId,
      });
    }

    // Notify agent
    if (payment.order?.agent?.user_id) {
      await supabase.from("notifications").insert({
        user_id: payment.order.agent.user_id,
        type: notificationType,
        title: action === "approve" ? "Payment Approved" : "Payment Rejected",
        message: notificationMessage,
        related_id: paymentId,
      });
    }

    // Notify farmer
    if (payment.order?.farmer?.user_id) {
      await supabase.from("notifications").insert({
        user_id: payment.order.farmer.user_id,
        type: notificationType,
        title: action === "approve" ? "Payment Received" : "Payment Issue",
        message: action === "approve"
          ? `Your payment of ${payment.amount} has been confirmed.`
          : `There was an issue with your payment of ${payment.amount}. Please contact your agent.`,
        related_id: paymentId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment ${action}d successfully`,
        payment: { ...payment, ...updateData },
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
