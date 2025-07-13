
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, Users, FilePlus, Loader2, TriangleAlert, Building } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { useRole } from '@/context/role-context';
import { useOnboarding } from '@/context/onboarding-context';
import { useToast } from '@/hooks/use-toast';
import { getCoachSessions, type Session } from '@/lib/firestoreService';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';


const chartConfig: ChartConfig = {
  fullSessions: {
    label: "Full Sessions",
    color: "hsl(var(--primary))",
  },
  halfSessions: {
    label: "Half Sessions",
    color: "hsl(var(--accent))",
  },
};

export default function CoachDashboardPage() {
  const { user, userProfile, companyProfile, role, isLoading: isRoleLoading } = useRole();
  const { addSteps } = useOnboarding();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const firebaseAvailable = isFirebaseConfigured();

  // Setup onboarding tour steps
  useEffect(() => {
    const coachTourSteps = [
      {
        target: 'body',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Welcome to your Coach Dashboard!</h3>
            <p>This is your coaching command center. Let's explore the key features to help you manage your coaching practice effectively.</p>
          </div>
        ),
        placement: 'center' as const,
      },
      {
        target: '[data-tour="company-info"]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Your Company</h3>
            <p>See which company you belong to and access your company's public page. This helps you stay connected with your organization.</p>
          </div>
        ),
        placement: 'bottom' as const,
      },
      {
        target: '[data-tour="metrics"]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Your Performance</h3>
            <p>Track your sessions this month and see how many active clients you're working with. These metrics help you understand your coaching impact.</p>
          </div>
        ),
        placement: 'bottom' as const,
      },
      {
        target: '[data-tour="log-session"]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Log New Sessions</h3>
            <p>Quickly log a new coaching session right from your dashboard. Keep your records up-to-date with just one click!</p>
          </div>
        ),
        placement: 'left' as const,
      },
      {
        target: '[data-tour="chart"]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Session History</h3>
            <p>View your session breakdown over the last 6 months. Track your full sessions vs half sessions to understand your coaching patterns.</p>
          </div>
        ),
        placement: 'top' as const,
      },
      {
        target: '[data-sidebar]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Coach Navigation</h3>
            <p>Use the sidebar to access all coach features: log sessions, view your session history, manage clients, and update settings.</p>
          </div>
        ),
        placement: 'right' as const,
      },
    ];

    addSteps('coach-dashboard', coachTourSteps);
  }, [addSteps]);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable) {
      if (!isRoleLoading && !firebaseAvailable) setIsLoading(false);
      return;
    }

    if (role === 'coach' && user?.uid && userProfile?.companyId) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const fetchedSessions = await getCoachSessions(user.uid, userProfile.companyId!);
          setSessions(fetchedSessions);
        } catch (error: any) {
          console.error("Failed to fetch coach dashboard data:", error);
          toast({ title: "Error", description: error.message || "Could not load dashboard data.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [role, user, userProfile, isRoleLoading, toast, firebaseAvailable]);

  const metrics = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);
    const startOfLastMonth = startOfMonth(subMonths(now, 1));
    const endOfLastMonth = endOfMonth(subMonths(now, 1));
    const thirtyDaysAgo = subMonths(now, 1);

    const sessionsThisMonth = sessions.filter(s => isWithinInterval(new Date(s.sessionDate), { start: startOfThisMonth, end: endOfThisMonth })).length;
    const sessionsLastMonth = sessions.filter(s => isWithinInterval(new Date(s.sessionDate), { start: startOfLastMonth, end: endOfLastMonth })).length;

    let percentageChange = 0;
    if (sessionsLastMonth > 0) {
      percentageChange = Math.round(((sessionsThisMonth - sessionsLastMonth) / sessionsLastMonth) * 100);
    } else if (sessionsThisMonth > 0) {
      percentageChange = 100; // From 0 to a positive number
    }
    
    const activeClientIds = new Set(
        sessions
            .filter(s => new Date(s.sessionDate) >= thirtyDaysAgo)
            .map(s => s.clientId)
    );

    return {
      sessionsThisMonth,
      percentageChange,
      activeClients: activeClientIds.size,
    };
  }, [sessions]);

  const monthlyChartData = useMemo(() => {
    // Show last 6 months including current
    const months = Array.from({ length: 6 }).map((_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return { month: format(d, 'MMM'), fullSessions: 0, halfSessions: 0 };
    });

    sessions.forEach(session => {
        const sessionDate = new Date(session.sessionDate);
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
        
        if (sessionDate >= sixMonthsAgo) {
            const monthStr = format(sessionDate, 'MMM');
            const monthData = months.find(m => m.month === monthStr);
            if (monthData) {
                if (session.sessionType === "Full") {
                    monthData.fullSessions++;
                } else if (session.sessionType === "Half") {
                    monthData.halfSessions++;
                }
            }
        }
    });

    return months;
  }, [sessions]);

  if (isLoading || isRoleLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }

  if (role !== 'coach') {
     return (
        <div>
            <PageHeader title="Coach Dashboard" />
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
      <PageHeader 
        title={`${companyProfile?.name || 'Company'} Coach Dashboard`} 
        description="Your performance and session overview." 
      />
      
      {/* Company Info Card */}
      {companyProfile && (
        <Card className="shadow-light mb-6" data-tour="company-info">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Building className="mr-2 h-6 w-6 text-primary" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                <p className="text-lg font-semibold">{companyProfile.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company Slug</p>
                <p className="text-lg font-semibold">{companyProfile.slug}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company URL</p>
                <p className="text-sm text-blue-600">
                  <a href={`/${companyProfile.slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {process.env.NEXT_PUBLIC_APP_URL}/{companyProfile.slug}
                  </a>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your Role</p>
                <p className="text-sm capitalize">{userProfile?.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8" data-tour="metrics">
        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Sessions This Month</CardTitle>
            <BarChartIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-headline">{metrics.sessionsThisMonth}</div>
            <p className={cn(
                "text-sm font-medium",
                metrics.percentageChange >= 0 ? "text-success" : "text-destructive"
            )}>
                {metrics.percentageChange >= 0 ? '+' : ''}{metrics.percentageChange}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Active Clients</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{metrics.activeClients}</div>
            <p className="text-xs text-muted-foreground">In the last 30 days</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-light flex flex-col items-center justify-center bg-primary/5 dark:bg-primary/10" data-tour="log-session">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <FilePlus className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg font-headline mb-1">Ready for a new session?</CardTitle>
                <CardDescription className="text-sm mb-4">Log your latest session to keep records up to date.</CardDescription>
                <Button asChild>
                    <Link href="/coach/log-session">
                        Log New Session
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-light" data-tour="chart">
        <CardHeader>
          <CardTitle className="font-headline">Recent Session Breakdown</CardTitle>
          <CardDescription>Number of full and half sessions logged over the last 6 months.</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] p-0">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <BarChart data={monthlyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend wrapperStyle={{paddingTop: '20px'}} />
              <Bar dataKey="fullSessions" stackId="a" fill="var(--color-fullSessions)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="halfSessions" stackId="a" fill="var(--color-halfSessions)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
