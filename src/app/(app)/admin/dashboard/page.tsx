
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, Activity, Briefcase, Loader2, TriangleAlert } from "lucide-react";
import { BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAllCoaches, getAllSessions, type UserProfile, type Session } from '@/lib/firestoreService';
import { useRole } from '@/context/role-context';
import { useToast } from '@/hooks/use-toast';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, getMonth } from 'date-fns';


const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export default function AdminDashboardPage() {
  const { role, isLoading: isRoleLoading } = useRole();
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('all');
  const { toast } = useToast();
  const firebaseAvailable = isFirebaseConfigured();

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable) {
      if (!isRoleLoading && !firebaseAvailable) setIsLoading(false);
      return;
    }

    if (role === 'admin' || role === 'super-admin') {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const [fetchedCoaches, fetchedSessions] = await Promise.all([
            getAllCoaches(),
            getAllSessions()
          ]);
          setCoaches(fetchedCoaches);
          setSessions(fetchedSessions);
        } catch (error: any) {
          console.error("Failed to fetch admin dashboard data:", error);
          toast({ title: "Error", description: error.message || "Could not load dashboard data.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [role, isRoleLoading, toast, firebaseAvailable]);
  

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
      percentageChange = 100;
    }
    
    const activeCoachIds = new Set(
        sessions
            .filter(s => new Date(s.sessionDate) >= thirtyDaysAgo)
            .map(s => s.coachId)
    );

    const pendingReviews = sessions.filter(s => s.status === 'Under Review').length;

    return {
      sessionsThisMonth,
      percentageChange,
      activeCoaches: activeCoachIds.size,
      pendingReviews,
    };
  }, [sessions]);


  const monthlyChartData = useMemo(() => {
    const filteredSessions = selectedCoachId === 'all' 
      ? sessions 
      : sessions.filter(s => s.coachId === selectedCoachId);
      
    const monthlyTotals = Array(12).fill(0).map((_, i) => ({
      month: format(new Date(2000, i), 'MMM'),
      sessions: 0
    }));

    filteredSessions.forEach(session => {
        const monthIndex = getMonth(new Date(session.sessionDate));
        monthlyTotals[monthIndex].sessions++;
    });

    return monthlyTotals;
  }, [sessions, selectedCoachId]);
  
  const percentageChangeText = metrics.percentageChange >= 0 
      ? `+${metrics.percentageChange}% from last month`
      : `${metrics.percentageChange}% from last month`;

  if (isLoading || isRoleLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    )
  }

  if (role !== 'admin' && role !== 'super-admin') {
     return (
        <div>
            <PageHeader title="Admin Dashboard" />
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>You must be an admin to view this page.</AlertDescription>
            </Alert>
        </div>
     );
  }

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Overview of platform activity and key metrics." />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Sessions This Month</CardTitle>
            <BarChart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{metrics.sessionsThisMonth}</div>
            <p className="text-xs text-muted-foreground">{percentageChangeText}</p>
          </CardContent>
        </Card>
        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Active Coaches</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{metrics.activeCoaches}</div>
            <p className="text-xs text-muted-foreground">Logged a session in last 30 days</p>
          </CardContent>
        </Card>
        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Pending Reviews</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{metrics.pendingReviews}</div>
             <p className="text-xs text-muted-foreground">Sessions needing approval</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-light">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="font-headline">Monthly Session Overview</CardTitle>
                <CardDescription>Number of sessions logged each month.</CardDescription>
              </div>
              <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Filter by coach..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coaches</SelectItem>
                  {coaches.map(coach => (
                    <SelectItem key={coach.uid} value={coach.uid}>
                      {coach.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent className="h-[400px] p-0">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <RechartsBarChart data={monthlyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="month" stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="hsl(var(--foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{paddingTop: '20px'}} />
              <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Link to Coach Management Page */}
      <Card className="mt-8 shadow-light">
        <CardHeader>
          <CardTitle className="font-headline flex items-center">
            <Briefcase className="mr-2 h-6 w-6 text-primary" />
            Coach Management
          </CardTitle>
          <CardDescription>
            View all registered coaches, their assigned clients, and session statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/admin/coaches">
              View All Coaches
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
