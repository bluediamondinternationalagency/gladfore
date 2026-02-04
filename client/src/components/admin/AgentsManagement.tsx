// 2. AgentsManagement.tsx
// ============================================
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_ENDPOINTS, getSupabaseHeaders } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye } from "lucide-react";
import { formatCurrency } from "@shared/logic/paymentUtils";

export default function AgentsManagement() {
  const [search, setSearch] = useState("");

  const { data: agentsData, isLoading } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.adminAgents, {
        headers: getSupabaseHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch agents");
      return response.json();
    },
  });

  const agents = agentsData?.agents || [];
  const filteredAgents = agents.filter((a: any) =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.includes(search)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Agents Management</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading agents...</div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No agents found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Super Agent</TableHead>
                <TableHead>Total Sales</TableHead>
                <TableHead>Commission Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent: any) => (
                (() => {
                  const assignment = agent.agent_assignments?.[0];
                  const superAgent = assignment?.super_agent_profiles;
                  return (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.full_name}</TableCell>
                  <TableCell>{agent.phone}</TableCell>
                  <TableCell>{agent.region || "N/A"}</TableCell>
                  <TableCell>{superAgent?.full_name || "Unassigned"}</TableCell>
                  <TableCell>{formatCurrency(parseFloat(agent.total_sales || "0"))}</TableCell>
                  <TableCell>{agent.commission_rate}%</TableCell>
                  <TableCell>
                    {agent.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                  );
                })()
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}