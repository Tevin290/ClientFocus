
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { ProfilePictureForm } from "@/components/forms/profile-picture-form";
import { useRole } from "@/context/role-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TriangleAlert } from "lucide-react";

export default function CoachSettingsPage() {
  const { user, userProfile, isLoading, role } = useRole();

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (role !== 'coach' || !user || !userProfile) {
    return (
      <div>
        <PageHeader title="My Settings"/>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You must be a coach to view this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Settings" description="Manage your profile information." />
      <div className="space-y-8 mt-8">
        <ProfilePictureForm 
          user={user} 
          userProfile={userProfile} 
        />
      </div>
    </div>
  );
}
