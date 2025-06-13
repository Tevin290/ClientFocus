import { PageHeader } from "@/components/shared/page-header";
import { SessionLogForm } from "@/components/forms/session-log-form";

export default function CoachLogSessionPage() {
  return (
    <div>
      <PageHeader title="Log New Session" description="Record the details of your latest coaching session." />
      <div className="mt-8 flex justify-center">
        <SessionLogForm />
      </div>
    </div>
  );
}
