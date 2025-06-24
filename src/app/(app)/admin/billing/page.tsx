
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Loader2, TriangleAlert } from "lucide-react";
import { useRole } from "@/context/role-context";
import { StripeConnectForm } from "@/components/forms/stripe-connect-form";
import { Alert, AlertDescription, AlertTitle as UiAlertTitle } from "@/components/ui/alert";


export default function AdminBillingPage() {
  const { companyProfile, isLoading, role } = useRole();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Billing Management" />
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (role !== 'super-admin') {
      return (
        <div>
          <PageHeader title="Billing Management" description="Oversee client billing, invoices, and payment statuses." />
           <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <UiAlertTitle>Access Denied</UiAlertTitle>
            <AlertDescription>You must be a Super Admin to manage Stripe settings.</AlertDescription>
          </Alert>
        </div>
      );
  }

  if (!companyProfile) {
    return (
      <div>
        <PageHeader title="Billing Management" description="Oversee client billing, invoices, and payment statuses." />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <UiAlertTitle>Company Not Found</UiAlertTitle>
          <AlertDescription>Your account is not associated with a company. Stripe settings cannot be managed.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Billing Management" description="Connect your company's Stripe account to enable client billing." />
      <div className="mt-8">
        <StripeConnectForm companyProfile={companyProfile} />
      </div>
      <Card className="mt-8 shadow-light">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <DollarSign className="mr-2 h-6 w-6 text-primary" />
            Billing Overview
          </CardTitle>
          <CardDescription>
            Once Stripe is connected, this area will show billing activity, outstanding invoices, and financial reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-sm text-muted-foreground">This feature is pending Stripe connection.</p>
        </CardContent>
      </Card>
    </div>
  );
}
