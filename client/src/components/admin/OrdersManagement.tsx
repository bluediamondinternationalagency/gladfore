// 3. OrdersManagement.tsx
// ============================================
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { API_ENDPOINTS, getSupabaseHeaders, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Search, Eye, MoreVertical, CheckCircle, XCircle, Truck, Ban, FileText, Loader2 } from "lucide-react";
import { formatCurrency } from "@shared/logic/paymentUtils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function OrdersManagement() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "deliver" | "cancel" | "add_note" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["admin-orders", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      
      const response = await fetch(`${API_ENDPOINTS.adminOrders}?${params}`, {
        headers: getSupabaseHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  // Order action mutation
  const orderActionMutation = useMutation({
    mutationFn: api.adminOrderAction,
    onSuccess: (data, variables) => {
      toast({ 
        title: "Success", 
        description: data.message || `Order ${variables.action}d successfully` 
      });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setActionDialogOpen(false);
      setActionReason("");
      setAdminNotes("");
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const orders = ordersData?.orders || [];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; color?: string }> = {
      pending: { variant: "secondary" },
      approved: { variant: "default" },
      rejected: { variant: "destructive" },
      cancelled: { variant: "destructive" },
      delivered: { variant: "outline" },
      completed: { variant: "default" },
    };
    const { variant } = config[status] || { variant: "secondary" };
    return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
  };

  const handleAction = (order: any, action: typeof actionType) => {
    setSelectedOrder(order);
    setActionType(action);
    setActionDialogOpen(true);
    setActionReason("");
    setAdminNotes(order.admin_notes || "");
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setViewDetailsOpen(true);
  };

  const confirmAction = () => {
    if (!selectedOrder || !actionType) return;

    const payload: any = {
      orderId: selectedOrder.id,
      action: actionType,
    };

    if (actionType === "reject" || actionType === "cancel") {
      if (!actionReason.trim()) {
        toast({ title: "Error", description: "Reason is required", variant: "destructive" });
        return;
      }
      payload.reason = actionReason;
    }

    if (actionType === "add_note") {
      if (!adminNotes.trim()) {
        toast({ title: "Error", description: "Notes are required", variant: "destructive" });
        return;
      }
      payload.notes = adminNotes;
    }

    orderActionMutation.mutate(payload);
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
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading orders...
          </div>
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
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {order.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction(order, "approve")}>
                                <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                Approve Order
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(order, "reject")}>
                                <XCircle className="w-4 h-4 mr-2 text-red-600" />
                                Reject Order
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {order.status === "approved" && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction(order, "deliver")}>
                                <Truck className="w-4 h-4 mr-2 text-blue-600" />
                                Mark as Delivered
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {["pending", "approved"].includes(order.status) && (
                            <>
                              <DropdownMenuItem onClick={() => handleAction(order, "cancel")}>
                                <Ban className="w-4 h-4 mr-2 text-orange-600" />
                                Cancel Order
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleAction(order, "add_note")}>
                            <FileText className="w-4 h-4 mr-2" />
                            Add/Edit Notes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* View Order Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.id.slice(0, 8)} details
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Farmer</Label>
                  <p className="font-medium">{selectedOrder.farmerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Agent</Label>
                  <p className="font-medium">{selectedOrder.agentName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Created</Label>
                  <p>{format(new Date(selectedOrder.created_at), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Due Date</Label>
                  <p>{format(new Date(selectedOrder.due_date || selectedOrder.dueDate), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Delivery Address</Label>
                  <p>{selectedOrder.delivery_address || "N/A"}</p>
                </div>
              </div>

              {/* Financial Details */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Financial Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Total Cost</Label>
                    <p className="text-lg font-bold">{formatCurrency(parseFloat(selectedOrder.total_cost || selectedOrder.totalCost))}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Down Payment</Label>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(parseFloat(selectedOrder.down_payment || selectedOrder.downPayment))}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Balance Due</Label>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatCurrency(parseFloat(selectedOrder.balance))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Order Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.productName || item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(item.unitPrice || item.unit_price))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(item.totalPrice || item.total_price))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Admin Notes */}
              {selectedOrder.admin_notes && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Admin Notes</Label>
                  <p className="mt-1 text-sm bg-muted p-3 rounded">{selectedOrder.admin_notes}</p>
                </div>
              )}

              {/* Rejection/Cancellation Reason */}
              {(selectedOrder.rejection_reason || selectedOrder.cancellation_reason) && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground text-xs">
                    {selectedOrder.status === "rejected" ? "Rejection Reason" : "Cancellation Reason"}
                  </Label>
                  <p className="mt-1 text-sm bg-destructive/10 p-3 rounded text-destructive">
                    {selectedOrder.rejection_reason || selectedOrder.cancellation_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Order"}
              {actionType === "reject" && "Reject Order"}
              {actionType === "deliver" && "Mark as Delivered"}
              {actionType === "cancel" && "Cancel Order"}
              {actionType === "add_note" && "Add/Edit Admin Notes"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" && "Confirm order approval. The agent will be notified."}
              {actionType === "reject" && "Provide a reason for rejecting this order. Farmer's credit will be restored."}
              {actionType === "deliver" && "Confirm that this order has been delivered to the farmer."}
              {actionType === "cancel" && "Provide a reason for cancelling this order. Farmer's credit will be restored."}
              {actionType === "add_note" && "Add internal notes for this order."}
            </DialogDescription>
          </DialogHeader>
          
          {(actionType === "reject" || actionType === "cancel") && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={`Enter ${actionType === "reject" ? "rejection" : "cancellation"} reason...`}
                rows={4}
              />
            </div>
          )}

          {actionType === "add_note" && (
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes *</Label>
              <Textarea
                id="notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter admin notes..."
                rows={5}
              />
            </div>
          )}

          {actionType === "approve" && (
            <div className="bg-muted p-4 rounded text-sm">
              <p>Order will be approved and agent will be notified.</p>
            </div>
          )}

          {actionType === "deliver" && (
            <div className="bg-muted p-4 rounded text-sm">
              <p>Order will be marked as delivered and farmer will be notified.</p>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialogOpen(false)}
              disabled={orderActionMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmAction}
              disabled={orderActionMutation.isPending}
              variant={actionType === "reject" || actionType === "cancel" ? "destructive" : "default"}
            >
              {orderActionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
