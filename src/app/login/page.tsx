
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole, type UserRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LifeBuoy, AlertTriangle } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const DUMMY_CREDENTIALS: Record<Exclude<UserRole, null> & string, { email: string; pass: string }> = {
  admin: { email: 'admin@example.com', pass: 'password123' },
  coach: { email: 'coach@example.com', pass: 'password123' },
  client: { email: 'client@example.com', pass: 'password123' },
};

export default function LoginPage() {
  const router = useRouter();
  const { role, isLoading: isRoleLoading, user } = useRole();
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [firebaseNotConfigured, setFirebaseNotConfigured] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && !isFirebaseConfigured()) {
      setFirebaseNotConfigured(true);
      toast({
        title: "Firebase Not Configured",
        description: "Please configure Firebase in src/lib/firebase.ts to enable login.",
        variant: "destructive",
        duration: Infinity,
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!isRoleLoading && user && role) {
      router.push(`/${role}/dashboard`);
    }
  }, [user, role, isRoleLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (firebaseNotConfigured) {
      toast({
        title: "Login Disabled",
        description: "Firebase is not configured. Cannot log in.",
        variant: "destructive",
      });
      return;
    }

    if (selectedRole && selectedRole !== '') {
      setIsLoggingIn(true);
      const creds = DUMMY_CREDENTIALS[selectedRole as Exclude<UserRole, null>];
      if (!creds) {
        toast({ title: 'Error', description: 'Invalid role selection for dummy login.', variant: 'destructive' });
        setIsLoggingIn(false);
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, creds.email, creds.pass);
        toast({ title: 'Login Successful', description: `Logging in as ${selectedRole}...` });
      } catch (error: any) {
        console.error('Firebase Login Error:', error);
        let errorMessage = 'Login failed. Please check credentials or try again.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = `Login failed for ${selectedRole}. Make sure the user ${creds.email} exists in Firebase Auth with the password 'password123'.`;
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = `The email address ${creds.email} is not valid.`;
        }
        toast({ title: 'Login Failed', description: errorMessage, variant: 'destructive' });
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  if (isRoleLoading || (user && role)) {
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
          <CardDescription className="text-md">Select your role to simulate login</CardDescription>
          {firebaseNotConfigured && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Firebase is not configured. Login is disabled.</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <RadioGroup
              value={selectedRole || undefined}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
              className="space-y-2"
              disabled={isLoggingIn || firebaseNotConfigured}
            >
              {(['admin', 'coach', 'client'] as Exclude<UserRole, null>[]).map((r) => (
                <Label
                  key={r}
                  htmlFor={`role-${r}`}
                  className={`flex items-center space-x-3 p-4 border rounded-md cursor-pointer transition-all hover:border-primary ${selectedRole === r ? 'border-primary ring-2 ring-primary bg-primary/10' : ''} ${isLoggingIn || firebaseNotConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RadioGroupItem value={r} id={`role-${r}`} disabled={isLoggingIn || firebaseNotConfigured} />
                  <span className="text-lg font-medium capitalize">{r}</span>
                </Label>
              ))}
            </RadioGroup>
            <Button type="submit" className="w-full text-lg py-6" disabled={!selectedRole || isLoggingIn || firebaseNotConfigured}>
              {isLoggingIn ? 'Logging in...' : `Login as ${selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : '...'}`}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center text-sm">
          <Link href={selectedRole ? `/signup?role=${selectedRole}` : "/signup"} className="text-primary hover:underline">
            Don&apos;t have an account? Sign Up
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">This uses pre-defined credentials for demo purposes.</p>
          <p className="text-xs text-muted-foreground">Ensure Firebase is configured and dummy users exist in Firebase Auth.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
