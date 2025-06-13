import { PageHeader } from "@/components/shared/page-header";
import { StripeSettingsForm } from "@/components/forms/stripe-settings-form";

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader title="Application Settings" description="Manage integrations and platform configurations."/>
      <div className="mt-8">
        <StripeSettingsForm />
      </div>
      {/* Other settings sections can be added here */}
    </div>
  );
}
