// client/src/pages/LoginPage.tsx
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
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState(""); // phone or email
  const [password, setPassword] = useState("");
  const [activeRole, setActiveRole] = useState<"farmer" | "agent" | "admin">("farmer");

  const loginMutation = useMutation({
    mutationFn: () => login(identifier, password),
    onSuccess: (user) => {
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
      // Handle super_agent role routing
      const route = user.role === "super_agent" ? "/super-agent" : `/${user.role}`;
      setLocation(route);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleLogin = () => {
    if (!identifier || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both phone/email and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sprout className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-display mb-2">Welcome to Gladfore</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
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
                  <Label htmlFor={`${role}-identifier`}>Email or Phone</Label>
                  <Input
                    id={`${role}-identifier`}
                    type="text"
                    placeholder="Email or Phone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${role}-password`}>Password</Label>
                  <Input
                    id={`${role}-password`}
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleLogin}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                </Button>

                {role === "farmer" && (
                  <p className="text-sm text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <button className="text-primary hover:underline" onClick={() => console.log('Sign up clicked')}>
                      Contact your agent
                    </button>
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
