
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LifeBuoy, AlertTriangle, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { role, isLoading: isRoleLoading, user } = useRole();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [firebaseNotConfigured, setFirebaseNotConfigured] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

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

  // Redirection logic is now centralized in RoleContext

  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    if (firebaseNotConfigured) {
      toast({
        title: "Login Disabled",
        description: "Firebase is not configured. Cannot log in.",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // RoleContext will handle fetching profile and redirecting based on role
      toast({ title: 'Login Successful', description: `Welcome back!` });
    } catch (error: any) {
      console.error('Firebase Login Error:', error);
      let errorMessage = 'Login failed. Please check your email and password or try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address format is not valid.';
      }
      toast({ title: 'Login Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Show a loading spinner if the role context is loading or if the user is logged in but we are waiting for the redirect from RoleContext to happen.
  if (isRoleLoading || (user && role)) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /> <p className="ml-3 text-lg">Loading...</p></div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <LifeBuoy className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Welcome to SessionSync</CardTitle>
          <CardDescription className="text-md">Enter your credentials to log in</CardDescription>
          {firebaseNotConfigured && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Firebase is not configured. Login is disabled.</span>
            </div>
          )}
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleLogin)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        {...field} 
                        disabled={isLoggingIn || firebaseNotConfigured} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        disabled={isLoggingIn || firebaseNotConfigured} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg py-6" disabled={isLoggingIn || firebaseNotConfigured}>
                {isLoggingIn ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isLoggingIn ? 'Logging in...' : 'Login'}
              </Button>
            </CardContent>
          </form>
        </Form>
        <CardFooter className="flex flex-col items-center justify-center text-sm">
          <Link href="/signup" className="text-primary hover:underline">
            Don&apos;t have an account? Sign Up
          </Link>
          {firebaseNotConfigured && (
            <p className="mt-2 text-xs text-muted-foreground">
              Ensure Firebase is configured in <code>src/lib/firebase.ts</code>.
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
