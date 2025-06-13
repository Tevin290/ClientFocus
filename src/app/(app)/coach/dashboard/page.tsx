'use client'; // Required for Recharts

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, Users, Clock, Award } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const monthlySessionsData = [
  { month: "Jan", sessions: 12, type: "Full" }, { month: "Jan", sessions: 6, type: "Half" },
  { month: "Feb", sessions: 15, type: "Full" }, { month: "Feb", sessions: 8, type: "Half" },
  { month: "Mar", sessions: 18, type: "Full" }, { month: "Mar", sessions: 10, type: "Half" },
  { month: "Apr", sessions: 14, type: "Full" }, { month: "Apr", sessions: 7, type: "Half" },
  { month: "May", sessions: 20, type: "Full" }, { month: "May", sessions: 12, type: "Half" },
  { month: "Jun", sessions: 22, type: "Full" }, { month: "Jun", sessions: 10, type: "Half" },
];

// Aggregate data for stacked bar chart if needed or use grouped
const aggregatedSessionsData = monthlySessionsData.reduce((acc, curr) => {
  const existing = acc.find(item => item.month === curr.month);
  if (existing) {
    if (curr.type === "Full") existing.fullSessions = (existing.fullSessions || 0) + curr.sessions;
    if (curr.type === "Half") existing.halfSessions = (existing.halfSessions || 0) + curr.sessions;
  } else {
    acc.push({
      month: curr.month,
      fullSessions: curr.type === "Full" ? curr.sessions : 0,
      halfSessions: curr.type === "Half" ? curr.sessions : 0,
    });
  }
  return acc;
}, [] as Array<{ month: string; fullSessions: number; halfSessions: number }>);


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
  return (
    <div>
      <PageHeader title="Coach Dashboard" description="Your performance and session overview." />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Total Sessions (Month)</CardTitle>
            <BarChartIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">32</div>
            <p className="text-xs text-muted-foreground">+5 from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Avg. Session Length</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">50 min</div>
            <p className="text-xs text-muted-foreground">Based on full sessions</p>
          </CardContent>
        </Card>
        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Active Clients</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">8</div>
            <p className="text-xs text-muted-foreground">Currently engaged</p>
          </CardContent>
        </Card>
        <Card className="shadow-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase">Completion Rate</CardTitle>
            <Award className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">95%</div>
            <p className="text-xs text-muted-foreground">Session plan completion</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-light">
        <CardHeader>
          <CardTitle className="font-headline">Monthly Session Breakdown</CardTitle>
          <CardDescription>Number of full and half sessions logged per month.</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] p-0">
          <ChartContainer config={chartConfig} className="w-full h-full">
            <BarChart data={aggregatedSessionsData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} />
              <YAxis tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" fontSize={12} />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend wrapperStyle={{paddingTop: '20px'}} />
              <Bar dataKey="fullSessions" fill="var(--color-fullSessions)" radius={4} />
              <Bar dataKey="halfSessions" fill="var(--color-halfSessions)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
