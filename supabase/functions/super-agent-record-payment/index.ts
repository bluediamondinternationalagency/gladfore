import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  orderId: string;
  amount: number;
  paymentMethod?: string;
  receiptNumber?: string;
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

    const { orderId, amount, paymentMethod, receiptNumber }: PaymentRequest = await req.json();

    if (!orderId || !amount || amount <= 0) {
      throw new Error("Valid order ID and amount are required");
    }

    // Get order details and verify access
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        agent:agent_profiles!orders_agent_id_fkey(user_id, full_name),
        farmer:farmer_profiles!orders_farmer_id_fkey(user_id, full_name)
      `)
      .eq("id", orderId)
      .eq("super_agent_id", user.id)
      .single();

    if (orderError || !order) {
      console.error("Order fetch error:", orderError);
      throw new Error("Order not found or access denied");
    }

    // Verify order is approved
    if (!order.approved_at) {
      throw new Error("Order must be approved before recording payments");
    }

    // Verify payment doesn't exceed balance
    const currentBalance = parseFloat(order.balance);
    if (amount > currentBalance) {
      throw new Error(`Payment amount (${amount}) cannot exceed order balance (${currentBalance})`);
    }

    // Record payment (pending admin approval)
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: orderId,
        amount: amount,
        payment_method: paymentMethod,
        receipt_number: receiptNumber,
        recorded_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      throw new Error("Failed to record payment");
    }

    // Notify admin about pending payment approval
    const { data: admins } = await supabase
      .from("auth.users")
      .select("id")
      .eq("raw_user_meta_data->role", "admin");

    if (admins && admins.length > 0) {
      const adminNotifications = admins.map((admin) => ({
        user_id: admin.id,
        type: "payment_pending_approval",
        title: "Payment Pending Approval",
        message: `Super agent recorded a payment of ${amount} for order #${orderId.slice(0, 8)}. Please verify and approve.`,
        related_id: payment.id,
      }));

      await supabase.from("notifications").insert(adminNotifications);
    }

    // Notify agent about payment recording
    if (order.agent?.user_id) {
      await supabase.from("notifications").insert({
        user_id: order.agent.user_id,
        type: "payment_recorded",
        title: "Payment Recorded",
        message: `A payment of ${amount} has been recorded for order #${orderId.slice(0, 8)} and is pending admin approval.`,
        related_id: payment.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment recorded successfully and pending admin approval",
        payment,
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
