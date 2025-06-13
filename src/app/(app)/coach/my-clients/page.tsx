
'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Users, Eye, BarChart2, Mail } from 'lucide-react'; // Added Mail icon
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface Client {
  id: string;
  name: string;
  email: string;
  avatarPlaceholder: string; // Using placeholder for Next/Image
  totalSessions: number;
  lastSessionDate?: string;
}

const mockClients: Client[] = [
  { 
    id: 'client_1', 
    name: 'Alice Wonderland', 
    email: 'alice@example.com', 
    avatarPlaceholder: 'AW', 
    totalSessions: 7,
    lastSessionDate: '2024-07-20'
  },
  { 
    id: 'client_2', 
    name: 'Bob The Builder', 
    email: 'bob@example.com', 
    avatarPlaceholder: 'BB', 
    totalSessions: 3,
    lastSessionDate: '2024-07-18'
  },
  { 
    id: 'client_3', 
    name: 'Charlie Brown', 
    email: 'charlie@example.com', 
    avatarPlaceholder: 'CB', 
    totalSessions: 12,
    lastSessionDate: '2024-07-15'
  },
  { 
    id: 'client_4', 
    name: 'Diana Prince', 
    email: 'diana@example.com', 
    avatarPlaceholder: 'DP', 
    totalSessions: 5 
  },
];

export default function CoachMyClientsPage() {
  return (
    <div>
      <PageHeader title="My Clients" description="Manage your clients and view their session history." />
      
      {mockClients.length === 0 ? (
        <Card className="shadow-light">
          <CardHeader>
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <CardTitle className="text-center font-headline">No Clients Yet</CardTitle>
            <CardDescription className="text-center">
              Your active clients will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockClients.map((client) => (
            <Card key={client.id} className="shadow-light hover:shadow-md transition-shadow duration-200 flex flex-col">
              <CardHeader className="items-center text-center">
                <Avatar className="h-20 w-20 mb-3 border-2 border-primary/50">
                  <Image 
                    src={`https://placehold.co/100x100.png?text=${client.avatarPlaceholder}`} 
                    alt={client.name} 
                    width={100} 
                    height={100} 
                    className="aspect-square"
                    data-ai-hint="avatar person" 
                  />
                  <AvatarFallback>{client.avatarPlaceholder}</AvatarFallback>
                </Avatar>
                <CardTitle className="font-headline text-xl">{client.name}</CardTitle>
                <CardDescription className="flex items-center justify-center text-xs">
                  <Mail className="mr-1 h-3 w-3" /> {client.email}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <BarChart2 className="mr-2 h-4 w-4 text-primary" />
                  <span>Total Sessions: </span>
                  <Badge variant="secondary" className="ml-auto">{client.totalSessions}</Badge>
                </div>
                {client.lastSessionDate && (
                  <div className="flex items-center text-muted-foreground">
                     <Users className="mr-2 h-4 w-4 text-primary" /> {/* Re-using Users icon for "Last Session" */}
                    <span>Last Session: {new Date(client.lastSessionDate).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/coach/my-clients/${client.id}/sessions`}>
                    <Eye className="mr-2 h-4 w-4" /> View Sessions
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
