'use client';

import { PageHeader } from "@/components/shared/page-header";
import UsersManagement from "@/components/admin/users-management";

export default function UsersPage() {
  return (
    <div>
      <PageHeader 
        title="Users Management" 
        description="Manage all users across all companies" 
      />
      <UsersManagement />
    </div>
  );
}