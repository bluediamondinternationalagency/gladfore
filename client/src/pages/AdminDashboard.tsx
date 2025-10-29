import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsCard from "@/components/StatsCard";
import OrderCard from "@/components/OrderCard";
import { DollarSign, TrendingUp, Users, Upload, Search, LogOut } from "lucide-react";
import { Sprout } from "lucide-react";

// todo: remove mock functionality
const mockOrders = [
  {
    id: "1",
    farmerName: "John Kamau",
    totalCost: 50000,
    downPayment: 25000,
    balance: 25000,
    status: "pending" as const,
    dueDate: new Date('2025-12-31'),
  },
  {
    id: "2",
    farmerName: "Mary Wanjiku",
    totalCost: 75000,
    downPayment: 37500,
    balance: 37500,
    status: "approved" as const,
    dueDate: new Date('2025-11-15'),
  },
  {
    id: "3",
    farmerName: "Peter Ochieng",
    totalCost: 100000,
    downPayment: 50000,
    balance: 50000,
    status: "pending" as const,
    dueDate: new Date('2025-10-30'),
  },
];

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleUploadCSV = () => {
    console.log('Upload CSV clicked');
    // todo: remove mock functionality - implement actual CSV upload
  };

  const handleApprove = (orderId: string) => {
    console.log('Approve order:', orderId);
    // todo: remove mock functionality - implement actual approval
  };

  const handleReject = (orderId: string) => {
    console.log('Reject order:', orderId);
    // todo: remove mock functionality - implement actual rejection
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage farmers and orders</p>
              </div>
            </div>
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
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Down Payments"
            value="KES 2.5M"
            icon={DollarSign}
            trend="+12.5% from last month"
            trendUp={true}
          />
          <StatsCard
            title="Total Pending Debts"
            value="KES 1.8M"
            icon={TrendingUp}
          />
          <StatsCard
            title="Active Farmers"
            value="1,247"
            icon={Users}
            trend="+28 this week"
            trendUp={true}
          />
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-2xl font-bold">Pending Orders</h2>
            <Button onClick={handleUploadCSV} data-testid="button-upload-csv">
              <Upload className="w-4 h-4 mr-2" />
              Upload Farmers CSV
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockOrders.map((order) => (
              <OrderCard
                key={order.id}
                orderId={order.id}
                farmerName={order.farmerName}
                totalCost={order.totalCost}
                downPayment={order.downPayment}
                balance={order.balance}
                status={order.status}
                dueDate={order.dueDate}
                showActions={true}
                onApprove={() => handleApprove(order.id)}
                onReject={() => handleReject(order.id)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
