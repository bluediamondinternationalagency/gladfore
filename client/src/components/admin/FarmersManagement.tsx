// ============================================
// 1. FarmersManagement.tsx
// ============================================
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_ENDPOINTS, getSupabaseHeaders } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, TrendingUp, UserPlus } from "lucide-react";
import { formatCurrency } from "@shared/logic/paymentUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { queryClient } from "@/lib/queryClient";

export default function FarmersManagement() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const { data: farmersData, isLoading } = useQuery({
    queryKey: ["admin-farmers", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`${API_ENDPOINTS.adminFarmers}?${params}`, {
        headers: getSupabaseHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch farmers");
      return response.json();
    },
  });

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.adminAgents, {
        headers: getSupabaseHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch agents");
      return response.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ agentProfileId, farmerIds }: { agentProfileId: string | null; farmerIds: string[] }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(API_ENDPOINTS.adminAssignFarmers, {
        method: "POST",
        headers: {
          ...getSupabaseHeaders(),
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ agentProfileId, farmerIds }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign farmers");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Farmers assigned",
        description: data.message || "Assignment updated",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-farmers"] });
      setAssignDialogOpen(false);
      setSelectedFarmer(null);
      setSelectedAgentId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const farmers = farmersData?.farmers || [];
  const agents = agentsData?.agents || [];

  const getKycBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      verified: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const handleOpenAssign = (farmer: any) => {
    setSelectedFarmer(farmer);
    setSelectedAgentId(farmer.agent?.id || "");
    setAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!selectedFarmer || !selectedAgentId) {
      toast({
        title: "Select an agent",
        variant: "destructive",
      });
      return;
    }
    assignMutation.mutate({
      agentProfileId: selectedAgentId,
      farmerIds: [selectedFarmer.id],
    });
  };

  const handleUnassign = (farmer: any) => {
    assignMutation.mutate({
      agentProfileId: null,
      farmerIds: [farmer.id],
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Farmers Management</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search farmers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by KYC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading farmers...</div>
          ) : farmers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No farmers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Credit Score</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmers.map((farmer: any) => (
                  <TableRow key={farmer.id}>
                    <TableCell className="font-medium">{farmer.full_name}</TableCell>
                    <TableCell>{farmer.phone}</TableCell>
                    <TableCell>{farmer.farm_location}</TableCell>
                    <TableCell>{farmer.agent?.full_name || "Unassigned"}</TableCell>
                    <TableCell>{getKycBadge(farmer.kyc_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{farmer.credit_score}</span>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(parseFloat(farmer.credit_limit))}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(farmer.available_credit))}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenAssign(farmer)}>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Assign
                        </Button>
                        {farmer.agent?.id && (
                          <Button size="sm" variant="destructive" onClick={() => handleUnassign(farmer)}>
                            Unassign
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Farmer to Agent</DialogTitle>
            <DialogDescription>
              Assign {selectedFarmer?.full_name || "this farmer"} to an agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="agent">Agent</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger id="agent">
                <SelectValue placeholder={agentsLoading ? "Loading agents..." : "Select agent"} />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent: any) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assignMutation.isPending}>
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}