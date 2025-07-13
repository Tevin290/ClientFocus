
'use client';

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, UserCircle, Calendar } from "lucide-react";
import Link from "next/link";
import { useRole } from "@/context/role-context";
import { useOnboarding } from "@/context/onboarding-context";
import { useEffect } from "react";

export default function ClientDashboardPage() {
    const { userProfile } = useRole();
    const { addSteps } = useOnboarding();

    // Setup onboarding tour steps
    useEffect(() => {
        const clientTourSteps = [
            {
                target: 'body',
                content: (
                    <div>
                        <h3 className="font-semibold mb-2">Welcome to ClientFocus!</h3>
                        <p>This is your personal dashboard where you can track your coaching journey and access all your session information.</p>
                    </div>
                ),
                placement: 'center' as const,
            },
            {
                target: '[data-tour="session-history"]',
                content: (
                    <div>
                        <h3 className="font-semibold mb-2">Your Session History</h3>
                        <p>Click here to view all your past coaching sessions, including notes and recordings from your coach. Track your progress over time!</p>
                    </div>
                ),
                placement: 'bottom' as const,
            },
            {
                target: '[data-tour="coming-soon"]',
                content: (
                    <div>
                        <h3 className="font-semibold mb-2">More Features Coming</h3>
                        <p>We're working on exciting new features like session scheduling and profile management. Stay tuned for updates!</p>
                    </div>
                ),
                placement: 'top' as const,
            },
            {
                target: '[data-sidebar]',
                content: (
                    <div>
                        <h3 className="font-semibold mb-2">Easy Navigation</h3>
                        <p>Use the sidebar to access your session history, settings, and other features as they become available.</p>
                    </div>
                ),
                placement: 'right' as const,
            },
        ];

        addSteps('client-dashboard', clientTourSteps);
    }, [addSteps]);

    return (
        <div>
            <PageHeader 
                title={`Welcome, ${userProfile?.displayName || 'Client'}!`} 
                description="Here's a summary of your coaching journey." 
            />
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="shadow-light hover:shadow-md transition-shadow" data-tour="session-history">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline">
                            <History className="h-6 w-6 text-primary" />
                            Session History
                        </CardTitle>
                        <CardDescription>
                            Review your past sessions, notes, and recordings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/client/history">
                                View History
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="shadow-light opacity-50 cursor-not-allowed" data-tour="coming-soon">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline">
                            <Calendar className="h-6 w-6 text-muted-foreground" />
                            Upcoming Sessions
                        </CardTitle>
                        <CardDescription>
                            Feature coming soon! View and manage your scheduled sessions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled className="w-full">
                            View Schedule (Soon)
                        </Button>
                    </CardContent>
                </Card>

                <Card className="shadow-light opacity-50 cursor-not-allowed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline">
                            <UserCircle className="h-6 w-6 text-muted-foreground" />
                            My Profile
                        </CardTitle>
                        <CardDescription>
                            Feature coming soon! Manage your personal information and settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled className="w-full">
                            Edit Profile (Soon)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
