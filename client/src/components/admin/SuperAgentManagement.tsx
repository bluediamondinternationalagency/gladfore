import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Users, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";

export default function SuperAgentManagement() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSuperAgent, setSelectedSuperAgent] = useState<any>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    region: "",
  });

  // Fetch super agents
  const { data: superAgentsData, isLoading: loadingSuperAgents } = useQuery({
    queryKey: ["superAgents"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-super-agent`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch super agents");
      return response.json();
    },
  });

  // Fetch all agents for assignment
  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ["allAgents"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-agents`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch agents");
      return response.json();
    },
  });

  // Create super agent mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-super-agent`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create super agent");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Super agent created successfully" });
      queryClient.invalidateQueries({ queryKey: ["superAgents"] });
      setCreateDialogOpen(false);
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        password: "",
        region: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create super agent",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign agents mutation
  const assignMutation = useMutation({
    mutationFn: async ({ superAgentId, agentIds }: { superAgentId: string; agentIds: string[] }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-assign-agents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ superAgentId, agentIds }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign agents");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Agents assigned successfully",
        description: data.message 
      });
      queryClient.invalidateQueries({ queryKey: ["superAgents"] });
      queryClient.invalidateQueries({ queryKey: ["allAgents"] });
      setAssignDialogOpen(false);
      setSelectedAgents([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign agents",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.password) {
      toast({
        title: "Missing required fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleAssignAgents = () => {
    if (!selectedSuperAgent || selectedAgents.length === 0) {
      toast({
        title: "Please select at least one agent",
        variant: "destructive",
      });
      return;
    }
    assignMutation.mutate({
      superAgentId: selectedSuperAgent.user_id,
      agentIds: selectedAgents,
    });
  };

  const superAgents = superAgentsData?.superAgents || [];
  const agents = agentsData?.agents || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Super Agent Management</h2>
          <p className="text-muted-foreground">Create and manage super agents</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Super Agent
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Super Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSuperAgents ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : superAgents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No super agents yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Assigned Agents</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {superAgents.map((sa: any) => (
                  <TableRow key={sa.id}>
                    <TableCell className="font-medium">{sa.full_name}</TableCell>
                    <TableCell>{sa.phone}</TableCell>
                    <TableCell>{sa.region || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {sa.assigned_agents_count || 0} agents
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(sa.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSuperAgent(sa);
                          setAssignDialogOpen(true);
                        }}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Assign Agents
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Super Agent Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Super Agent</DialogTitle>
            <DialogDescription>
              Create a new super agent account who will manage and review agent orders.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+234..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 6 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region (optional)</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="e.g., North, South, East, West"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Super Agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Agents Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Agents to {selectedSuperAgent?.full_name}</DialogTitle>
            <DialogDescription>
              Select agents to assign to this super agent. Their orders will be reviewed by this super agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingAgents ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : agents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No agents available</p>
            ) : (
              <div className="space-y-2">
                {agents.map((agent: any) => (
                  <div key={agent.user_id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={agent.user_id}
                      checked={selectedAgents.includes(agent.user_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAgents([...selectedAgents, agent.user_id]);
                        } else {
                          setSelectedAgents(selectedAgents.filter((id) => id !== agent.user_id));
                        }
                      }}
                    />
                    <Label htmlFor={agent.user_id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{agent.full_name}</div>
                      <div className="text-sm text-muted-foreground">{agent.phone}</div>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedAgents([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignAgents} disabled={assignMutation.isPending || selectedAgents.length === 0}>
              {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign {selectedAgents.length} Agent(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
