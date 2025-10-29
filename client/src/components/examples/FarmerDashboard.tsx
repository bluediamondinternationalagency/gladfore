import FarmerDashboard from '../../pages/FarmerDashboard';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function FarmerDashboardExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <FarmerDashboard />
    </QueryClientProvider>
  );
}
