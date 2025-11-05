// client/src/App.tsx
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import CreateUserPage from "@/pages/CreateUserPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AgentDashboard from "@/pages/AgentDashboard";
import FarmerDashboard from "@/pages/FarmerDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/create-user" component={CreateUserPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/agent" component={AgentDashboard} />
      <Route path="/farmer" component={FarmerDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
