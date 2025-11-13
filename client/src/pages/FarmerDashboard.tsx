import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DollarSign, 
  Clock, 
  LogOut, 
  Sprout, 
  FileText,
  User,
  Bell,
  CreditCard,
  ShoppingCart,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { logout } from "@/lib/auth";
import { formatCurrency } from "@shared/logic/paymentUtils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Order {
  id: string;
  farmerId: string;
  agentId: string;
  totalCost: string;
  downPayment: string;
  balance: string;
  status: "pending" | "approved" | "rejected" | "delivered" | "completed";
  dueDate: string;
  createdAt: string;
  items?: Array<{
    product: string;
    quantity: number;
    price: string;
  }>;
}

interface FarmerProfile {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  farmSize: string;
  farmLocation: string;
  cropTypes: string[];
  idNumber: string;
  idType: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorType: "chief" | "religious_leader";
  kycStatus: "pending" | "verified" | "rejected";
  creditLimit: string;
  creditScore: number;
  availableCredit: string;
}

interface Payment {
  id: string;
  orderId: string;
  amount: string;
  paymentType: "down_payment" | "balance_payment";
  paymentMethod: string;
  status: "pending" | "completed";
  createdAt: string;
}

interface Notification {
  id: string;
  farmerId: string;
  title: string;
  message: string;
  type: "payment_reminder" | "order_update" | "credit_limit" | "general";
  isRead: boolean;
  createdAt: string;
}

export default function FarmerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch farmer profile
  const { data: profileData } = useQuery<{ profile: FarmerProfile }>({
    queryKey: ["/api/farmer/profile"],
  });

  // Fetch orders
  const { data: ordersData } = useQuery<{ orders: Order[] }>({
    queryKey: ["/api/farmer/orders"],
  });

  // Fetch payments
  const { data: paymentsData } = useQuery<{ payments: Payment[] }>({
    queryKey: ["/api/farmer/payments"],
  });

  // Fetch notifications
  const { data: notificationsData } = useQuery<{ notifications: Notification[] }>({
    queryKey: ["/api/farmer/notifications"],
  });

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  const profile = profileData?.profile;
  const orders = ordersData?.orders || [];
  const payments = paymentsData?.payments || [];
  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Calculate stats
  const approvedOrders = orders.filter(o => o.status === "approved" || o.status === "delivered");
  const totalBalance = approvedOrders.reduce((sum, order) => sum + parseFloat(order.balance.toString()), 0);
  const totalPaid = payments
    .filter(p => p.status === "completed")
    .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);
  const availableCredit = profile ? parseFloat(profile.availableCredit.toString()) : 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle2 },
      rejected: { variant: "destructive", icon: XCircle },
      delivered: { variant: "outline", icon: CheckCircle2 },
      completed: { variant: "default", icon: CheckCircle2 },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getKycBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive", text: string }> = {
      pending: { variant: "secondary", text: "KYC Pending" },
      verified: { variant: "default", text: "KYC Verified" },
      rejected: { variant: "destructive", text: "KYC Rejected" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10">
                  <Sprout className="w-5 h-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-bold text-lg">{profile?.fullName || "Farmer Dashboard"}</h1>
                <p className="text-sm text-muted-foreground">Welcome back!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(availableCredit)}</div>
              <p className="text-xs text-muted-foreground">
                Limit: {formatCurrency(parseFloat(profile?.creditLimit || "0"))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">All time payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
              <p className="text-xs text-muted-foreground">Pending balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.creditScore || 0}/100</div>
              <p className="text-xs text-muted-foreground">
                {(profile?.creditScore || 0) >= 70 ? "Excellent" : "Good"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Orders</h2>
              <Button onClick={() => toast({ title: "Contact your agent to place a new order" })}>
                <FileText className="w-4 h-4 mr-2" />
                New Order
              </Button>
            </div>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No orders yet. Contact your agent to create an order.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                        {getStatusBadge(order.status)}
                      </div>
                      <CardDescription>
                        Created {format(new Date(order.createdAt), "MMM dd, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Cost</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(order.totalCost))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Down Payment</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(order.downPayment))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(order.balance))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p className="font-semibold">{format(new Date(order.dueDate), "MMM dd, yyyy")}</p>
                        </div>
                      </div>
                      {order.status === "approved" && parseFloat(order.balance) > 0 && (
                        <Button className="w-full" size="sm">
                          Make Payment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <h2 className="text-2xl font-bold">Payment History</h2>
            {payments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No payment history yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {payments.map((payment) => (
                      <div key={payment.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatCurrency(parseFloat(payment.amount))}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.paymentType.replace("_", " ").toUpperCase()} • {payment.paymentMethod}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.createdAt), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Profile</h2>
              {profile && getKycBadge(profile.kycStatus)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{profile?.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{profile?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Type</p>
                    <p className="font-medium">{profile?.idType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID Number</p>
                    <p className="font-medium">{profile?.idNumber}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Farm Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Farm Size</p>
                    <p className="font-medium">{profile?.farmSize}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{profile?.farmLocation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Crop Types</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile?.cropTypes?.map((crop, i) => (
                        <Badge key={i} variant="outline">{crop}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Guarantor Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{profile?.guarantorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile?.guarantorPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline">
                      {profile?.guarantorType === "chief" ? "Community Chief (Mia Angwa)" : "Religious Leader"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Credit Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Credit Limit</p>
                    <p className="font-medium">{formatCurrency(parseFloat(profile?.creditLimit || "0"))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Credit</p>
                    <p className="font-medium">{formatCurrency(availableCredit)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Credit Score</p>
                    <p className="font-medium">{profile?.creditScore}/100</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Update Profile Information
            </Button>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <h2 className="text-2xl font-bold">Notifications</h2>
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No notifications yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 ${!notif.isRead ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{notif.title}</p>
                              {!notif.isRead && (
                                <Badge variant="default" className="text-xs">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(notif.createdAt), "MMM dd, yyyy HH:mm")}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <Button size="sm" variant="ghost">Mark as read</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}