'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCompanyBySlug, type CompanyProfile } from '@/lib/firestoreService';
import { Loader2 } from 'lucide-react';

interface CompanyLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

export default function CompanyLayout({ children, hideHeader = false }: CompanyLayoutProps) {
  const params = useParams();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
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
        
        // Apply white-label branding only if custom colors are set
        const root = document.documentElement;
        
        // Only apply custom colors if they exist, otherwise use app defaults
        if (companyData.branding?.primaryColor) {
          root.style.setProperty('--primary', companyData.branding.primaryColor);
          root.style.setProperty('--primary-foreground', '#ffffff');
        }
        
        if (companyData.branding?.secondaryColor) {
          root.style.setProperty('--secondary', companyData.branding.secondaryColor);
          root.style.setProperty('--secondary-foreground', '#ffffff');
        }
        
        if (companyData.branding?.backgroundColor) {
          root.style.setProperty('--background', companyData.branding.backgroundColor);
          root.style.setProperty('--card', companyData.branding.backgroundColor);
        }
        
        if (companyData.branding?.textColor) {
          root.style.setProperty('--foreground', companyData.branding.textColor);
          root.style.setProperty('--card-foreground', companyData.branding.textColor);
        }
        
        // Update page title to company name
        document.title = `${companyData.name} - Coaching Platform`;
        
        // Update favicon if company has logo
        if (companyData.branding?.logoUrl) {
          let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
          }
          favicon.href = companyData.branding.logoUrl;
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

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Company Not Found</h1>
          <p className="text-gray-600">{error || 'The company you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!hideHeader && (
        <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {company.branding?.logoUrl && (
                  <img 
                    src={company.branding.logoUrl} 
                    alt={`${company.name} logo`}
                    className="h-8 w-8 object-contain"
                  />
                )}
                <h1 className="text-xl font-bold">{company.name}</h1>
              </div>
              <div className="text-sm text-muted-foreground">
                Coaching Platform
              </div>
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="border-t py-6 px-4 bg-card/50 mt-auto">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 {company.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}