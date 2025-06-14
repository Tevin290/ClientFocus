
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UserPlus, AlertTriangle, LifeBuoy, Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { createUserProfileInFirestore, type MinimalProfileDataForCreation } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/context/role-context';

// Predefined list of admin emails (ideally from environment variables)
// Defaulting to 'hello@hmperform.com' as the admin email if NEXT_PUBLIC_ADMIN_EMAILS is not set.
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || ['hello@hmperform.com']);


const signupSchemaBase = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'coach', 'client'], { required_error: 'Please select a role' }),
});

// This schema validates the form input, including that only @hmperform.com emails
// can *select* 'admin' or 'coach' in the form. The actual role assignment logic below
// will override this based on ADMIN_EMAILS and domain for final assignment.
const signupSchema = signupSchemaBase
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(data => {
    const normalizedEmail = data.email.toLowerCase();
    if (data.role === 'admin' && !ADMIN_EMAILS.includes(normalizedEmail)) {
        // This specific check ensures that if 'admin' is selected, the email MUST be in ADMIN_EMAILS.
        // If not, it's an invalid selection, even if it's an @hmperform.com email.
        return false;
    }
    if ((data.role === 'admin' || data.role === 'coach') && !normalizedEmail.endsWith('@hmperform.com')) {
      return false;
    }
    return true;
  }, {
    message: "Admin/Coach roles require an @hmperform.com email. Admin role requires a pre-approved email.",
    path: ["role"],
  });


type SignupFormValues = z.infer<typeof signupSchema>;


export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [firebaseNotConfigured, setFirebaseNotConfigured] = useState(false);

  const initialRole = searchParams.get('role') as UserRole | null;

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: initialRole || undefined,
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && !isFirebaseConfigured()) {
      setFirebaseNotConfigured(true);
      toast({
        title: "Firebase Not Configured",
        description: "Please configure Firebase in src/lib/firebase.ts to enable sign up.",
        variant: "destructive",
        duration: Infinity,
      });
    }
  }, [toast]);

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    if (firebaseNotConfigured) {
      toast({
        title: "Sign Up Disabled",
        description: "Firebase is not configured. Cannot create account.",
        variant: "destructive",
      });
      return;
    }

    setIsSigningUp(true);

    const normalizedEmail = data.email.toLowerCase();
    let assignedRole: Exclude<UserRole, null>;

    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      assignedRole = 'admin';
    } else if (normalizedEmail.endsWith('@hmperform.com')) {
      assignedRole = 'coach';
    } else {
      assignedRole = 'client';
    }

    // This is the data that will be passed to Firestore service, with the app-determined role.
    const profileDataForFirestore: MinimalProfileDataForCreation = {
      email: normalizedEmail,
      displayName: data.displayName,
      role: assignedRole,
    };

    console.log(`[SignupPage] Attempting sign up. User-selected role: ${data.role}, Auto-assigned role: ${assignedRole}`);
    console.log(`[SignupPage] Profile data for Firestore (before UID):`, profileDataForFirestore);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        console.log(`[SignupPage] Firebase Auth user created. UID: ${firebaseUser.uid}`);
        await updateProfile(firebaseUser, { displayName: data.displayName });
        console.log(`[SignupPage] Firebase Auth profile updated with displayName: ${data.displayName}`);

        // Call Firestore service to create the user profile document
        console.log(`[SignupPage] Calling createUserProfileInFirestore for UID: ${firebaseUser.uid} with data:`, JSON.stringify(profileDataForFirestore));
        await createUserProfileInFirestore(firebaseUser.uid, profileDataForFirestore);

        toast({
          title: 'Account Created!',
          description: 'Your account has been successfully created. Please log in.',
          variant: 'default',
        });
        router.push('/login');
      } else {
        throw new Error("User creation failed in Firebase Auth (firebaseUser was null).");
      }
    } catch (error: any) {
      console.error('[SignupPage] Sign Up Error:', error.message, error.code ? `Code: ${error.code}`: '', error);
      let toastDescription = "Sign up failed. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        toastDescription = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        toastDescription = 'The password is too weak.';
      } else if (error.message && (error.message.includes("Failed to create/update user profile in Firestore") || error.message.includes("PERMISSION_DENIED"))) {
        // More specific message for Firestore permission issues
        toastDescription = "Signup failed – check email domain or try again.";
      }

      toast({ title: 'Sign Up Failed', description: toastDescription, variant: 'destructive' });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <UserPlus className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Create Your SessionSync Account</CardTitle>
          <CardDescription className="text-md">Fill in the details below to get started.</CardDescription>
          {firebaseNotConfigured && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Firebase is not configured. Sign up is disabled.</span>
            </div>
          )}
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} disabled={isSigningUp || firebaseNotConfigured} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input type="email" placeholder="e.g., jane.doe@example.com" {...field} disabled={isSigningUp || firebaseNotConfigured} /></FormControl>
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
                    <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSigningUp || firebaseNotConfigured} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isSigningUp || firebaseNotConfigured} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Select Your Intended Role (Your final role will be auto-assigned based on your email)</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                        disabled={isSigningUp || firebaseNotConfigured}
                      >
                        {(['client', 'coach', 'admin'] as Exclude<UserRole, null>[]).map((r) => (
                          <FormItem key={r} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={r} id={`role-signup-${r}`} />
                            </FormControl>
                            <FormLabel htmlFor={`role-signup-${r}`} className="font-normal capitalize">
                              {r}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage /> {/* This will show Zod validation errors for the role field */}
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col items-center">
              <Button type="submit" className="w-full text-lg py-6" disabled={isSigningUp || firebaseNotConfigured}>
                {isSigningUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSigningUp ? 'Creating Account...' : 'Create Account'}
              </Button>
              <Link href="/login" className="mt-4 text-primary hover:underline text-sm">
                Already have an account? Log In
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
       <Link href="/" className="mt-8 flex items-center text-sm text-muted-foreground hover:text-primary">
        <LifeBuoy className="mr-2 h-4 w-4" />
        Back to SessionSync Home (Login)
      </Link>
    </div>
  );
}
