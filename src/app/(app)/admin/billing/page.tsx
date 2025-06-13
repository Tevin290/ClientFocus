import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function AdminBillingPage() {
  return (
    <div>
      <PageHeader title="Billing Management" description="Oversee client billing, invoices, and payment statuses." />
      <Card className="shadow-light">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <DollarSign className="mr-2 h-6 w-6 text-primary" />
            Billing Overview
          </CardTitle>
          <CardDescription>
            This section will allow administrators to manage billing cycles, view payment histories, and generate financial reports.
            Integration with Stripe will power these functionalities.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">Billing features coming soon:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>View outstanding invoices</li>
              <li>Track payment statuses</li>
              <li>Generate billing reports</li>
              <li>Manage subscriptions (if applicable)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
