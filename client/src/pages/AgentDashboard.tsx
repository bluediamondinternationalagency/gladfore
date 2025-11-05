import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import FarmerCard from "@/components/FarmerCard";
import { calculateDownPayment, formatCurrency } from "@shared/logic/paymentUtils";
import { Search, LogOut, Plus, Sprout } from "lucide-react";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Farmer {
  id: string;
  farmerId: string;
  name: string;
  phone: string;
}

export default function AgentDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [totalCost, setTotalCost] = useState("");
  const [dueDate, setDueDate] = useState("");

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(`/api/farmers/search?query=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setSelectedFarmer(data.farmer);
      setShowOrderForm(true);
    },
    onError: (error: any) => {
      toast({
        title: "Farmer not found",
        description: "No farmer found with that phone or ID",
        variant: "destructive",
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(orderData),
      });
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Failed to create order";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Order created successfully",
        description: "The order has been submitted for approval",
      });
      setShowOrderForm(false);
      setSelectedFarmer(null);
      setTotalCost("");
      setDueDate("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downPayment = totalCost ? calculateDownPayment(parseFloat(totalCost)) : 0;
  const balance = totalCost ? parseFloat(totalCost) - downPayment : 0;

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter search query",
        description: "Please enter a phone number or farmer ID",
        variant: "destructive",
      });
      return;
    }
    searchMutation.mutate(searchQuery);
  };

  const handleCreateOrder = () => {
    if (!selectedFarmer || !totalCost || !dueDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      farmerId: selectedFarmer.id,
      totalCost: parseFloat(totalCost).toFixed(2),
      downPayment: downPayment.toFixed(2),
      dueDate,
    });
  };

  const handleLogout = async () => {
    await logout();
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

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by phone number or farmer ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Button onClick={handleSearch} disabled={searchMutation.isPending} data-testid="button-search">
                {searchMutation.isPending ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="text-center py-12 text-muted-foreground">
              Enter a farmer's phone number or ID to search
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
                  setDueDate("");
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
                <Label htmlFor="totalCost">Total Cost (₦)</Label>
                <Input
                  id="totalCost"
                  type="number"
                  placeholder="Enter total cost"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  data-testid="input-total-cost"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="input-due-date"
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
                disabled={!totalCost || parseFloat(totalCost) <= 0 || !dueDate || createOrderMutation.isPending}
                data-testid="button-create-order"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
