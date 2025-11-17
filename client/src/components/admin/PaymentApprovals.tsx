import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function PaymentApprovals() {
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch pending payments
  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ["pendingPayments"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch payments from database directly with status filter
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          order:orders!payments_order_id_fkey(
            id,
            farmer_id,
            agent_id,
            total_cost,
            balance,
            farmer:farmer_profiles!orders_farmer_id_fkey(full_name),
            agent:agent_profiles!orders_agent_id_fkey(full_name)
          ),
          recorded_by_user:auth.users!payments_recorded_by_fkey(
            raw_user_meta_data
          )
        `)
        .eq("status", "pending")
        .order("recorded_at", { ascending: false });

      if (error) throw error;
      return { payments: data };
    },
  });

  // Payment approval mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ paymentId, action, rejectionReason }: { paymentId: string; action: "approve" | "reject"; rejectionReason?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-approve-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentId, action, rejectionReason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Action failed');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: `Payment ${variables.action}d successfully`,
      });
      refetch();
      setActionDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAction = (payment: any, action: "approve" | "reject") => {
    setSelectedPayment(payment);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const handleSubmitAction = () => {
    if (actionType === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        variant: "destructive",
      });
      return;
    }
    approvalMutation.mutate({
      paymentId: selectedPayment.id,
      action: actionType,
      rejectionReason: actionType === "reject" ? rejectionReason : undefined,
    });
  };

  const payments = paymentsData?.payments || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pending Payment Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending payments</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">{payment.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-sm">{payment.order_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-semibold">₦{parseFloat(payment.amount).toLocaleString()}</TableCell>
                    <TableCell>{payment.order?.farmer?.full_name || 'N/A'}</TableCell>
                    <TableCell>{payment.order?.agent?.full_name || 'N/A'}</TableCell>
                    <TableCell>{payment.recorded_by_user?.raw_user_meta_data?.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.payment_method || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{payment.receipt_number || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(payment.recorded_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(payment, "approve")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(payment, "reject")}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Approve Payment" : "Reject Payment"}</DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "This will approve the payment, update the order balance, and trigger commission calculation."
                : "This will reject the payment and notify the super agent who recorded it."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPayment && (
              <div className="bg-muted p-4 rounded-md space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">₦{parseFloat(selectedPayment.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Balance:</span>
                  <span>₦{parseFloat(selectedPayment.order?.balance || 0).toLocaleString()}</span>
                </div>
                {selectedPayment.receipt_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receipt:</span>
                    <span>{selectedPayment.receipt_number}</span>
                  </div>
                )}
              </div>
            )}
            {actionType === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={4}
                />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAction}
                disabled={approvalMutation.isPending}
                variant={actionType === "approve" ? "default" : "destructive"}
              >
                {approvalMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionType === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
