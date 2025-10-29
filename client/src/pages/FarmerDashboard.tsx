import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import OrderCard from "@/components/OrderCard";
import StatsCard from "@/components/StatsCard";
import { DollarSign, Clock, LogOut, Sprout } from "lucide-react";
import { logout } from "@/lib/auth";
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

export default function FarmerDashboard() {
  const [, setLocation] = useLocation();

  const { data: ordersData } = useQuery<{ orders: Order[] }>({
    queryKey: ["/api/orders"],
  });

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  const orders = ordersData?.orders || [];
  const totalBalance = orders
    .filter(o => o.status === "approved")
    .reduce((sum, order) => sum + parseFloat(order.balance.toString()), 0);
  const totalPaid = orders.reduce((sum, order) => sum + parseFloat(order.downPayment.toString()), 0);

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
                <h1 className="font-bold text-lg">My Orders</h1>
                <p className="text-sm text-muted-foreground">Track your fertilizer orders</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatsCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            icon={DollarSign}
          />
          <StatsCard
            title="Outstanding Balance"
            value={formatCurrency(totalBalance)}
            icon={Clock}
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Order History</h2>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No orders yet. Contact your agent to create an order.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  orderId={order.id}
                  farmerName="My Order"
                  totalCost={order.totalCost}
                  downPayment={order.downPayment}
                  balance={order.balance}
                  status={order.status}
                  dueDate={order.dueDate}
                  showActions={false}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
