// ============================================
// 1. FarmersManagement.tsx
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
import { Search, Eye, TrendingUp } from "lucide-react";
import { formatCurrency } from "@shared/logic/paymentUtils";

export default function FarmersManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: farmersData, isLoading } = useQuery({
    queryKey: ["admin-farmers", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`/.netlify/functions/admin-farmers?${params}`);
      if (!response.ok) throw new Error("Failed to fetch farmers");
      return response.json();
    },
  });

  const farmers = farmersData?.farmers || [];

  const getKycBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      verified: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
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
    </div>
  );
}