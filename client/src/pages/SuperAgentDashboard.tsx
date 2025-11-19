import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LogOut, DollarSign, Users, CheckCircle, XCircle, Clock, Receipt } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { logout } from "@/lib/auth";
import { useLocation } from "wouter";

export default function SuperAgentDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderActionOpen, setOrderActionOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.access_token);
    };
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.access_token);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Fetch super agent profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["superAgentProfile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/super-agent-profile`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["superAgentOrders"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/super-agent-orders`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Order action mutation
  const orderActionMutation = useMutation({
    mutationFn: async ({ orderId, action, rejectionReason }: { orderId: string; action: "approve" | "reject"; rejectionReason?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/super-agent-order-action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, action, rejectionReason }),
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
        description: `Order ${variables.action}d successfully`,
      });
      refetchOrders();
      setOrderActionOpen(false);
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

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ orderId, amount, paymentMethod, receiptNumber }: { orderId: string; amount: number; paymentMethod?: string; receiptNumber?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/super-agent-record-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, amount, paymentMethod, receiptNumber }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment recording failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment recorded and pending admin approval",
      });
      refetchOrders();
      setRecordPaymentOpen(false);
      setPaymentAmount("");
      setPaymentMethod("");
      setReceiptNumber("");
    },
    onError: (error: Error) => {
      toast({
        title: "Payment recording failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOrderAction = (order: any, action: "approve" | "reject") => {
    setSelectedOrder(order);
    setActionType(action);
    setOrderActionOpen(true);
  };

  const handleSubmitAction = () => {
    if (actionType === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        variant: "destructive",
      });
      return;
    }
    orderActionMutation.mutate({
      orderId: selectedOrder.id,
      action: actionType,
      rejectionReason: actionType === "reject" ? rejectionReason : undefined,
    });
  };

  const handleRecordPayment = (order: any) => {
    setSelectedOrder(order);
    setRecordPaymentOpen(true);
  };

  const handleSubmitPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        variant: "destructive",
      });
      return;
    }
    if (!selectedOrder?.approved_at) {
      toast({
        title: "Order must be approved first",
        variant: "destructive",
      });
      return;
    }
    recordPaymentMutation.mutate({
      orderId: selectedOrder.id,
      amount,
      paymentMethod: paymentMethod || undefined,
      receiptNumber: receiptNumber || undefined,
    });
  };

  const profile = profileData?.profile;
  const orders = ordersData?.orders || [];
  const pendingOrders = orders.filter((o: any) => !o.super_agent_approved_at && !o.super_agent_rejected_at);
  const approvedOrders = orders.filter((o: any) => o.super_agent_approved_at);
  const rejectedOrders = orders.filter((o: any) => o.super_agent_rejected_at);

  if (profileLoading || ordersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Super Agent Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {profile?.full_name}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.assigned_agents_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected Orders</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Review ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedOrders.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedOrders.length})</TabsTrigger>
          <TabsTrigger value="agents">My Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Pending Your Review</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending orders</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.agent_profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>{order.farmer_profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>₦{parseFloat(order.total_cost).toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(order.created_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOrderAction(order, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOrderAction(order, "reject")}
                            >
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
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approved Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No approved orders</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Total / Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.agent_profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>{order.farmer_profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>
                          ₦{parseFloat(order.total_cost).toLocaleString()}
                          <div className="text-sm text-muted-foreground">
                            Balance: ₦{parseFloat(order.balance).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.approved_at ? (
                            <Badge className="bg-green-500">Admin Approved</Badge>
                          ) : (
                            <Badge className="bg-yellow-500">Pending Admin</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.approved_at && parseFloat(order.balance) > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleRecordPayment(order)}
                            >
                              <Receipt className="h-4 w-4 mr-1" />
                              Record Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rejected Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {rejectedOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No rejected orders</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Rejected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.agent_profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>{order.farmer_profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>₦{parseFloat(order.total_cost).toLocaleString()}</TableCell>
                        <TableCell className="max-w-xs truncate">{order.super_agent_rejection_reason}</TableCell>
                        <TableCell>{format(new Date(order.super_agent_rejected_at), "MMM dd, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Agents</CardTitle>
            </CardHeader>
            <CardContent>
              {profile?.assigned_agents?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No agents assigned</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile?.assigned_agents?.map((assignment: any) => (
                      <TableRow key={assignment.agent_id}>
                        <TableCell>{assignment.agent_profiles?.full_name || 'N/A'}</TableCell>
                        <TableCell>{assignment.agent_profiles?.phone || 'N/A'}</TableCell>
                        <TableCell>{assignment.agent_profiles?.region || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(assignment.assigned_at), "MMM dd, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Action Dialog */}
      <Dialog open={orderActionOpen} onOpenChange={setOrderActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Approve Order" : "Reject Order"}</DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "This will approve the order and send it to admin for final approval."
                : "This will reject the order and notify the agent."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              <Button variant="outline" onClick={() => setOrderActionOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAction}
                disabled={orderActionMutation.isPending}
                variant={actionType === "approve" ? "default" : "destructive"}
              >
                {orderActionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionType === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for this order. Payment will be pending admin approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Amount *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
              {selectedOrder && (
                <p className="text-sm text-muted-foreground">
                  Order balance: ₦{parseFloat(selectedOrder.balance).toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptNumber">Receipt Number</Label>
              <Input
                id="receiptNumber"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Enter receipt number"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitPayment}
                disabled={recordPaymentMutation.isPending}
              >
                {recordPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
