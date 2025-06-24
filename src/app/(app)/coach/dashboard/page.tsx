
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, Users, FilePlus, Loader2, TriangleAlert } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { useRole } from '@/context/role-context';
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
  const { user, userProfile, role, isLoading: isRoleLoading } = useRole();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const firebaseAvailable = isFirebaseConfigured();

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
      <PageHeader title="Coach Dashboard" description="Your performance and session overview." />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
        
        <Card className="shadow-light flex flex-col items-center justify-center bg-primary/5 dark:bg-primary/10">
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

      <Card className="shadow-light">
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
