
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { SessionLogForm } from "@/components/forms/session-log-form";
import { useRole } from "@/context/role-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TriangleAlert } from "lucide-react";

export default function CoachLogSessionPage() {
  const { user, role, isLoading: isRoleLoading } = useRole();

  if (isRoleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading user data...</p>
      </div>
    );
  }

  if (role !== 'coach' || !user) {
    return (
      <div>
        <PageHeader title="Log New Session" description="Record the details of your latest coaching session." />
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be logged in as a coach to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Pass coachId and coachName to the form
  return (
    <div>
      <PageHeader title="Log New Session" description="Record the details of your latest coaching session." />
      <div className="mt-8 flex justify-center">
        <SessionLogForm coachId={user.uid} coachName={user.displayName || "Coach"} />
      </div>
    </div>
  );
}
