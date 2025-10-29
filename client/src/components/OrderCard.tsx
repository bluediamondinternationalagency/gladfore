import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@shared/logic/paymentUtils";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface OrderCardProps {
  orderId: string;
  farmerName: string;
  totalCost: string | number;
  downPayment: string | number;
  balance: string | number;
  status: "pending" | "approved" | "rejected";
  dueDate: string | Date;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}

export default function OrderCard({
  orderId,
  farmerName,
  totalCost,
  downPayment,
  balance,
  status,
  dueDate,
  onApprove,
  onReject,
  showActions = false,
}: OrderCardProps) {
  const statusConfig = {
    pending: { label: "Pending", icon: Clock, color: "text-yellow-600" },
    approved: { label: "Approved", icon: CheckCircle, color: "text-green-600" },
    rejected: { label: "Rejected", icon: XCircle, color: "text-red-600" },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="p-6" data-testid={`order-card-${orderId}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg" data-testid="text-farmer-name">{farmerName}</h3>
          <p className="text-sm text-muted-foreground">Order #{orderId.slice(0, 8)}</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <StatusIcon className={`w-3 h-3 ${config.color}`} />
          {config.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="font-semibold" data-testid="text-total-cost">{formatCurrency(totalCost)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Down Payment</p>
          <p className="font-semibold text-primary" data-testid="text-down-payment">{formatCurrency(downPayment)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Balance Due</p>
          <p className="font-semibold" data-testid="text-balance">{formatCurrency(balance)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Due Date</p>
          <p className="font-semibold" data-testid="text-due-date">{formatDate(dueDate)}</p>
        </div>
      </div>

      {showActions && status === "pending" && (
        <div className="flex gap-2 mt-4">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={onApprove}
            data-testid="button-approve"
          >
            Approve
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            className="flex-1"
            onClick={onReject}
            data-testid="button-reject"
          >
            Reject
          </Button>
        </div>
      )}
    </Card>
  );
}
