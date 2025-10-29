import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import FarmerCard from "@/components/FarmerCard";
import { calculateDownPayment, formatCurrency } from "@shared/logic/paymentUtils";
import { Search, LogOut, Plus, Sprout } from "lucide-react";

// todo: remove mock functionality
const mockFarmers = [
  { id: "1", farmerId: "F2025001", name: "Mary Wanjiku", phone: "+254 712 345 678" },
  { id: "2", farmerId: "F2025002", name: "James Mwangi", phone: "+254 723 456 789" },
  { id: "3", farmerId: "F2025003", name: "Grace Akinyi", phone: "+254 734 567 890" },
];

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<typeof mockFarmers[0] | null>(null);
  const [totalCost, setTotalCost] = useState("");

  const downPayment = totalCost ? calculateDownPayment(parseFloat(totalCost)) : 0;
  const balance = totalCost ? parseFloat(totalCost) - downPayment : 0;

  const handleCreateOrder = () => {
    console.log('Create order:', {
      farmer: selectedFarmer,
      totalCost: parseFloat(totalCost),
      downPayment,
      balance,
    });
    // todo: remove mock functionality - implement actual order creation
    setShowOrderForm(false);
    setSelectedFarmer(null);
    setTotalCost("");
  };

  const handleSelectFarmer = (farmer: typeof mockFarmers[0]) => {
    setSelectedFarmer(farmer);
    setShowOrderForm(true);
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
                <h1 className="font-bold text-lg">Agent Dashboard</h1>
                <p className="text-sm text-muted-foreground">Create orders for farmers</p>
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
        {!showOrderForm ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-2xl font-bold">Find Farmer</h2>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by phone number or farmer ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockFarmers.map((farmer) => (
                <FarmerCard
                  key={farmer.id}
                  farmerId={farmer.farmerId}
                  name={farmer.name}
                  phone={farmer.phone}
                  onSelect={() => handleSelectFarmer(farmer)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Create New Order</h2>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowOrderForm(false);
                  setSelectedFarmer(null);
                  setTotalCost("");
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>

            {selectedFarmer && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Farmer Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedFarmer.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Farmer ID</p>
                    <p className="font-medium">{selectedFarmer.farmerId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedFarmer.phone}</p>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6 space-y-6">
              <h3 className="font-semibold">Order Information</h3>

              <div className="space-y-2">
                <Label htmlFor="totalCost">Total Cost (KES)</Label>
                <Input
                  id="totalCost"
                  type="number"
                  placeholder="Enter total cost"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  data-testid="input-total-cost"
                />
              </div>

              {totalCost && parseFloat(totalCost) > 0 && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(totalCost))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">50% Down Payment:</span>
                    <span className="font-semibold text-primary">{formatCurrency(downPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="font-semibold">{formatCurrency(balance)}</span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleCreateOrder}
                disabled={!totalCost || parseFloat(totalCost) <= 0}
                data-testid="button-create-order"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
