// AdminDashboard.tsx

import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { API_ENDPOINTS, getSupabaseHeaders } from "@/lib/api";
import { cn } from "@/lib/utils";
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
  Package,
  LayoutDashboard,
  UserPlus,
  CheckCircle,
  BarChart3,
  Shield,
  Menu,
  X
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

type NavItem = {
  id: string;
  label: string;
  icon: any;
  badge?: number;
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [activeView, setActiveView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const navigationItems: NavItem[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "add-users", label: "Add Users", icon: UserPlus },
    { id: "farmers", label: "Farmers", icon: Users },
    { id: "agents", label: "Agents", icon: UserCheck },
    { id: "super-agents", label: "Super Agents", icon: Shield },
    { id: "products", label: "Products", icon: Package },
    { id: "orders", label: "Orders", icon: ShoppingCart, badge: stats?.pendingOrders },
    { id: "payments", label: "Payments", icon: DollarSign },
    { id: "payment-approvals", label: "Approvals", icon: CheckCircle },
    { id: "kyc", label: "KYC Review", icon: AlertCircle, badge: stats?.pendingKyc },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeView) {
      case "overview":
        return <DashboardOverview stats={stats} />;
      case "add-users":
        return <AddUsers />;
      case "farmers":
        return <FarmersManagement />;
      case "agents":
        return <AgentsManagement />;
      case "super-agents":
        return <SuperAgentManagement />;
      case "products":
        return <AdminProducts />;
      case "orders":
        return <OrdersManagement />;
      case "payments":
        return <PaymentsManagement />;
      case "payment-approvals":
        return <PaymentApprovals />;
      case "kyc":
        return <KycManagement />;
      case "reports":
        return <ReportsAnalytics />;
      default:
        return <DashboardOverview stats={stats} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 shadow-lg",
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10">
                  <Settings className="w-4 h-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-sm">Admin</h2>
                <p className="text-xs text-muted-foreground">Gladfore</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveView(item.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 flex-shrink-0", !sidebarOpen && "lg:mx-auto")} />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3"
          >
            <LogOut className={cn("w-5 h-5", !sidebarOpen && "lg:mx-auto")} />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col transition-all duration-300", sidebarOpen ? "lg:ml-64" : "lg:ml-20")}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {navigationItems.find(item => item.id === activeView)?.label || "Dashboard"}
                </h1>
                <p className="text-sm text-muted-foreground">Gladfore Credit Management System</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Stats Overview - Only show on dashboard */}
        {activeView === "overview" && (
          <div className="p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Farmers */}
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
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
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                  <UserCheck className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalAgents || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active in field</p>
                </CardContent>
              </Card>

              {/* Active Orders */}
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.activeOrders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.pendingOrders || 0} pending
                  </p>
                </CardContent>
              </Card>

              {/* Total Revenue */}
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
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
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* Pending KYC */}
              <Card className="border-none shadow-sm">
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

              {/* Outstanding */}
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <FileText className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(parseFloat(stats?.totalOutstanding || "0"))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pending collections</p>
                </CardContent>
              </Card>

              {/* Collection Rate */}
              <Card className="border-none shadow-sm">
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
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Default Rate</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats?.defaultRate || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Overdue payments</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
