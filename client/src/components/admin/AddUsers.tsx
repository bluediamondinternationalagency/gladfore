// client/src/components/admin/AddUsers.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Users, Copy, Eye, EyeOff, Download } from "lucide-react";

interface CreatedUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  role: "farmer" | "agent";
  creditLimit?: string;
}

export default function AddUsers() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [userType, setUserType] = useState<"farmer" | "agent">("farmer");
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [farmerData, setFarmerData] = useState({
    fullName: "",
    phone: "",
    email: "",
    farmSize: "",
    farmLocation: "",
    cropTypes: "",
    idType: "national_id" as const,
    idNumber: "",
    guarantorName: "",
    guarantorPhone: "",
    guarantorType: "chief" as const,
    creditLimit: "50000",
    autoApproveKyc: true,
  });

  const [agentData, setAgentData] = useState({
    fullName: "",
    phone: "",
    email: "",
    region: "",
    commissionRate: "2.5",
    collectionCommissionRate: "1.0",
  });

  const toast = useToast().toast;
  const queryClient = useQueryClient();

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/.netlify/functions/admin-create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create user";
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || errorMessage;
        } catch {
          errorMessage = await response.text() || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setCreatedUser(data.user);
      setAddDialogOpen(false);
      setCredentialsDialogOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/farmers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });

      setSuccessMsg(`User created successfully! Password: ${data.user.password}`);
      setError(null);

      setFarmerData({
        fullName: "",
        phone: "",
        email: "",
        farmSize: "",
        farmLocation: "",
        cropTypes: "",
        idType: "national_id",
        idNumber: "",
        guarantorName: "",
        guarantorPhone: "",
        guarantorType: "chief",
        creditLimit: "50000",
        autoApproveKyc: true,
      });

      setAgentData({
        fullName: "",
        phone: "",
        email: "",
        region: "",
        commissionRate: "2.5",
        collectionCommissionRate: "1.0",
      });
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    setError(null);
    setSuccessMsg(null);

    if (userType === "farmer") {
      if (!farmerData.fullName || !farmerData.phone || !farmerData.farmLocation) {
        setError("Please fill in all required fields");
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
        return;
      }
      const cropTypesArray = farmerData.cropTypes.split(",").map(c => c.trim()).filter(c => c.length > 0);
      createUserMutation.mutate({ userType: "farmer", ...farmerData, cropTypes: cropTypesArray });
    } else {
      if (!agentData.fullName || !agentData.phone || !agentData.region) {
        setError("Please fill in all required fields");
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
        return;
      }
      createUserMutation.mutate({ userType: "agent", ...agentData });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const downloadCredentials = () => {
    if (!createdUser) return;

    const content = `
GLADFORE FERTILIZER CREDIT PROGRAM
${createdUser.role.toUpperCase()} LOGIN CREDENTIALS

Name: ${createdUser.fullName}
Phone: ${createdUser.phone}
${createdUser.email ? `Email: ${createdUser.email}\n` : ""}
Password: ${createdUser.password}

Login URL: ${window.location.origin}/login

Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${createdUser.fullName.replace(/\s+/g, "_")}_credentials.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({ title: "Downloaded", description: "Credentials file downloaded successfully" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Add Farmers & Agents</CardTitle>
            <CardDescription>Create new users with auto-generated credentials</CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Add New User
          </Button>
        </CardHeader>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New {userType === "farmer" ? "Farmer" : "Agent"}</DialogTitle>
            <DialogDescription>Fill in the details below. Login credentials will be auto-generated.</DialogDescription>
          </DialogHeader>

          <Tabs value={userType} onValueChange={(v) => setUserType(v as "farmer" | "agent")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="farmer">Farmer</TabsTrigger>
              <TabsTrigger value="agent">Agent</TabsTrigger>
            </TabsList>

            {/* Farmer Form */}
            <TabsContent value="farmer" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={farmerData.fullName} onChange={e => setFarmerData(f => ({ ...f, fullName: e.target.value }))} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={farmerData.phone} onChange={e => setFarmerData(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={farmerData.email} onChange={e => setFarmerData(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Farm Size</Label>
                  <Input value={farmerData.farmSize} onChange={e => setFarmerData(f => ({ ...f, farmSize: e.target.value }))} />
                </div>
                <div>
                  <Label>Farm Location</Label>
                  <Input value={farmerData.farmLocation} onChange={e => setFarmerData(f => ({ ...f, farmLocation: e.target.value }))} />
                </div>
                <div>
                  <Label>Crop Types (comma separated)</Label>
                  <Input value={farmerData.cropTypes} onChange={e => setFarmerData(f => ({ ...f, cropTypes: e.target.value }))} />
                </div>
                <div>
                  <Label>Guarantor Name</Label>
                  <Input value={farmerData.guarantorName} onChange={e => setFarmerData(f => ({ ...f, guarantorName: e.target.value }))} />
                </div>
                <div>
                  <Label>Guarantor Phone</Label>
                  <Input value={farmerData.guarantorPhone} onChange={e => setFarmerData(f => ({ ...f, guarantorPhone: e.target.value }))} />
                </div>
              </div>
            </TabsContent>

            {/* Agent Form */}
            <TabsContent value="agent" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={agentData.fullName} onChange={e => setAgentData(a => ({ ...a, fullName: e.target.value }))} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={agentData.phone} onChange={e => setAgentData(a => ({ ...a, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={agentData.email} onChange={e => setAgentData(a => ({ ...a, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Region</Label>
                  <Input value={agentData.region} onChange={e => setAgentData(a => ({ ...a, region: e.target.value }))} />
                </div>
                <div>
                  <Label>Commission Rate (%)</Label>
                  <Input value={agentData.commissionRate} onChange={e => setAgentData(a => ({ ...a, commissionRate: e.target.value }))} />
                </div>
                <div>
                  <Label>Collection Commission Rate (%)</Label>
                  <Input value={agentData.collectionCommissionRate} onChange={e => setAgentData(a => ({ ...a, collectionCommissionRate: e.target.value }))} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating..." : `Create ${userType === "farmer" ? "Farmer" : "Agent"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              User Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Save these login credentials. They will not be shown again.
            </DialogDescription>
          </DialogHeader>

          {createdUser && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">Name</Label>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-mono">{createdUser.fullName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(createdUser.fullName, "Name")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">Phone</Label>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-mono">{createdUser.phone}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(createdUser.phone, "Phone")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {createdUser.email && (
                    <div>
                      <Label className="text-sm font-medium text-green-800 dark:text-green-200">Email</Label>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-mono">{createdUser.email}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(createdUser.email!, "Email")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">Password</Label>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-mono">
                        {showPassword ? createdUser.password : "••••••••"}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(createdUser.password, "Password")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">Role</Label>
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {createdUser.role.charAt(0).toUpperCase() + createdUser.role.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {createdUser.role === "farmer" && createdUser.creditLimit && (
                    <div>
                      <Label className="text-sm font-medium text-green-800 dark:text-green-200">Credit Limit</Label>
                      <div className="mt-1">
                        <span className="text-sm font-mono">₦{parseInt(createdUser.creditLimit).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={downloadCredentials} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download Credentials
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(
                    `Name: ${createdUser.fullName}\nPhone: ${createdUser.phone}\n${createdUser.email ? `Email: ${createdUser.email}\n` : ''}Password: ${createdUser.password}\nRole: ${createdUser.role}`,
                    "All credentials"
                  )}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setCredentialsDialogOpen(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
