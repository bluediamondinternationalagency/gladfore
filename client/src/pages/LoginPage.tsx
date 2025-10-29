import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sprout } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // todo: remove mock functionality
  const handleLogin = (role: string) => {
    console.log(`Logging in as ${role}:`, { phone, password });
    setLocation(`/${role}`);
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
          <Tabs defaultValue="farmer" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="farmer" data-testid="tab-farmer">Farmer</TabsTrigger>
              <TabsTrigger value="agent" data-testid="tab-agent">Agent</TabsTrigger>
              <TabsTrigger value="admin" data-testid="tab-admin">Admin</TabsTrigger>
            </TabsList>

            {["farmer", "agent", "admin"].map((role) => (
              <TabsContent key={role} value={role} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor={`${role}-phone`}>Phone Number</Label>
                  <Input
                    id={`${role}-phone`}
                    type="tel"
                    placeholder="+254 712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    data-testid="input-phone"
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
                    data-testid="input-password"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleLogin(role)}
                  data-testid="button-login"
                >
                  Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>

                {role === "farmer" && (
                  <p className="text-sm text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <button className="text-primary hover:underline" onClick={() => console.log('Sign up clicked')}>
                      Sign up
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
