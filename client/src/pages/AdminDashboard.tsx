// AdminDashboard.tsx

import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { API_ENDPOINTS, getSupabaseHeaders } from "@/lib/api";
import { 
  LogOut, 
  Users, 
  UserCheck,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  Settings,
  Package
} from "lucide-react";
import { logout } from "@/lib/auth";
import { formatCurrency } from "@shared/logic/paymentUtils";
import DashboardOverview from "@/components/admin/DashboardOverview";
import FarmersManagement from "@/components/admin/FarmersManagement";
import AgentsManagement from "@/components/admin/AgentsManagement";
import OrdersManagement from "@/components/admin/OrdersManagement";
import PaymentsManagement from "@/components/admin/PaymentsManagement";
import PaymentApprovals from "@/components/admin/PaymentApprovals";
import KycManagement from "@/components/admin/KycManagement";
import ReportsAnalytics from "@/components/admin/ReportsAnalytics";
import AddUsers from "@/components/admin/AddUsers";
import AdminProducts from "@/pages/AdminProducts";
import SuperAgentManagement from "@/components/admin/SuperAgentManagement";

interface AdminStats {
  totalFarmers: number;
  totalAgents: number;
  activeOrders: number;
  pendingOrders: number;
  totalOutstanding: string;
  totalCollected: string;
  collectionRate: number;
  defaultRate: number;
  pendingKyc: number;
  verifiedFarmers: number;
  totalRevenue: string;
  monthlyRevenue: string;
  activeFarmers: number;
  blacklistedFarmers: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  // -------------------------------------------------------------------------
  // 🔧 CHANGED: You MUST fetch from Netlify Functions, not "/api/admin-stats"
  // -------------------------------------------------------------------------
  const { data: statsData, isLoading } = useQuery<{ stats: AdminStats }>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.adminStats, {
        headers: getSupabaseHeaders(),
      });

      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const stats = statsData?.stats;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10">
                  <Settings className="w-5 h-5 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-bold text-lg">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Gladfore Fertilizer Credit Management</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          {/* Total Farmers */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalFarmers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">{stats?.activeFarmers || 0} active</span>
                {stats?.blacklistedFarmers ? ` • ${stats.blacklistedFarmers} blacklisted` : ''}
              </p>
            </CardContent>
          </Card>

          {/* Total Agents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAgents || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active agents in the field</p>
            </CardContent>
          </Card>

          {/* Pending KYC */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingKyc || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600">{stats?.verifiedFarmers || 0} verified</span>
              </p>
            </CardContent>
          </Card>

          {/* Active Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.pendingOrders || 0} pending approval
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(parseFloat(stats?.totalRevenue || "0"))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(parseFloat(stats?.monthlyRevenue || "0"))} this month
              </p>
            </CardContent>
          </Card>

          {/* Outstanding */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(parseFloat(stats?.totalOutstanding || "0"))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pending collections</p>
            </CardContent>
          </Card>

          {/* Collection Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.collectionRate || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(parseFloat(stats?.totalCollected || "0"))} collected
              </p>
            </CardContent>
          </Card>

          {/* Default Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Default Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.defaultRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Overdue payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-11 w-full lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="add-users">Add Users</TabsTrigger>
            <TabsTrigger value="farmers">Farmers</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="super-agents">Super Agents</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="payment-approvals">Payment Approvals</TabsTrigger>
            <TabsTrigger value="kyc">KYC Review</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardOverview stats={stats} />
          </TabsContent>

          <TabsContent value="add-users">
            <AddUsers />
          </TabsContent>

          <TabsContent value="farmers">
            <FarmersManagement />
          </TabsContent>

          <TabsContent value="agents">
            <AgentsManagement />
          </TabsContent>

          <TabsContent value="super-agents">
            <SuperAgentManagement />
          </TabsContent>

          <TabsContent value="products">
            <AdminProducts />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersManagement />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsManagement />
          </TabsContent>

          <TabsContent value="payment-approvals">
            <PaymentApprovals />
          </TabsContent>

          <TabsContent value="kyc">
            <KycManagement />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
