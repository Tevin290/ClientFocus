
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { UserPlus, AlertTriangle, Loader2, ShieldCheck, User, Briefcase, Mail } from 'lucide-react';

import { createUserWithEmailAndPassword, updateProfile, type User as FirebaseUser } from 'firebase/auth'; // Import FirebaseUser
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { createUserProfileInFirestore, type MinimalProfileDataForCreation } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/context/role-context';

// Admin emails (defaulting if env var is not set)
const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || ['hello@hmperform.com']
);

const signupFormSchema = z
  .object({
    displayName: z.string().min(3, { message: 'Full name must be at least 3 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    confirmPassword: z.string().min(6, { message: 'Please confirm your password.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'], 
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [firebaseNotConfigured, setFirebaseNotConfigured] = useState(false);
  const [assignedRoleForDisplay, setAssignedRoleForDisplay] = useState<UserRole | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange', 
  });

  const emailValue = form.watch('email');

  useEffect(() => {
    if (typeof window !== 'undefined' && !isFirebaseConfigured()) {
      setFirebaseNotConfigured(true);
      toast({
        title: 'Firebase Not Configured',
        description: 'Please configure Firebase in src/lib/firebase.ts to enable sign up.',
        variant: 'destructive',
        duration: Infinity,
      });
    }
  }, [toast]);

  useEffect(() => {
    // Determine and display the auto-assigned role based on email
    if (emailValue && z.string().email().safeParse(emailValue).success) {
      const normalizedEmail = emailValue.toLowerCase();
      if (ADMIN_EMAILS.includes(normalizedEmail)) {
        setAssignedRoleForDisplay('admin');
      } else if (normalizedEmail.endsWith('@hmperform.com')) {
        setAssignedRoleForDisplay('coach');
      } else {
        setAssignedRoleForDisplay('client');
      }
    } else {
      setAssignedRoleForDisplay(null);
    }
  }, [emailValue]);

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    if (firebaseNotConfigured) {
      toast({
        title: 'Sign Up Disabled',
        description: 'Firebase is not configured. Cannot create account.',
        variant: 'destructive',
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
    console.log(`[SignupPage] Determined role for ${normalizedEmail}: ${assignedRole}`);

    const profileDataForFirestore: MinimalProfileDataForCreation = {
      email: normalizedEmail,
      displayName: data.displayName,
      role: assignedRole,
    };

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user; // This is the FirebaseUser object

      if (firebaseUser) {
        console.log(`[SignupPage] Firebase Auth user created. UID: ${firebaseUser.uid}`);
        await updateProfile(firebaseUser, { displayName: data.displayName });
        console.log(`[SignupPage] Firebase Auth profile updated with displayName: ${data.displayName}`);

        console.log(`[SignupPage] Calling createUserProfileInFirestore for UID: ${firebaseUser.uid} with data:`, JSON.stringify(profileDataForFirestore));
        // Pass the entire firebaseUser object
        await createUserProfileInFirestore(firebaseUser, profileDataForFirestore); 
        console.log(`[SignupPage] createUserProfileInFirestore successful for UID: ${firebaseUser.uid}`);

        toast({
          title: 'Account Created!',
          description: 'Your account has been successfully created. Please log in.',
        });
        router.push('/login');
      } else {
        throw new Error('User creation failed in Firebase Auth (firebaseUser was null).');
      }
    } catch (error: any) {
      console.error('[SignupPage] Sign Up Error:', error.message, error.code ? `Code: ${error.code}`: '', error);
      
      let errorMessage = 'Sign up failed – check email domain or try again.'; // Default more specific message
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
      } else if (error.message && error.message.startsWith('[firestoreService]')) {
        // If it's one of our custom errors from firestoreService, use its message
        errorMessage = error.message;
      } else if (error.message && error.message.includes("PERMISSION_DENIED")) {
         errorMessage = "Signup failed due to permissions. Please contact support.";
      }


      toast({ title: 'Sign Up Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSigningUp(false);
    }
  };

  const getRoleIcon = (role: UserRole | null) => {
    if (!role) return <Mail className="h-4 w-4 text-muted-foreground" />;
    switch (role) {
      case 'admin': return <ShieldCheck className="h-4 w-4 text-primary" />;
      case 'coach': return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'client': return <User className="h-4 w-4 text-green-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4 selection:bg-primary/20">
      <Card className="w-full max-w-lg shadow-xl rounded-xl border-border/50">
        <CardHeader className="text-center p-8">
          <Link href="/" className="flex items-center justify-center gap-2 mb-6">
            <UserPlus className="h-12 w-12 text-primary" />
          </Link>
          <CardTitle className="text-3xl font-headline text-foreground">
            Create Your SessionSync Account
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Join the platform to streamline your coaching workflow.
          </CardDescription>
          {firebaseNotConfigured && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Firebase is not configured. Sign up is disabled.</span>
            </div>
          )}
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 px-8">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Alex Johnson"
                        {...field}
                        disabled={isSigningUp || firebaseNotConfigured}
                        className="bg-background/70 border-input focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        disabled={isSigningUp || firebaseNotConfigured}
                        className="bg-background/70 border-input focus:border-primary"
                      />
                    </FormControl>
                     {assignedRoleForDisplay && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 pl-1">
                        {getRoleIcon(assignedRoleForDisplay)}
                        Your auto-assigned role will be: <span className="font-semibold capitalize">{assignedRoleForDisplay}</span>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          disabled={isSigningUp || firebaseNotConfigured}
                          className="bg-background/70 border-input focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          disabled={isSigningUp || firebaseNotConfigured}
                          className="bg-background/70 border-input focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center px-8 pb-8 pt-6">
              <Button
                type="submit"
                className="w-full text-lg py-3 h-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 ease-in-out transform hover:scale-[1.02] focus:scale-[1.02] focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
                disabled={isSigningUp || firebaseNotConfigured || !form.formState.isValid}
              >
                {isSigningUp ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-5 w-5" />
                )}
                {isSigningUp ? 'Creating Account...' : 'Create Account'}
              </Button>
              <p className="mt-6 text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline hover:text-primary/90"
                >
                  Log In
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
      {firebaseNotConfigured && (
         <p className="mt-4 text-xs text-destructive text-center">
            Critical: Firebase is not configured. Please check <code>src/lib/firebase.ts</code>.
        </p>
      )}
    </div>
  );
}

