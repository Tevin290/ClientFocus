'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole, type UserRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LifeBuoy } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { role, setRole, isLoading } = useRole();
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');

  useEffect(() => {
    if (!isLoading && role) {
      // If already logged in (role is set), redirect to appropriate dashboard
      router.push(`/${role}/dashboard`);
    }
  }, [role, isLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole && selectedRole !== '') {
      setRole(selectedRole as UserRole);
      router.push(`/${selectedRole}/dashboard`);
    }
  };

  if (isLoading || role) {
    // Show loading or nothing if already logged in and redirecting
    return <div className="flex items-center justify-center min-h-screen bg-background"><p>Loading...</p></div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <LifeBuoy className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Welcome to SessionSync</CardTitle>
          <CardDescription className="text-md">Select your role to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <RadioGroup
              value={selectedRole || undefined}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              className="space-y-2"
            >
              {(['admin', 'coach', 'client'] as UserRole[]).map((r) => (
                r && // Ensure r is not null
                <Label
                  key={r}
                  htmlFor={`role-${r}`}
                  className={`flex items-center space-x-3 p-4 border rounded-md cursor-pointer transition-all hover:border-primary ${selectedRole === r ? 'border-primary ring-2 ring-primary bg-primary/10' : ''}`}
                >
                  <RadioGroupItem value={r} id={`role-${r}`} />
                  <span className="text-lg font-medium capitalize">{r}</span>
                </Label>
              ))}
            </RadioGroup>
            <Button type="submit" className="w-full text-lg py-6" disabled={!selectedRole}>
              Login as {selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : '...'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground">
          <p>This is a simulated login. No actual authentication is performed.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
