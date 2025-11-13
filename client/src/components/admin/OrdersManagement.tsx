// 3. OrdersManagement.tsx
// ============================================
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye } from "lucide-react";
import { formatCurrency } from "@shared/logic/paymentUtils";
import { format } from "date-fns";

export default function OrdersManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["admin-orders", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`/.netlify/functions/admin-orders?${params}`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  const orders = ordersData?.orders || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      delivered: "outline",
      completed: "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Orders Management</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No orders found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Farmer</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">#{order.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{order.farmerName}</TableCell>
                  <TableCell>{formatCurrency(parseFloat(order.total_cost || order.totalCost))}</TableCell>
                  <TableCell>{formatCurrency(parseFloat(order.balance))}</TableCell>
                  <TableCell>{format(new Date(order.due_date || order.dueDate), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
