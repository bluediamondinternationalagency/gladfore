import AgentDashboard from '../../pages/AgentDashboard';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function AgentDashboardExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <AgentDashboard />
    </QueryClientProvider>
  );
}
