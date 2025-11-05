// client/src/pages/CreateUserPage.tsx
import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Sprout } from "lucide-react";
import { register } from "@/lib/auth";

export default function CreateUserPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [activeRole, setActiveRole] = useState<"farmer" | "agent" | "admin">("farmer");

  const createUserMutation = useMutation({
    mutationFn: () => register({ phone, password, role: activeRole, name }),
    onSuccess: (user) => {
      toast({
        title: "User created successfully",
        description: `User ${user.name} (${user.role}) has been created.`,
      });
      // Navigate to user's page or clear form
      setLocation(`/${user.role}`);
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Could not create user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!phone || !name || !password) {
      toast({
        title: "Missing information",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sprout className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-display mb-2">Create New User</h1>
          <p className="text-muted-foreground">Fill in the details to add a new user</p>
        </div>

        <Card className="p-6">
          <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="farmer">Farmer</TabsTrigger>
              <TabsTrigger value="agent">Agent</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            {["farmer", "agent", "admin"].map((role) => (
              <TabsContent key={role} value={role} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor={`${role}-phone`}>Phone Number</Label>
                  <Input
                    id={`${role}-phone`}
                    type="tel"
                    placeholder="+234 701 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${role}-name`}>Full Name</Label>
                  <Input
                    id={`${role}-name`}
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${role}-password`}>Password</Label>
                  <Input
                    id={`${role}-password`}
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending
                    ? "Creating..."
                    : `Create ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
