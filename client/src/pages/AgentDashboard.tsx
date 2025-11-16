import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus, ShoppingCart, DollarSign, Plus, Trash2, LogOut, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { api } from "@/lib/api";
import { logout } from "@/lib/auth";
import { useLocation } from "wouter";

export default function AgentDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [addFarmerOpen, setAddFarmerOpen] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('AgentDashboard - Session:', session ? 'Exists' : 'None');
      console.log('AgentDashboard - Access token:', session?.access_token ? 'Exists' : 'None');
      setIsAuthenticated(!!session?.access_token);
    };
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AgentDashboard - Auth state changed:', _event);
      setIsAuthenticated(!!session?.access_token);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Fetch agent profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ["agentProfile"],
    queryFn: api.agentProfile,
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["agentStats"],
    queryFn: api.agentStats,
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch farmers
  const { data: farmersData, isLoading: farmersLoading } = useQuery({
    queryKey: ["agentFarmers"],
    queryFn: api.agentFarmers,
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["agentOrders"],
    queryFn: api.agentOrders,
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["agentPayments"],
    queryFn: api.agentPayments,
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch commissions
  const { data: commissionsData, isLoading: commissionsLoading } = useQuery({
    queryKey: ["agentCommissions"],
    queryFn: api.agentCommission,
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ["agentNotifications"],
    queryFn: api.agentNotifications,
    enabled: isAuthenticated,
    retry: 1,
  });

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ["agentProducts"],
    queryFn: api.agentProducts,
    enabled: isAuthenticated,
    retry: 1,
  });

  const stats = statsData?.stats;
  const farmers = farmersData?.farmers || [];
  const orders = ordersData?.orders || [];
  const payments = paymentsData?.payments || [];
  const commissions = commissionsData?.commissions || [];
  const notifications = notificationsData?.notifications || [];
  const products = productsData?.products || [];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Mutations for actions
  const createFarmerMutation = useMutation({
    mutationFn: api.agentCreateFarmer,
    onSuccess: () => {
      toast({ title: "Farmer created successfully" });
      setAddFarmerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agentFarmers"] });
      queryClient.invalidateQueries({ queryKey: ["agentStats"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create farmer", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: api.agentCreateOrder,
    onSuccess: () => {
      toast({ title: "Order created successfully" });
      setCreateOrderOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agentOrders"] });
      queryClient.invalidateQueries({ queryKey: ["agentStats"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create order", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: api.agentRecordPayment,
    onSuccess: () => {
      toast({ title: "Payment recorded successfully" });
      setRecordPaymentOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agentPayments"] });
      queryClient.invalidateQueries({ queryKey: ["agentOrders"] });
      queryClient.invalidateQueries({ queryKey: ["agentStats"] });
      queryClient.invalidateQueries({ queryKey: ["agentCommissions"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to record payment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Mark notification as read mutation
  const markNotificationMutation = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentNotifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to mark notification",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationMutation.mutate({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    markNotificationMutation.mutate({ markAllAsRead: true });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  // Safe date formatter
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return format(date, "MMM dd, yyyy");
    } catch {
      return "N/A";
    }
  };

  if (profileLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">Failed to load agent profile</p>
        <p className="text-sm text-muted-foreground">
          {profileError instanceof Error ? profileError.message : "Unknown error"}
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.profile?.fullName || "Agent"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalFarmers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.monthlyOrders || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(stats?.totalCommission || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.monthlyCommission || 0)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                formatCurrency(stats?.pendingCollections || 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <Button onClick={() => setAddFarmerOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Farmer
        </Button>
        <Button onClick={() => setCreateOrderOpen(true)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Create Order
        </Button>
        <Button onClick={() => setRecordPaymentOpen(true)}>
          <DollarSign className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="farmers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="farmers">Farmers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Farmers Tab */}
        <TabsContent value="farmers" className="space-y-4">
          {farmersLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : farmers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No farmers found</p>
              </CardContent>
            </Card>
          ) : (
            farmers.map((farmer) => (
              <Card key={farmer.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{farmer.fullName}</CardTitle>
                    <Badge
                      variant={
                        farmer.kycStatus === "approved"
                          ? "default"
                          : farmer.kycStatus === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {farmer.kycStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{farmer.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{farmer.farmLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Farm Size</p>
                      <p className="font-medium">{farmer.farmSize} acres</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Crop Types</p>
                      <p className="font-medium">{farmer.cropTypes?.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Limit</p>
                      <p className="font-medium">{formatCurrency(farmer.creditLimit)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Used</p>
                      <p className="font-medium">{formatCurrency(farmer.creditUsed)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="font-medium">{farmer.orderCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                      <p className="font-medium text-orange-600">
                        {formatCurrency(farmer.outstandingBalance)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {ordersLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Order #{order.id}</CardTitle>
                    <div className="flex gap-2">
                      <Badge
                        variant={
                          order.status === "approved"
                            ? "default"
                            : order.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {order.status}
                      </Badge>
                      <Badge variant="outline">{order.deliveryStatus}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Farmer</p>
                      <p className="font-medium">{order.farmerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Order Date</p>
                      <p className="font-medium">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="font-medium">{formatCurrency(order.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Balance</p>
                      <p className="font-medium text-orange-600">
                        {formatCurrency(order.balance)}
                      </p>
                    </div>
                    {order.deliveryDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Delivery Date</p>
                        <p className="font-medium">{formatDate(order.deliveryDate)}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Items</p>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {paymentsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No payments found</p>
              </CardContent>
            </Card>
          ) : (
            payments.map((payment) => (
              <Card key={payment.id}>
                <CardHeader>
                  <CardTitle>Payment #{payment.id}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Farmer</p>
                      <p className="font-medium">{payment.farmerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-medium">#{payment.orderId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount Paid</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Order Total</p>
                      <p className="font-medium">{formatCurrency(payment.orderTotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium">{payment.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Date</p>
                      <p className="font-medium">{formatDate(payment.paymentDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Commission Tab */}
        <TabsContent value="commission" className="space-y-4">
          {commissionsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : commissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No commission records found</p>
              </CardContent>
            </Card>
          ) : (
            commissions.map((commission) => (
              <Card key={commission.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Commission #{commission.id}</CardTitle>
                    <Badge
                      variant={
                        commission.status === "paid"
                          ? "default"
                          : commission.status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {commission.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{commission.commissionType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(commission.amount)}
                      </p>
                    </div>
                    {commission.orderId && (
                      <div>
                        <p className="text-sm text-muted-foreground">Order ID</p>
                        <p className="font-medium">#{commission.orderId}</p>
                      </div>
                    )}
                    {commission.paymentId && (
                      <div>
                        <p className="text-sm text-muted-foreground">Payment ID</p>
                        <p className="font-medium">#{commission.paymentId}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{formatDate(commission.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {notifications.some(n => !n.isRead) && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={markNotificationMutation.isPending}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All as Read
              </Button>
            )}
          </div>
          {notificationsLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No notifications</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`py-4 ${!notification.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{notification.title}</p>
                          <Badge variant={notification.isRead ? "outline" : "default"} className="text-xs">
                            {notification.isRead ? "Read" : "New"}
                          </Badge>
                        </div>
                        <p className="text-sm mb-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markNotificationMutation.isPending}
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Farmer Dialog */}
      <AddFarmerDialog 
        open={addFarmerOpen}
        onOpenChange={setAddFarmerOpen}
        onSubmit={createFarmerMutation.mutate}
        isLoading={createFarmerMutation.isPending}
      />

      {/* Create Order Dialog */}
      <CreateOrderDialog 
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        farmers={farmers}
        products={products}
        onSubmit={createOrderMutation.mutate}
        isLoading={createOrderMutation.isPending}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog 
        open={recordPaymentOpen}
        onOpenChange={setRecordPaymentOpen}
        orders={orders.filter(o => o.balance > 0)}
        onSubmit={recordPaymentMutation.mutate}
        isLoading={recordPaymentMutation.isPending}
      />
    </div>
  );
}

// Add Farmer Dialog Component
function AddFarmerDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    farmSize: "",
    farmLocation: "",
    cropTypes: "",
    idType: "",
    idNumber: "",
    guarantorName: "",
    guarantorPhone: "",
    guarantorType: "",
    creditLimit: "100000"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      cropTypes: formData.cropTypes ? formData.cropTypes.split(",").map(c => c.trim()) : null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Farmer</DialogTitle>
          <DialogDescription>Create a new farmer profile</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmLocation">Farm Location *</Label>
              <Input
                id="farmLocation"
                required
                value={formData.farmLocation}
                onChange={(e) => setFormData({ ...formData, farmLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmSize">Farm Size (acres)</Label>
              <Input
                id="farmSize"
                type="number"
                value={formData.farmSize}
                onChange={(e) => setFormData({ ...formData, farmSize: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="cropTypes">Crop Types (comma-separated)</Label>
              <Input
                id="cropTypes"
                placeholder="e.g., Maize, Rice, Cassava"
                value={formData.cropTypes}
                onChange={(e) => setFormData({ ...formData, cropTypes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idType">ID Type</Label>
              <Select value={formData.idType} onValueChange={(value) => setFormData({ ...formData, idType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="voters_card">Voter's Card</SelectItem>
                  <SelectItem value="drivers_license">Driver's License</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID Number</Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guarantorName">Guarantor Name</Label>
              <Input
                id="guarantorName"
                value={formData.guarantorName}
                onChange={(e) => setFormData({ ...formData, guarantorName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guarantorPhone">Guarantor Phone</Label>
              <Input
                id="guarantorPhone"
                value={formData.guarantorPhone}
                onChange={(e) => setFormData({ ...formData, guarantorPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guarantorType">Guarantor Type</Label>
              <Select value={formData.guarantorType} onValueChange={(value) => setFormData({ ...formData, guarantorType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select guarantor type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chief">Chief</SelectItem>
                  <SelectItem value="religious_leader">Religious Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit (₦)</Label>
              <Input
                id="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Farmer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Order Dialog Component
function CreateOrderDialog({ 
  open, 
  onOpenChange, 
  farmers,
  products,
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  farmers: any[];
  products: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [farmerId, setFarmerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { productId: "", productName: "", quantity: "", unitPrice: "" }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      farmerId,
      dueDate,
      deliveryAddress,
      notes,
      items: items.map(item => ({
        productId: item.productId || undefined,
        productName: item.productName,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice)
      }))
    });
  };

  const addItem = () => {
    setItems([...items, { productId: "", productName: "", quantity: "", unitPrice: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill price when product is selected
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].unitPrice = product.unitPrice.toString();
      }
    }
    
    setItems(newItems);
  };

  const totalCost = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>Create an order for a farmer</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="farmer">Select Farmer *</Label>
            <Select value={farmerId} onValueChange={setFarmerId} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose a farmer" />
              </SelectTrigger>
              <SelectContent>
                {farmers.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.fullName} - {farmer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Order Items *</Label>
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select
                    value={item.productId}
                    onValueChange={(value) => updateItem(index, "productId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - ₦{product.unitPrice.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    required
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>

          {totalCost > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-bold">₦{totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Down Payment (50%):</span>
                <span className="font-bold text-green-600">₦{(totalCost * 0.5).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Balance:</span>
                <span className="font-bold text-orange-600">₦{(totalCost * 0.5).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Input
                id="deliveryAddress"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !farmerId || items.length === 0}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Order
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Record Payment Dialog Component
function RecordPaymentDialog({ 
  open, 
  onOpenChange, 
  orders,
  onSubmit, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  orders: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    orderId: "",
    amount: "",
    paymentMethod: "",
    paymentReference: "",
    notes: ""
  });

  const selectedOrder = orders.find(o => o.id === formData.orderId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Record a payment for an order</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="order">Select Order *</Label>
            <Select 
              value={formData.orderId} 
              onValueChange={(value) => setFormData({ ...formData, orderId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an order with balance" />
              </SelectTrigger>
              <SelectContent>
                {orders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    Order #{order.id.substring(0, 8)} - {order.farmerName} (Balance: ₦{order.balance.toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOrder && (
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Farmer:</span>
                <span className="font-medium">{selectedOrder.farmerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-medium">₦{selectedOrder.totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Balance:</span>
                <span className="font-bold text-orange-600">₦{selectedOrder.balance.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount (₦) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              required
            >
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
            <Label htmlFor="paymentReference">Payment Reference</Label>
            <Input
              id="paymentReference"
              placeholder="Transaction ID or receipt number"
              value={formData.paymentReference}
              onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.orderId || !formData.amount || !formData.paymentMethod}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
