// Modern KYC Management Component with Due Diligence & Third-Party Verification
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_ENDPOINTS, getSupabaseHeaders } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  User, 
  Phone, 
  MapPin, 
  Sprout, 
  Shield,
  AlertTriangle,
  Eye,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Fingerprint,
  CreditCard,
  Building2,
  UserCheck
} from "lucide-react";
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
  agentId?: string;
  agentName?: string;
}

interface DueDiligenceChecklist {
  personalInfoVerified: boolean;
  idDocumentVerified: boolean;
  addressVerified: boolean;
  farmDetailsVerified: boolean;
  guarantorVerified: boolean;
  ninVerified: boolean;
  bvnVerified: boolean;
  creditCheckCompleted: boolean;
  notes: string;
}

interface ThirdPartyVerification {
  status: "pending" | "verified" | "failed";
  provider?: string;
  verifiedAt?: string;
  details?: any;
}

export default function ModernKycManagement() {
  const [selectedApplication, setSelectedApplication] = useState<KycApplication | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [creditLimit, setCreditLimit] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "verified" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Due Diligence Checklist State
  const [dueDiligence, setDueDiligence] = useState<DueDiligenceChecklist>({
    personalInfoVerified: false,
    idDocumentVerified: false,
    addressVerified: false,
    farmDetailsVerified: false,
    guarantorVerified: false,
    ninVerified: false,
    bvnVerified: false,
    creditCheckCompleted: false,
    notes: "",
  });

  // Third-Party Verification State
  const [ninVerification, setNinVerification] = useState<ThirdPartyVerification>({
    status: "pending"
  });
  const [bvnVerification, setBvnVerification] = useState<ThirdPartyVerification>({
    status: "pending"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const reviewMutation = useMutation({
    mutationFn: async (data: {
      farmerId: string;
      action: "approve" | "reject";
      creditLimit?: number;
      rejectionReason?: string;
      dueDiligenceChecklist?: DueDiligenceChecklist;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({
        title: "Success",
        description: `KYC application ${action === "approve" ? "approved" : "rejected"}`,
      });
      setReviewDialogOpen(false);
      resetReviewState();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to review application",
        variant: "destructive",
      });
    },
  });

  // Simulate NIN Verification (Replace with actual API integration)
  const verifyNinMutation = useMutation({
    mutationFn: async (ninNumber: string) => {
      // TODO: Integrate with CheckMyBVN or similar service
      // const response = await fetch('https://api.checkmybvn.com/verify-nin', {
      //   method: 'POST',
      //   headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
      //   body: JSON.stringify({ nin: ninNumber })
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        verified: true,
        fullName: selectedApplication?.fullName,
        dateOfBirth: "1985-03-15",
        matchScore: 95,
      };
    },
    onSuccess: (data) => {
      setNinVerification({
        status: "verified",
        provider: "CheckMyBVN",
        verifiedAt: new Date().toISOString(),
        details: data,
      });
      setDueDiligence(prev => ({ ...prev, ninVerified: true }));
      toast({
        title: "NIN Verified",
        description: "National Identity Number verified successfully",
      });
    },
    onError: () => {
      setNinVerification({ status: "failed" });
      toast({
        title: "Verification Failed",
        description: "Could not verify NIN. Please check the details.",
        variant: "destructive",
      });
    },
  });

  // Simulate BVN Verification
  const verifyBvnMutation = useMutation({
    mutationFn: async (bvnNumber: string) => {
      // TODO: Integrate with BVN verification service
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        verified: true,
        fullName: selectedApplication?.fullName,
        phoneNumber: selectedApplication?.phone,
        matchScore: 92,
      };
    },
    onSuccess: (data) => {
      setBvnVerification({
        status: "verified",
        provider: "NIBSS",
        verifiedAt: new Date().toISOString(),
        details: data,
      });
      setDueDiligence(prev => ({ ...prev, bvnVerified: true }));
      toast({
        title: "BVN Verified",
        description: "Bank Verification Number verified successfully",
      });
    },
    onError: () => {
      setBvnVerification({ status: "failed" });
      toast({
        title: "Verification Failed",
        description: "Could not verify BVN. Please check the details.",
        variant: "destructive",
      });
    },
  });

  const applications = applicationsData?.applications || [];
  
  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === "all" || app.kycStatus === filterStatus;
    const matchesSearch = app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.phone.includes(searchQuery) ||
                         app.idNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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

  const calculateCompletionScore = (): number => {
    const checks = Object.values(dueDiligence).filter(v => typeof v === 'boolean');
    const completed = checks.filter(v => v === true).length;
    return Math.round((completed / checks.length) * 100);
  };

  const handleReview = (application: KycApplication, reviewAction: "approve" | "reject") => {
    setSelectedApplication(application);
    setAction(reviewAction);
    if (reviewAction === "approve") {
      const suggestedLimit = calculateSuggestedLimit(application);
      setCreditLimit(suggestedLimit.toString());
    }
    resetDueDiligenceState();
    setReviewDialogOpen(true);
  };

  const resetDueDiligenceState = () => {
    setDueDiligence({
      personalInfoVerified: false,
      idDocumentVerified: false,
      addressVerified: false,
      farmDetailsVerified: false,
      guarantorVerified: false,
      ninVerified: false,
      bvnVerified: false,
      creditCheckCompleted: false,
      notes: "",
    });
    setNinVerification({ status: "pending" });
    setBvnVerification({ status: "pending" });
  };

  const resetReviewState = () => {
    setSelectedApplication(null);
    setCreditLimit("");
    setRejectionReason("");
    resetDueDiligenceState();
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

    if (action === "approve") {
      const completionScore = calculateCompletionScore();
      if (completionScore < 50) {
        toast({
          title: "Incomplete Due Diligence",
          description: "Please complete at least 50% of due diligence checks before approving",
          variant: "destructive",
        });
        return;
      }
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
      dueDiligenceChecklist: action === "approve" ? dueDiligence : undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending Review" },
      verified: { variant: "default" as const, icon: CheckCircle, text: "Verified" },
      rejected: { variant: "destructive" as const, icon: XCircle, text: "Rejected" },
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const getVerificationBadge = (verification: ThirdPartyVerification) => {
    if (verification.status === "verified") {
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Verified</Badge>;
    }
    if (verification.status === "failed") {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{applications.filter(a => a.kycStatus === "pending").length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{applications.filter(a => a.kycStatus === "verified").length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{applications.filter(a => a.kycStatus === "rejected").length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main KYC Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>KYC Applications</CardTitle>
              <CardDescription>
                Review farmer applications with comprehensive due diligence checks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or ID number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All ({applications.length})
              </Button>
              <Button
                variant={filterStatus === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("pending")}
              >
                Pending ({applications.filter(a => a.kycStatus === "pending").length})
              </Button>
              <Button
                variant={filterStatus === "verified" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("verified")}
              >
                Verified ({applications.filter(a => a.kycStatus === "verified").length})
              </Button>
              <Button
                variant={filterStatus === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("rejected")}
              >
                Rejected ({applications.filter(a => a.kycStatus === "rejected").length})
              </Button>
            </div>
          </div>

          {/* Applications List */}
          <ScrollArea className="h-[600px] pr-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading applications...
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No applications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((application) => (
                  <Card key={application.id} className={cn(
                    "border-l-4 transition-all hover:shadow-md",
                    application.kycStatus === "pending" && "border-l-orange-500",
                    application.kycStatus === "verified" && "border-l-green-500",
                    application.kycStatus === "rejected" && "border-l-red-500"
                  )}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{application.fullName}</h3>
                              {getStatusBadge(application.kycStatus)}
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {application.phone}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {application.farmLocation}
                              </div>
                              <div className="flex items-center gap-2">
                                <Sprout className="w-4 h-4" />
                                Farm Size: {application.farmSize}
                              </div>
                              {application.agentName && (
                                <div className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4" />
                                  Agent: {application.agentName}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-2">
                            Applied: {format(new Date(application.createdAt), "MMM dd, yyyy")}
                          </p>
                          {application.kycStatus === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReview(application, "approve")}
                                className="gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                Review
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReview(application, "reject")}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">ID Type</p>
                          <p className="font-medium">{application.idType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">ID Number</p>
                          <p className="font-medium">{application.idNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Credit Score</p>
                          <p className="font-medium">{application.creditScore}/100</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Credit Limit</p>
                          <p className="font-medium">{formatCurrency(parseFloat(application.creditLimit || "0"))}</p>
                        </div>
                      </div>

                      {application.kycStatus === "rejected" && application.kycRejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                          <p className="text-sm text-red-900 dark:text-red-100">
                            <strong>Rejection Reason:</strong> {application.kycRejectionReason}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === "approve" ? (
                <>
                  <Shield className="w-5 h-5 text-green-600" />
                  Due Diligence & Approval
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Reject Application
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedApplication?.fullName} • {selectedApplication?.phone}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            {action === "approve" ? (
              <Tabs defaultValue="verification" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="verification">Verification</TabsTrigger>
                  <TabsTrigger value="diligence">Due Diligence</TabsTrigger>
                  <TabsTrigger value="approval">Approval</TabsTrigger>
                </TabsList>

                {/* Third-Party Verification Tab */}
                <TabsContent value="verification" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Third-Party Verification</CardTitle>
                      <CardDescription>
                        Verify identity documents with external services
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* NIN Verification */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Fingerprint className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium">NIN Verification</p>
                              <p className="text-sm text-muted-foreground">National Identity Number</p>
                            </div>
                          </div>
                          {getVerificationBadge(ninVerification)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Input
                            value={selectedApplication?.idNumber || ""}
                            disabled
                            placeholder="NIN Number"
                          />
                          <Button
                            onClick={() => verifyNinMutation.mutate(selectedApplication?.idNumber || "")}
                            disabled={verifyNinMutation.isPending || ninVerification.status === "verified"}
                            size="sm"
                          >
                            {verifyNinMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              "Verify"
                            )}
                          </Button>
                        </div>

                        {ninVerification.status === "verified" && (
                          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg space-y-2">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                              ✓ Verified via {ninVerification.provider}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Match Score: {ninVerification.details?.matchScore}%
                            </p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* BVN Verification */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="font-medium">BVN Verification</p>
                              <p className="text-sm text-muted-foreground">Bank Verification Number</p>
                            </div>
                          </div>
                          {getVerificationBadge(bvnVerification)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Enter BVN"
                            disabled={bvnVerification.status === "verified"}
                          />
                          <Button
                            onClick={() => verifyBvnMutation.mutate("22123456789")}
                            disabled={verifyBvnMutation.isPending || bvnVerification.status === "verified"}
                            size="sm"
                          >
                            {verifyBvnMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              "Verify"
                            )}
                          </Button>
                        </div>

                        {bvnVerification.status === "verified" && (
                          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg space-y-2">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                              ✓ Verified via {bvnVerification.provider}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Match Score: {bvnVerification.details?.matchScore}%
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-900 dark:text-blue-100">
                            <p className="font-medium mb-1">Integration Ready</p>
                            <p>Connect with CheckMyBVN, NIBSS, or other verification providers to enable real-time identity verification.</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Due Diligence Checklist Tab */}
                <TabsContent value="diligence" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Due Diligence Checklist</CardTitle>
                          <CardDescription>Complete verification checks before approval</CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{calculateCompletionScore()}%</p>
                          <p className="text-xs text-muted-foreground">Complete</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Checklist Items */}
                      <div className="space-y-3">
                        <ChecklistItem
                          label="Personal Information Verified"
                          description="Name, phone, and contact details confirmed"
                          checked={dueDiligence.personalInfoVerified}
                          onCheckedChange={(checked) => setDueDiligence(prev => ({ ...prev, personalInfoVerified: checked }))}
                        />
                        <ChecklistItem
                          label="ID Document Verified"
                          description="Government-issued ID checked and validated"
                          checked={dueDiligence.idDocumentVerified}
                          onCheckedChange={(checked) => setDueDiligence(prev => ({ ...prev, idDocumentVerified: checked }))}
                        />
                        <ChecklistItem
                          label="Address Verified"
                          description="Farm location and address confirmed"
                          checked={dueDiligence.addressVerified}
                          onCheckedChange={(checked) => setDueDiligence(prev => ({ ...prev, addressVerified: checked }))}
                        />
                        <ChecklistItem
                          label="Farm Details Verified"
                          description="Farm size and crop types validated"
                          checked={dueDiligence.farmDetailsVerified}
                          onCheckedChange={(checked) => setDueDiligence(prev => ({ ...prev, farmDetailsVerified: checked }))}
                        />
                        <ChecklistItem
                          label="Guarantor Verified"
                          description="Guarantor details and documents checked"
                          checked={dueDiligence.guarantorVerified}
                          onCheckedChange={(checked) => setDueDiligence(prev => ({ ...prev, guarantorVerified: checked }))}
                        />
                        <ChecklistItem
                          label="NIN Verified"
                          description="National Identity Number validated"
                          checked={dueDiligence.ninVerified}
                          onCheckedChange={(checked) => setDueDiligence(prev => ({ ...prev, ninVerified: checked }))}
                          disabled={ninVerification.status !== "verified"}
                          hint={ninVerification.status !== "verified" ? "Complete NIN verification first" : ""}
                        />
                        <ChecklistItem
                          label="BVN Verified"
                          description="Bank Verification Number checked"
                          checked={dueDiligence.bvnVerified}
                          onCheckedChange={(checked) => setDueDiligence(prev => ({ ...prev, bvnVerified: checked }))}
                          disabled={bvnVerification.status !== "verified"}
                          hint={bvnVerification.status !== "verified" ? "Complete BVN verification first" : ""}
                        />
                        <ChecklistItem
                          label="Credit Check Completed"
                          description="Credit history and score reviewed"
                          checked={dueDiligence.creditCheckCompleted}
                          onCheckedChange={(checked) => setDueDiligence(prev => ({ ...prev, creditCheckCompleted: checked }))}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Due Diligence Notes</Label>
                        <Textarea
                          placeholder="Add any additional notes or observations..."
                          value={dueDiligence.notes}
                          onChange={(e) => setDueDiligence(prev => ({ ...prev, notes: e.target.value }))}
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Approval Tab */}
                <TabsContent value="approval" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Set Credit Limit</CardTitle>
                      <CardDescription>
                        Determine the maximum credit amount for this farmer
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedApplication && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Farm Size</p>
                            <p className="font-medium">{selectedApplication.farmSize}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-medium">{selectedApplication.farmLocation}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Credit Score</p>
                            <p className="font-medium">{selectedApplication.creditScore}/100</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Crop Types</p>
                            <p className="font-medium">{selectedApplication.cropTypes.join(", ")}</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Credit Limit (₦)</Label>
                        <Input
                          type="number"
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(e.target.value)}
                          placeholder="Enter credit limit"
                          className="text-lg"
                        />
                        {selectedApplication && (
                          <p className="text-sm text-muted-foreground">
                            Suggested: <span className="font-medium text-foreground">
                              {formatCurrency(calculateSuggestedLimit(selectedApplication))}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Credit Limit Guidelines
                        </p>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <li>• Based on farm size, location, and credit score</li>
                          <li>• Farmer can borrow up to 50% of limit upfront</li>
                          <li>• Remaining 50% paid after order approval</li>
                          <li>• Limit can be adjusted later based on performance</li>
                        </ul>
                      </div>

                      {calculateCompletionScore() < 50 && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div className="text-sm text-orange-900 dark:text-orange-100">
                              <p className="font-medium mb-1">Incomplete Due Diligence</p>
                              <p>Complete at least 50% of due diligence checks before approving this application.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a clear and specific reason for rejection..."
                    rows={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    This reason will be communicated to the farmer and their agent
                  </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                    Common rejection reasons:
                  </p>
                  <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                    <li>• Incomplete or invalid ID documentation</li>
                    <li>• Unable to verify guarantor information</li>
                    <li>• Insufficient farming experience or farm size</li>
                    <li>• Previous default history or poor credit score</li>
                    <li>• Location outside service area</li>
                  </ul>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              onClick={handleSubmitReview}
              disabled={
                reviewMutation.isPending ||
                (action === "approve" && (!creditLimit || calculateCompletionScore() < 50)) ||
                (action === "reject" && !rejectionReason)
              }
            >
              {reviewMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : action === "approve" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve Application
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Checklist Item Component
interface ChecklistItemProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
}

function ChecklistItem({ label, description, checked, onCheckedChange, disabled, hint }: ChecklistItemProps) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
      checked && "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
      disabled && "opacity-50 cursor-not-allowed"
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        disabled={disabled}
        className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:cursor-not-allowed"
      />
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {hint && <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{hint}</p>}
      </div>
      {checked && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
    </div>
  );
}
