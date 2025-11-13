// client/src/components/admin/ReportsAnalytics.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

export default function ReportsAnalytics() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Download various reports for analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <FileText className="w-8 h-8 mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Farmers Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete list of all farmers with their credit status
                </p>
                <Button size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <FileText className="w-8 h-8 mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Orders Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  All orders with payment status and delivery info
                </p>
                <Button size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <FileText className="w-8 h-8 mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Collections Report</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Payment collections and outstanding balances
                </p>
                <Button size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <FileText className="w-8 h-8 mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Agent Performance</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Agent sales, commissions, and performance metrics
                </p>
                <Button size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}