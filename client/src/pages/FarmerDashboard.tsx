import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
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
  TrendingUp,
  Check,
  CheckCheck
} from "lucide-react";
import { logout } from "@/lib/auth";
import { formatCurrency } from "@shared/logic/paymentUtils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { API_ENDPOINTS, api } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

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
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    phone: '',
    farmSize: '',
    farmLocation: '',
    cropTypes: [] as string[],
    idType: '',
    idNumber: '',
    guarantorName: '',
    guarantorPhone: '',
    guarantorType: 'chief' as 'chief' | 'religious_leader',
  });

  // Helper to safely format dates
  const formatDate = (dateString: string | undefined | null, formatStr: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, formatStr);
    } catch {
      return 'N/A';
    }
  }

  // Helper to get auth headers
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session')
    }
    return {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      'Authorization': `Bearer ${session.access_token}`,
    }
  }

  // Fetch farmer profile
  const { data: profileData, isLoading: profileLoading } = useQuery<{ profile: FarmerProfile }>({
    queryKey: ["farmer-profile"],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(API_ENDPOINTS.farmerProfile, { headers })
      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }
      return response.json()
    }
  });

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ["farmer-orders"],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(API_ENDPOINTS.farmerOrders, { headers })
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      return response.json()
    }
  });

  // Fetch payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ payments: Payment[] }>({
    queryKey: ["farmer-payments"],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(API_ENDPOINTS.farmerPayments, { headers })
      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }
      return response.json()
    }
  });

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery<{ notifications: Notification[] }>({
    queryKey: ["farmer-notifications"],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const response = await fetch(API_ENDPOINTS.farmerNotifications, { headers })
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      return response.json()
    }
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-notifications"] })
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to mark notification as read", 
        variant: "destructive" 
      })
    }
  })

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    markAsReadMutation.mutate({ markAllAsRead: true });
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof updateFormData) => {
      const headers = await getAuthHeaders()
      const response = await fetch(API_ENDPOINTS.farmerProfileUpdate, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          ...data,
          cropTypes: data.cropTypes?.filter((c) => c.trim()),
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to update profile')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-profile"] })
      setIsUpdateDialogOpen(false)
      toast({ title: "Profile updated successfully" })
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update profile", 
        variant: "destructive" 
      })
    }
  })

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleOpenUpdateDialog = () => {
    if (profile) {
      setUpdateFormData({
        phone: profile.phone || '',
        farmSize: profile.farmSize || '',
        farmLocation: profile.farmLocation || '',
        cropTypes: profile.cropTypes || [],
        idType: profile.idType || 'national_id',
        idNumber: profile.idNumber || '',
        guarantorName: profile.guarantorName || '',
        guarantorPhone: profile.guarantorPhone || '',
        guarantorType: profile.guarantorType || 'chief',
      })
      setIsUpdateDialogOpen(true)
    }
  };

  const profile = profileData?.profile;
  const orders = ordersData?.orders || [];
  const payments = paymentsData?.payments || [];
  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const isLoading = profileLoading || ordersLoading || paymentsLoading || notificationsLoading;

  // Calculate stats
  const approvedOrders = orders.filter(o => o.status === "approved" || o.status === "delivered");
  const totalBalance = approvedOrders.reduce((sum, order) => {
    const balance = order.balance ? parseFloat(order.balance.toString()) : 0;
    return sum + balance;
  }, 0);
  const totalPaid = payments
    .filter(p => p.status === "completed")
    .reduce((sum, payment) => {
      const amount = payment.amount ? parseFloat(payment.amount.toString()) : 0;
      return sum + amount;
    }, 0);
  const availableCredit = profile?.availableCredit ? parseFloat(profile.availableCredit.toString()) : 0;

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
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}
        
        {!isLoading && (
          <>
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
                        Created {formatDate(order.createdAt, "MMM dd, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Cost</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(order.totalCost || "0"))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Down Payment</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(order.downPayment || "0"))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(order.balance || "0"))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p className="font-semibold">{formatDate(order.dueDate, "MMM dd, yyyy")}</p>
                        </div>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-sm font-medium mb-2">Order Items:</p>
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-xs flex justify-between">
                                <span>{item.product} (x{item.quantity})</span>
                                <span className="text-muted-foreground">{formatCurrency(parseFloat(item.price || "0"))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {order.status === "approved" && parseFloat(order.balance || "0") > 0 && (
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
                        <div className="flex-1">
                          <p className="font-medium">{formatCurrency(parseFloat(payment.amount || "0"))}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.paymentType.replace("_", " ").toUpperCase()} • {payment.paymentMethod}
                          </p>
                          {payment.orderId && (
                            <p className="text-xs text-muted-foreground">
                              Order #{payment.orderId.slice(0, 8)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDate(payment.createdAt, "MMM dd, yyyy HH:mm")}
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

            {profile?.kycStatus === 'pending' && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">KYC Verification Pending</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your account is under review. You'll be notified once verification is complete.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {profile?.kycStatus === 'rejected' && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">KYC Verification Failed</p>
                      <p className="text-sm text-red-700 mt-1">
                        Please contact support or your agent for assistance.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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

              {profile?.guarantorName && (
              <Card>
                <CardHeader>
                  <CardTitle>Guarantor Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{profile?.guarantorName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile?.guarantorPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge variant="outline">
                      {profile?.guarantorType === "chief" ? "Community Chief (Mia Angwa)" : "Religious Leader"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              )}

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

            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" onClick={handleOpenUpdateDialog}>
                  <Upload className="w-4 h-4 mr-2" />
                  Update Profile Information
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Update Profile</DialogTitle>
                  <DialogDescription>
                    Update your profile information. Some fields like name and credit information can only be changed by administrators.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={updateFormData.phone}
                      onChange={(e) => setUpdateFormData({ ...updateFormData, phone: e.target.value })}
                      placeholder="+234..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="farmSize">Farm Size (hectares)</Label>
                    <Input
                      id="farmSize"
                      value={updateFormData.farmSize}
                      onChange={(e) => setUpdateFormData({ ...updateFormData, farmSize: e.target.value })}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="farmLocation">Farm Location</Label>
                    <Input
                      id="farmLocation"
                      value={updateFormData.farmLocation}
                      onChange={(e) => setUpdateFormData({ ...updateFormData, farmLocation: e.target.value })}
                      placeholder="e.g., Lagos State"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="cropTypes">Crop Types (comma-separated)</Label>
                    <Input
                      id="cropTypes"
                      value={Array.isArray(updateFormData.cropTypes) ? updateFormData.cropTypes.join(', ') : updateFormData.cropTypes}
                      onChange={(e) => setUpdateFormData({ ...updateFormData, cropTypes: e.target.value.split(',').map(s => s.trim()) })}
                      placeholder="e.g., Rice, Maize, Cassava"
                    />
                  </div>
                  <div>
                    <Label htmlFor="idType">ID Type</Label>
                    <Select
                      value={updateFormData.idType}
                      onValueChange={(value) => setUpdateFormData({ ...updateFormData, idType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ID type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="national_id">National ID</SelectItem>
                        <SelectItem value="voters_card">Voter's Card</SelectItem>
                        <SelectItem value="drivers_license">Driver's License</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="idNumber">ID Number</Label>
                    <Input
                      id="idNumber"
                      value={updateFormData.idNumber}
                      onChange={(e) => setUpdateFormData({ ...updateFormData, idNumber: e.target.value })}
                      placeholder="Enter ID number"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => updateProfileMutation.mutate(updateFormData)}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Notifications</h2>
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAsReadMutation.isPending}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </div>
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
                              {formatDate(notif.createdAt, "MMM dd, yyyy HH:mm")}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleMarkAsRead(notif.id)}
                              disabled={markAsReadMutation.isPending}
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
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
        </>
        )}
      </main>
    </div>
  );
}