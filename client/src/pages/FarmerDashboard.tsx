import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import OrderCard from "@/components/OrderCard";
import StatsCard from "@/components/StatsCard";
import { DollarSign, Clock, LogOut, Sprout } from "lucide-react";

// todo: remove mock functionality
const mockOrders = [
  {
    id: "1",
    farmerName: "Current User",
    totalCost: 50000,
    downPayment: 25000,
    balance: 25000,
    status: "approved" as const,
    dueDate: new Date('2025-12-31'),
  },
  {
    id: "2",
    farmerName: "Current User",
    totalCost: 75000,
    downPayment: 37500,
    balance: 37500,
    status: "pending" as const,
    dueDate: new Date('2025-11-15'),
  },
];

export default function FarmerDashboard() {
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    console.log('Logout clicked');
    setLocation('/');
  };

  const totalBalance = mockOrders.reduce((sum, order) => sum + parseFloat(order.balance.toString()), 0);
  const totalPaid = mockOrders.reduce((sum, order) => sum + parseFloat(order.downPayment.toString()), 0);

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
            value={`KES ${(totalPaid / 1000).toFixed(1)}K`}
            icon={DollarSign}
          />
          <StatsCard
            title="Outstanding Balance"
            value={`KES ${(totalBalance / 1000).toFixed(1)}K`}
            icon={Clock}
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Order History</h2>

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
                showActions={false}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
