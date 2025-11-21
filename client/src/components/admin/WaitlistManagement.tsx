import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@shared/logic/paymentUtils";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Search,
  User,
  MapPin,
  Phone,
  Mail,
  Fingerprint,
  Users as UsersIcon,
  Sprout,
  Briefcase,
} from "lucide-react";

interface WaitlistEntry {
  id: string;
  user_type: "farmer" | "agent";
  full_name: string;
  email?: string;
  phone: string;
  state: string;
  lga: string;
  town_village?: string;
  nin?: string;
  status: "pending" | "approved" | "rejected" | "under_review";
  created_at: string;
  // Farmer fields
  farm_size?: string;
  crop_types?: string[];
  years_of_farming_experience?: number;
  // Agent fields
  education_level?: string;
  has_smartphone?: boolean;
  languages_spoken?: string[];
  // Guarantor
  guarantor_name?: string;
  guarantor_phone?: string;
}

export default function WaitlistManagement() {
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [creditLimit, setCreditLimit] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [filterType, setFilterType] = useState<"all" | "farmer" | "agent">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: waitlistData, isLoading, error } = useQuery<{ entries: WaitlistEntry[] }>({
    queryKey: ["admin-waitlist", filterStatus, filterType],
    queryFn: async () => {
      let query = supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterStatus !== "all") {
        query = query.eq('status', filterStatus);
      }
      if (filterType !== "all") {
        query = query.eq('user_type', filterType);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Failed to fetch waitlist:', error);
        throw new Error(error.message);
      }
      
      return { entries: data || [] };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data: { entryId: string; creditLimit?: number }) => {
      const { data: result, error } = await supabase
        .from('waitlist')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', data.entryId)
        .select();
      
      if (error) {
        throw new Error(error.message);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-waitlist"] });
      toast({
        title: "Application Approved",
        description: "User credentials have been sent",
      });
      setReviewDialogOpen(false);
      resetReviewState();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data: { entryId: string; reason: string }) => {
      const { data: result, error } = await supabase
        .from('waitlist')
        .update({
          status: 'rejected',
          rejection_reason: data.reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', data.entryId)
        .select();
      
      if (error) {
        throw new Error(error.message);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-waitlist"] });
      toast({
        title: "Application Rejected",
        description: "Applicant has been notified",
      });
      setReviewDialogOpen(false);
      resetReviewState();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const entries = waitlistData?.entries || [];
  const filteredEntries = entries.filter(entry =>
    entry.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.phone.includes(searchQuery) ||
    (entry.email && entry.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleReview = (entry: WaitlistEntry, reviewAction: "approve" | "reject") => {
    setSelectedEntry(entry);
    setAction(reviewAction);
    if (reviewAction === "approve" && entry.user_type === "farmer") {
      setCreditLimit("50000");
    }
    setReviewDialogOpen(true);
  };

  const resetReviewState = () => {
    setSelectedEntry(null);
    setCreditLimit("");
    setRejectionReason("");
  };

  const handleSubmitReview = () => {
    if (!selectedEntry) return;

    if (action === "approve") {
      if (selectedEntry.user_type === "farmer" && !creditLimit) {
        toast({
          title: "Error",
          description: "Please enter a credit limit for farmers",
          variant: "destructive",
        });
        return;
      }

      approveMutation.mutate({
        entryId: selectedEntry.id,
        creditLimit: selectedEntry.user_type === "farmer" ? parseFloat(creditLimit) : undefined,
      });
    } else {
      if (!rejectionReason) {
        toast({
          title: "Error",
          description: "Please provide a rejection reason",
          variant: "destructive",
        });
        return;
      }

      rejectMutation.mutate({
        entryId: selectedEntry.id,
        reason: rejectionReason,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      approved: { variant: "default" as const, icon: CheckCircle2, text: "Approved" },
      rejected: { variant: "destructive" as const, icon: XCircle, text: "Rejected" },
      under_review: { variant: "secondary" as const, icon: Eye, text: "Under Review" },
    };
    const { variant, icon: Icon, text } = config[status as keyof typeof config] || config.pending;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {text}
      </Badge>
    );
  };

  const stats = {
    total: entries.length,
    pending: entries.filter(e => e.status === "pending").length,
    approved: entries.filter(e => e.status === "approved").length,
    rejected: entries.filter(e => e.status === "rejected").length,
    farmers: entries.filter(e => e.user_type === "farmer").length,
    agents: entries.filter(e => e.user_type === "agent").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Farmers</p>
                <p className="text-2xl font-bold">{stats.farmers}</p>
              </div>
              <Sprout className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agents</p>
                <p className="text-2xl font-bold">{stats.agents}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Waitlist Applications</CardTitle>
          <CardDescription>Review and approve farmer and agent applications</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="farmer">Farmers</SelectItem>
                  <SelectItem value="agent">Agents</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Entries List */}
          <ScrollArea className="h-[600px] pr-4">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                Loading applications...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No applications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <Card key={entry.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            {entry.user_type === "farmer" ? (
                              <Sprout className="w-6 h-6 text-primary" />
                            ) : (
                              <Briefcase className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{entry.full_name}</h3>
                              {getStatusBadge(entry.status)}
                              <Badge variant="outline" className="capitalize">
                                {entry.user_type}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                {entry.phone}
                              </div>
                              {entry.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  {entry.email}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {entry.state}, {entry.lga}
                                {entry.town_village && `, ${entry.town_village}`}
                              </div>
                              {entry.nin && (
                                <div className="flex items-center gap-2">
                                  <Fingerprint className="w-4 h-4" />
                                  NIN: {entry.nin}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground mb-2">
                            Applied: {format(new Date(entry.created_at), "MMM dd, yyyy")}
                          </p>
                          {entry.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleReview(entry, "approve")}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReview(entry, "reject")}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {entry.user_type === "farmer" && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Farm Size</p>
                              <p className="font-medium">{entry.farm_size}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Experience</p>
                              <p className="font-medium">{entry.years_of_farming_experience} years</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs text-muted-foreground">Crops</p>
                              <p className="font-medium">{entry.crop_types?.join(", ")}</p>
                            </div>
                          </>
                        )}
                        {entry.user_type === "agent" && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Education</p>
                              <p className="font-medium capitalize">{entry.education_level}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Smartphone</p>
                              <p className="font-medium">{entry.has_smartphone ? "Yes" : "No"}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-xs text-muted-foreground">Languages</p>
                              <p className="font-medium">{entry.languages_spoken?.join(", ")}</p>
                            </div>
                          </>
                        )}
                      </div>

                      {entry.guarantor_name && (
                        <>
                          <Separator className="my-4" />
                          <div className="flex items-center gap-2 text-sm">
                            <UsersIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Guarantor:</span>
                            <span className="font-medium">{entry.guarantor_name}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{entry.guarantor_phone}</span>
                          </div>
                        </>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Application" : "Reject Application"}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry?.full_name} • {selectedEntry?.phone}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {action === "approve" && selectedEntry?.user_type === "farmer" && (
              <div className="space-y-2">
                <Label htmlFor="creditLimit">
                  Credit Limit (₦) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="Enter credit limit"
                />
                <p className="text-sm text-muted-foreground">
                  Suggested limit based on farm size and experience
                </p>
              </div>
            )}

            {action === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a clear reason for rejection..."
                  rows={4}
                />
              </div>
            )}

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Application Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  <span className="font-medium capitalize">{selectedEntry?.user_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>{" "}
                  <span className="font-medium">{selectedEntry?.state}, {selectedEntry?.lga}</span>
                </div>
                {selectedEntry?.nin && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">NIN:</span>{" "}
                    <span className="font-medium">{selectedEntry.nin}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={action === "approve" ? "default" : "destructive"}
              onClick={handleSubmitReview}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {(approveMutation.isPending || rejectMutation.isPending) ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : action === "approve" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve & Send Credentials
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
