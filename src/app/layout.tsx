import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { RoleProvider } from '@/context/role-context';
import { OnboardingProvider } from '@/context/onboarding-context';
import { LoadingProvider } from '@/context/loading-context';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'ClientFocus',
  description: 'Streamline your coaching sessions and client management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Poppins font is now managed exclusively by next/font.
          Manual <link> tags for Google Fonts have been removed.
        */}
      </head>
      <body className={`${poppins.variable} font-body antialiased`} suppressHydrationWarning={true}>
        <RoleProvider>
          <OnboardingProvider>
            <LoadingProvider>
              {children}
              <Toaster />
            </LoadingProvider>
          </OnboardingProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
