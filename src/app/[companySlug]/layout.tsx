/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCompanyBySlug, type CompanyProfile } from '@/lib/firestoreService';
import { Loader2 } from 'lucide-react';

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const [,setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const companySlug = params?.companySlug as string;

  useEffect(() => {
    const loadCompany = async () => {
      if (!companySlug) return;
      
      try {
        const companyData = await getCompanyBySlug(companySlug);
        if (!companyData) {
          setError('Company not found');
          return;
        }
        setCompany(companyData);
        
        // Apply company branding to the document
        if (companyData.branding) {
          const root = document.documentElement;
          if (companyData.branding.primaryColor) {
            root.style.setProperty('--primary', companyData.branding.primaryColor);
          }
          if (companyData.branding.backgroundColor) {
            root.style.setProperty('--background', companyData.branding.backgroundColor);
          }
          if (companyData.branding.textColor) {
            root.style.setProperty('--foreground', companyData.branding.textColor);
          }
        }
      } catch (err) {
        setError('Failed to load company information');
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [companySlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Company Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}