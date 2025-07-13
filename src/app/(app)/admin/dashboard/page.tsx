
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, Activity, Briefcase, Loader2, TriangleAlert, Building } from "lucide-react";
import { BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAllCoaches, getAllSessions, getAllCompanies, getAllUsers, type UserProfile, type Session, type CompanyProfile } from '@/lib/firestoreService';
import { useRole } from '@/context/role-context';
import { useOnboarding } from '@/context/onboarding-context';
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
  const { role, userProfile, companyProfile, isLoading: isRoleLoading } = useRole();
  const { addSteps } = useOnboarding();
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('all');
  const { toast } = useToast();
  const firebaseAvailable = isFirebaseConfigured();

  // Setup onboarding tour steps
  useEffect(() => {
    const adminTourSteps = [
      {
        target: 'body',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Welcome to your Admin Dashboard!</h3>
            <p>This is where you manage your company's coaching operations. Let's take a quick tour to get you started.</p>
          </div>
        ),
        placement: 'center' as const,
      },
      {
        target: '[data-tour="company-info"]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Company Information</h3>
            <p>Here you can see your company details including name, slug, and public URL. Share your company URL with coaches and clients for easy signup.</p>
          </div>
        ),
        placement: 'bottom' as const,
      },
      {
        target: '[data-tour="metrics"]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Key Metrics</h3>
            <p>Monitor your company's performance with sessions this month, active coaches, and pending reviews. These cards give you a quick overview of your business.</p>
          </div>
        ),
        placement: 'bottom' as const,
      },
      {
        target: '[data-tour="chart"]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Session Analytics</h3>
            <p>Track session trends over time and filter by specific coaches. Use this data to understand your business patterns and growth.</p>
          </div>
        ),
        placement: 'top' as const,
      },
      {
        target: '[data-tour="management-links"]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Management Tools</h3>
            <p>Access coach management, billing setup, and other administrative functions. These tools help you run your coaching business effectively.</p>
          </div>
        ),
        placement: 'top' as const,
      },
      {
        target: '[data-sidebar]',
        content: (
          <div>
            <h3 className="font-semibold mb-2">Navigation Sidebar</h3>
            <p>Use the sidebar to navigate between different sections: Sessions, Coaches, Billing, and Settings. Everything you need is just a click away!</p>
          </div>
        ),
        placement: 'right' as const,
      },
    ];

    addSteps('admin-dashboard', adminTourSteps);
  }, [addSteps]);

  useEffect(() => {
    if (isRoleLoading || !firebaseAvailable || !userProfile?.companyId) {
      if (!isRoleLoading && (!firebaseAvailable || !userProfile?.companyId)) setIsLoading(false);
      return;
    }

    if (role === 'admin' || role === 'super-admin') {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          if (role === 'super-admin') {
            // Super-admin sees all data across companies
            const [fetchedCoaches, fetchedSessions, fetchedCompanies, fetchedUsers] = await Promise.all([
              getAllUsers().then(users => users.filter(u => u.role === 'coach')),
              getAllSessions(''), // Empty string to get all sessions for super-admin
              getAllCompanies(),
              getAllUsers()
            ]);
            setCoaches(fetchedCoaches);
            setSessions(fetchedSessions);
            setCompanies(fetchedCompanies);
            setUsers(fetchedUsers);
          } else {
            // Regular admin sees only their company data
            const companyId = userProfile.companyId!;
            const [fetchedCoaches, fetchedSessions] = await Promise.all([
              getAllCoaches(companyId),
              getAllSessions(companyId)
            ]);
            setCoaches(fetchedCoaches);
            setSessions(fetchedSessions);
          }
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
  }, [role, isRoleLoading, toast, firebaseAvailable, userProfile?.companyId]);
  

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
      <PageHeader 
        title={role === 'super-admin' ? "Platform Admin Dashboard" : `${companyProfile?.name || 'Company'} Admin Dashboard`} 
        description={role === 'super-admin' ? "Overview of platform activity and key metrics." : "Overview of company activity and key metrics."} 
      />
      
      {/* Company Info Card for Regular Admins */}
      {role === 'admin' && companyProfile && (
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
                <p className="text-sm font-medium text-muted-foreground">Admin Email</p>
                <p className="text-sm">{companyProfile.adminEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8" data-tour="metrics">
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

      <Card className="shadow-light" data-tour="chart">
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
      {/* Management Links */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8" data-tour="management-links">
        <Card className="shadow-light">
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

        {role === 'super-admin' && (
          <>
            <Card className="shadow-light">
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                  <Building className="mr-2 h-6 w-6 text-primary" />
                  Companies Management
                </CardTitle>
                <CardDescription>
                  Create, edit, and manage all companies on the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/admin/companies">
                    Manage Companies
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-light">
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                  <Users className="mr-2 h-6 w-6 text-primary" />
                  Users Management
                </CardTitle>
                <CardDescription>
                  View and manage all users across all companies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/admin/users">
                    Manage Users
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
