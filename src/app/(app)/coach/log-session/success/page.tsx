
'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/shared/page-header";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ListChecks, PlusCircle } from 'lucide-react';

export default function SessionLoggedSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]"> {/* Adjust min-height as needed */}
      <PageHeader 
        title="Session Logged!" 
        description="Your coaching session has been successfully recorded." 
      />
      <Card className="w-full max-w-lg text-center shadow-light">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-success" />
          </div>
          <CardTitle className="text-2xl font-headline">Session Logged Successfully!</CardTitle>
          <CardDescription>
            You can now view this session in your session history or log another one.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/coach/my-sessions">
              <ListChecks className="mr-2 h-4 w-4" />
              View My Sessions
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto hover:border-primary">
            <Link href="/coach/log-session">
              <PlusCircle className="mr-2 h-4 w-4" />
              Log Another Session
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
