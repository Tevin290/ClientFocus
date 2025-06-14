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

// Default admin email if NEXT_PUBLIC_ADMIN_EMAILS is not set.
// For testing, explicitly use 'hello@hmperform.com'.
// In a real deployment, this should come from process.env.NEXT_PUBLIC_ADMIN_EMAILS
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || ['hello@hmperform.com']);


const signupSchemaBase = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  // Role selected in form - this is for client-side validation display only.
  // The actual role assignment logic in onSubmit will override this.
  role: z.enum(['admin', 'coach', 'client'], { required_error: 'Please select your intended role' }),
});

const signupSchema = signupSchemaBase
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine(data => {
    const normalizedEmail = data.email.toLowerCase();
    // Client-side validation for role selection based on email.
    // This provides immediate feedback but the server-side logic (inferred or through rules) is the source of truth.
    if (data.role === 'admin' && !ADMIN_EMAILS.includes(normalizedEmail)) {
        return false; // Cannot select admin if email not in ADMIN_EMAILS
    }
    if ((data.role === 'admin' || data.role === 'coach') && !normalizedEmail.endsWith('@hmperform.com')) {
      return false; // Cannot select admin/coach if not @hmperform.com email
    }
    if (data.role === 'client' && normalizedEmail.endsWith('@hmperform.com') && !ADMIN_EMAILS.includes(normalizedEmail)) {
      // Discourage @hmperform.com users (non-admin) from selecting client
      // They should probably be 'coach'. This is a soft validation, backend logic assigns 'coach'.
      // This path is tricky, maybe remove this specific client check if it's confusing.
      // The backend logic will make them 'coach' anyway.
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

  // Note: initialRole from URL params is not used to set the actual role,
  // as the role is now strictly determined by email.
  // It could be used to pre-select the radio button if desired, but defaultValues.role handles that.

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'client', // Default form selection, actual role determined by email
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

    // Definitive role assignment based on email
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      assignedRole = 'admin';
    } else if (normalizedEmail.endsWith('@hmperform.com')) {
      assignedRole = 'coach';
    } else {
      assignedRole = 'client';
    }
    console.log(`[SignupPage] Form submitted. User-selected role in form: ${data.role}, Auto-assigned role based on email: ${assignedRole}`);

    const profileDataForFirestore: MinimalProfileDataForCreation = {
      email: normalizedEmail,
      displayName: data.displayName,
      role: assignedRole, // Use the auto-assigned role
    };
    console.log(`[SignupPage] Profile data for Firestore (before UID):`, profileDataForFirestore);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        console.log(`[SignupPage] Firebase Auth user created. UID: ${firebaseUser.uid}`);
        await updateProfile(firebaseUser, { displayName: data.displayName });
        console.log(`[SignupPage] Firebase Auth profile updated with displayName: ${data.displayName}`);

        console.log(`[SignupPage] Calling createUserProfileInFirestore for UID: ${firebaseUser.uid} with data:`, JSON.stringify(profileDataForFirestore));
        await createUserProfileInFirestore(firebaseUser.uid, profileDataForFirestore);
        console.log(`[SignupPage] createUserProfileInFirestore successful for UID: ${firebaseUser.uid}`);

        toast({
          title: 'Account Created!',
          description: 'Your account has been successfully created. Please log in.',
        });
        router.push('/login');
      } else {
        throw new Error("User creation failed in Firebase Auth (firebaseUser was null).");
      }
    } catch (error: any) {
      console.error('[SignupPage] Sign Up Error:', error.message, error.code ? `Code: ${error.code}`: '', error);
      let errorMessage = "Sign up failed. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
      } else if (error.message && (error.message.includes("Failed to create/update user profile in Firestore") || error.message.includes("PERMISSION_DENIED"))) {
        errorMessage = "Signup failed – check email domain or try again.";
      }

      toast({ title: 'Sign Up Failed', description: errorMessage, variant: 'destructive' });
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
                    <FormLabel>Select Your Intended Role (Final role is auto-assigned based on email)</FormLabel>
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
                    <FormMessage />
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