'use client';

import { PageHeader } from "@/components/shared/page-header";
import CompaniesManagement from "@/components/admin/companies-management";

export default function CompaniesPage() {
  return (
    <div>
      <PageHeader 
        title="Companies Management" 
        description="Manage all companies on the platform" 
      />
      <CompaniesManagement />
    </div>
  );
}