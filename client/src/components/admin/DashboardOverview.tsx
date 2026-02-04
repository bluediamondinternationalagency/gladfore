// client/src/components/admin/DashboardOverview.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { Users, ShoppingCart, DollarSign, FileText } from "lucide-react";

interface Props {
  stats: any;
  onNavigate?: (viewId: string) => void;
}

export default function DashboardOverview({ stats, onNavigate }: Props) {
  // Sample data - replace with real data from API
  const revenueData = [
    { month: "Jan", revenue: 45000 },
    { month: "Feb", revenue: 52000 },
    { month: "Mar", revenue: 61000 },
    { month: "Apr", revenue: 58000 },
    { month: "May", revenue: 70000 },
    { month: "Jun", revenue: 75000 },
  ];

  const kycData = [
    { name: "Verified", value: stats?.verifiedFarmers || 0, color: "#22c55e" },
    { name: "Pending", value: stats?.pendingKyc || 0, color: "#f59e0b" },
  ];

  const handleNavigate = (viewId: string) => {
    if (onNavigate) {
      onNavigate(viewId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 backdrop-blur border border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur border border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle>KYC Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={kycData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {kycData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/80 backdrop-blur border border-slate-200/60 shadow-sm">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              className="h-20 flex flex-col gap-2 shadow-sm"
              onClick={() => handleNavigate("kyc")}
              disabled={!onNavigate}
            >
              <Users className="w-6 h-6" />
              Review KYC
            </Button>
            <Button
              className="h-20 flex flex-col gap-2 shadow-sm"
              variant="outline"
              onClick={() => handleNavigate("orders")}
              disabled={!onNavigate}
            >
              <ShoppingCart className="w-6 h-6" />
              Approve Orders
            </Button>
            <Button
              className="h-20 flex flex-col gap-2 shadow-sm"
              variant="outline"
              onClick={() => handleNavigate("payments")}
              disabled={!onNavigate}
            >
              <DollarSign className="w-6 h-6" />
              Process Payments
            </Button>
            <Button
              className="h-20 flex flex-col gap-2 shadow-sm"
              variant="outline"
              onClick={() => handleNavigate("reports")}
              disabled={!onNavigate}
            >
              <FileText className="w-6 h-6" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}