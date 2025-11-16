// client/src/components/admin/KycManagement.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { API_ENDPOINTS, getSupabaseHeaders } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, FileText, User, Phone, MapPin, Sprout, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatCurrency } from "@shared/logic/paymentUtils";

interface KycApplication {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  farmSize: string;
  farmLocation: string;
  cropTypes: string[];
  idType: string;
  idNumber: string;
  idDocumentUrl?: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorType: "chief" | "religious_leader";
  guarantorDocumentUrl?: string;
  kycStatus: "pending" | "verified" | "rejected";
  kycRejectionReason?: string;
  creditLimit: string;
  creditScore: number;
  createdAt: string;
}

export default function KycManagement() {
  const [selectedApplication, setSelectedApplication] = useState<KycApplication | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [creditLimit, setCreditLimit] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ Updated query
  const { data: applicationsData, isLoading } = useQuery<{ applications: KycApplication[] }>({
    queryKey: ["admin-kyc-pending"],
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.adminKycPending, {
        headers: getSupabaseHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch applications");
      return response.json();
    },
  });

  // ✅ Updated review mutation
  const reviewMutation = useMutation({
    mutationFn: async (data: {
      farmerId: string;
      action: "approve" | "reject";
      creditLimit?: number;
      rejectionReason?: string;
    }) => {
      // TODO: Create admin-kyc-review Edge Function
      const response = await fetch(`${API_ENDPOINTS.adminKycPending}/review`, {
        method: "POST",
        headers: { ...getSupabaseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to review KYC");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: `KYC application ${action === "approve" ? "approved" : "rejected"}`,
      });
      setReviewDialogOpen(false);
      setSelectedApplication(null);
      setCreditLimit("");
      setRejectionReason("");
    },
  });

  const applications = applicationsData?.applications || [];

  const calculateSuggestedLimit = (application: KycApplication | null): number => {
    if (!application) return 50000;
    const baseLimit = 50000;
    const scoreMultiplier = (application.creditScore || 50) / 100;
    const farmSizeMultiplier = parseFarmSize(application.farmSize);
    return Math.round(baseLimit * scoreMultiplier * farmSizeMultiplier);
  };

  const parseFarmSize = (farmSize: string): number => {
    if (!farmSize) return 1;
    const match = farmSize.match(/(\d+)/);
    if (!match) return 1;
    const size = parseInt(match[1]);
    if (size < 2) return 0.5;
    if (size < 5) return 1;
    if (size < 10) return 1.5;
    return 2;
  };

  const handleReview = (application: KycApplication, reviewAction: "approve" | "reject") => {
    setSelectedApplication(application);
    setAction(reviewAction);
    if (reviewAction === "approve") {
      const suggestedLimit = calculateSuggestedLimit(application);
      setCreditLimit(suggestedLimit.toString());
    }
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!selectedApplication) return;

    if (action === "approve" && !creditLimit) {
      toast({
        title: "Error",
        description: "Please enter a credit limit",
        variant: "destructive",
      });
      return;
    }

    if (action === "reject" && !rejectionReason) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    reviewMutation.mutate({
      farmerId: selectedApplication.id,
      action,
      creditLimit: action === "approve" ? parseFloat(creditLimit) : undefined,
      rejectionReason: action === "reject" ? rejectionReason : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>KYC Review Queue</CardTitle>
          <CardDescription>
            Review and approve farmer applications. {applications.length} pending review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
              <p className="text-muted-foreground">No pending KYC applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6">
                    {/* ... rest of the component remains unchanged ... */}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve KYC Application" : "Reject KYC Application"}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? `Set credit limit for ${selectedApplication?.fullName || 'this farmer'}`
                : `Provide reason for rejecting ${selectedApplication?.fullName || 'this farmer'}'s application`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {action === "approve" ? (
              <>
                {selectedApplication && (
                  <div>
                    <Label className="text-muted-foreground">Farmer Details</Label>
                    <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Farm Size:</span>
                        <span className="font-medium text-sm">{selectedApplication.farmSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Location:</span>
                        <span className="font-medium text-sm">{selectedApplication.farmLocation}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Credit Score:</span>
                        <span className="font-medium text-sm">{selectedApplication.creditScore}/100</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Credit Limit</Label>
                  <Input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="Enter credit limit in Naira"
                  />
                  {selectedApplication && (
                    <p className="text-xs text-muted-foreground">
                      Suggested: {formatCurrency(calculateSuggestedLimit(selectedApplication))}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Note:</strong> The farmer will be able to borrow up to this amount. Ensure the limit is appropriate based on their farm size and credit score.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a clear reason for rejection..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be visible to the farmer
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              onClick={handleSubmitReview}
              disabled={
                reviewMutation.isPending ||
                (action === "approve" && !creditLimit) ||
                (action === "reject" && !rejectionReason)
              }
            >
              {reviewMutation.isPending ? "Processing..." : action === "approve" ? "Approve Application" : "Reject Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}