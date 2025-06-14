
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
import { UserPlus, AlertTriangle, Loader2, ShieldCheck, User, Briefcase } from 'lucide-react';

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { createUserProfileInFirestore, type MinimalProfileDataForCreation } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/context/role-context';

// Admin emails (defaulting to hello@hmperform.com if env var is not set)
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
    path: ['confirmPassword'], // Error will be shown on the confirmPassword field
  });

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function NewSignupPage() {
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
    mode: 'onChange', // Validate on change for better UX with password confirmation
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
        // This case should ideally not be reached if createUserWithEmailAndPassword resolves
        throw new Error('User creation failed in Firebase Auth (firebaseUser was null).');
      }
    } catch (error: any) {
      console.error('[SignupPage] Sign Up Error:', error.message, error.code ? `Code: ${error.code}`: '', error);
      
      let errorMessage = 'Sign up failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
      } else if (error.message && (error.message.includes("Failed to create/update user profile in Firestore") || error.message.includes("PERMISSION_DENIED"))) {
        // This is the specific toast message you requested for Firestore write failures
        errorMessage = "Signup failed – check email domain or try again.";
      }

      toast({ title: 'Sign Up Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSigningUp(false);
    }
  };

  const getRoleIcon = (role: UserRole | null) => {
    if (!role) return null;
    switch (role) {
      case 'admin': return <ShieldCheck className="h-4 w-4 text-primary" />;
      case 'coach': return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'client': return <User className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-800 p-4 selection:bg-primary/20">
      <Card className="w-full max-w-md shadow-xl rounded-xl">
        <CardHeader className="text-center p-6">
          <div className="flex justify-center mb-4">
            <UserPlus className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400 pt-1">
            Join SessionSync and streamline your coaching.
          </CardDescription>
          {firebaseNotConfigured && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 text-red-700 dark:text-red-400 text-sm rounded-md flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Firebase is not configured. Sign up is disabled.</span>
            </div>
          )}
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-5 px-6 pb-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Alex Johnson"
                        {...field}
                        disabled={isSigningUp || firebaseNotConfigured}
                        className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-primary dark:focus:border-primary"
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
                    <FormLabel className="text-gray-700 dark:text-gray-300">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        disabled={isSigningUp || firebaseNotConfigured}
                        className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-primary dark:focus:border-primary"
                      />
                    </FormControl>
                     {assignedRoleForDisplay && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {getRoleIcon(assignedRoleForDisplay)}
                        Your assigned role will be: <span className="font-semibold capitalize">{assignedRoleForDisplay}</span>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isSigningUp || firebaseNotConfigured}
                        className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-primary dark:focus:border-primary"
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
                    <FormLabel className="text-gray-700 dark:text-gray-300">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isSigningUp || firebaseNotConfigured}
                        className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:border-primary dark:focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col items-center px-6 pb-6">
              <Button
                type="submit"
                className="w-full text-lg py-3 h-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105"
                disabled={isSigningUp || firebaseNotConfigured || !form.formState.isValid}
              >
                {isSigningUp ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-5 w-5" />
                )}
                {isSigningUp ? 'Creating Account...' : 'Create Account'}
              </Button>
              <Link
                href="/login"
                className="mt-6 text-sm text-primary hover:underline dark:text-primary/90"
              >
                Already have an account? Log In
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
      {firebaseNotConfigured && (
         <p className="mt-4 text-xs text-red-600 dark:text-red-400 text-center">
            Critical: Firebase is not configured. Please check <code>src/lib/firebase.ts</code>.
        </p>
      )}
    </div>
  );
}
