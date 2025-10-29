import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatsCard from "@/components/StatsCard";
import OrderCard from "@/components/OrderCard";
import { DollarSign, TrendingUp, Users, Upload, Search, LogOut, Sprout } from "lucide-react";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@shared/logic/paymentUtils";

interface Order {
  id: string;
  farmerId: string;
  agentId: string;
  totalCost: string;
  downPayment: string;
  balance: string;
  status: "pending" | "approved" | "rejected";
  dueDate: string;
  createdAt: string;
}

interface Stats {
  totalDownPayments: number;
  totalPendingDebts: number;
  totalOrders: number;
  pendingOrders: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [csvDialogOpen, setCSVDialogOpen] = useState(false);
  const [csvData, setCSVData] = useState("");

  const { data: ordersData } = useQuery<{ orders: Order[] }>({
    queryKey: ["/api/orders/pending"],
  });

  const { data: statsData } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const uploadCSVMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const res = await fetch("/api/farmers/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ csvData }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Uploaded ${data.count} farmers successfully`,
      });
      setCSVDialogOpen(false);
      setCSVData("");
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments: "Approved" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order approved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments: "Rejected" }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Order rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  const orders = ordersData?.orders || [];
  const stats = statsData || { totalDownPayments: 0, totalPendingDebts: 0, totalOrders: 0, pendingOrders: 0 };

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
            value={formatCurrency(stats.totalDownPayments)}
            icon={DollarSign}
          />
          <StatsCard
            title="Total Pending Debts"
            value={formatCurrency(stats.totalPendingDebts)}
            icon={TrendingUp}
          />
          <StatsCard
            title="Pending Orders"
            value={stats.pendingOrders.toString()}
            icon={Users}
          />
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h2 className="text-2xl font-bold">Pending Orders</h2>
            <Button onClick={() => setCSVDialogOpen(true)} data-testid="button-upload-csv">
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

          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pending orders at the moment
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  orderId={order.id}
                  farmerName={`Farmer #${order.farmerId.slice(0, 8)}`}
                  totalCost={order.totalCost}
                  downPayment={order.downPayment}
                  balance={order.balance}
                  status={order.status}
                  dueDate={order.dueDate}
                  showActions={true}
                  onApprove={() => approveMutation.mutate(order.id)}
                  onReject={() => rejectMutation.mutate(order.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={csvDialogOpen} onOpenChange={setCSVDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Farmers CSV</DialogTitle>
            <DialogDescription>
              Paste CSV data with columns: farmer_id, name, phone
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="farmer_id,name,phone&#10;F2025001,John Kamau,+254712345678&#10;F2025002,Mary Wanjiku,+254723456789"
            value={csvData}
            onChange={(e) => setCSVData(e.target.value)}
            rows={10}
            data-testid="input-csv"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCSVDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => uploadCSVMutation.mutate(csvData)}
              disabled={uploadCSVMutation.isPending || !csvData}
              data-testid="button-submit-csv"
            >
              {uploadCSVMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
