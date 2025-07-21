
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

  // Check if email is allowed to use root login (admins only)
  const isAdminEmail = (email: string): boolean => {
    const normalizedEmail = email.toLowerCase();
    const SUPER_ADMIN_EMAIL = 'supersuper@hmperform.com';
    const ADMIN_DOMAINS = ['@hmperform.com']; // Add your admin domains here
    
    return normalizedEmail === SUPER_ADMIN_EMAIL || 
           ADMIN_DOMAINS.some(domain => normalizedEmail.endsWith(domain));
  };

  const handleLogin: SubmitHandler<LoginFormValues> = async (data) => {
    if (firebaseNotConfigured) {
      toast({
        title: "Login Disabled",
        description: "Firebase is not configured. Cannot log in.",
        variant: "destructive",
      });
      return;
    }

    // Check if email is allowed for root login
    if (!isAdminEmail(data.email)) {
      toast({
        title: "Access Restricted",
        description: "This login is for platform administrators only. Please use your company's login page.",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // RoleContext will handle fetching profile and redirecting based on role
      toast({ title: 'Login Successful', description: `Welcome back!` });
    } catch (error: unknown) {
      console.error('Firebase Login Error:', error);
      let errorMessage = 'Login failed. Please check your email and password or try again.';
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password.';
        } else if (firebaseError.code === 'auth/invalid-email') {
          errorMessage = 'The email address format is not valid.';
        }
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
          <CardTitle className="text-3xl font-headline">Platform Administration</CardTitle>
          <CardDescription className="text-md">Login for platform administrators only</CardDescription>
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
        <CardFooter className="flex flex-col items-center justify-center text-sm space-y-3">
          <Link href="/signup" className="text-primary hover:underline">
            Platform Admin Sign Up
          </Link>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">
              Looking for your company login?
            </p>
            <p className="text-muted-foreground text-xs">
              Visit: <code className="text-primary">{process.env.NEXT_PUBLIC_APP_URL}/company-name/login</code>
            </p>
          </div>
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
