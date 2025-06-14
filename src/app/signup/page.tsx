
'use client';

import React from 'react';
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
import { UserPlus, AlertTriangle, Loader2, ShieldCheck, User, Briefcase, Mail, Building, LogIn } from 'lucide-react';

import { createUserWithEmailAndPassword, updateProfile, type User as FirebaseUser } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { createUserProfileInFirestore, type MinimalProfileDataForCreation } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/context/role-context';

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
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [firebaseNotConfigured, setFirebaseNotConfigured] = React.useState(false);
  const [autoAssignedRole, setAutoAssignedRole] = React.useState<UserRole | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange', // Validate on change for better UX
  });

  const emailValue = form.watch('email');

  React.useEffect(() => {
    if (typeof window !== 'undefined' && !isFirebaseConfigured()) {
      setFirebaseNotConfigured(true);
      toast({
        title: 'Firebase Not Configured',
        description: 'Sign up is disabled. Please configure Firebase.',
        variant: 'destructive',
        duration: Infinity,
      });
    }
  }, [toast]);

  React.useEffect(() => {
    if (emailValue && z.string().email().safeParse(emailValue).success) {
      const normalizedEmail = emailValue.toLowerCase();
      if (ADMIN_EMAILS.includes(normalizedEmail)) {
        setAutoAssignedRole('admin');
      } else if (normalizedEmail.endsWith('@hmperform.com')) {
        setAutoAssignedRole('coach');
      } else {
        setAutoAssignedRole('client');
      }
    } else {
      setAutoAssignedRole(null);
    }
  }, [emailValue]);

  const getRoleIcon = (role: UserRole | null) => {
    if (!role) return <Mail className="h-4 w-4 text-muted-foreground" />;
    switch (role) {
      case 'admin': return <ShieldCheck className="h-4 w-4 text-primary" />;
      case 'coach': return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'client': return <User className="h-4 w-4 text-green-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    if (firebaseNotConfigured) {
      toast({
        title: 'Sign Up Disabled',
        description: 'Firebase is not configured.',
        variant: 'destructive',
      });
      return;
    }

    setIsSigningUp(true);

    let assignedRole: Exclude<UserRole, null>;
    const normalizedEmail = data.email.toLowerCase();

    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      assignedRole = 'admin';
    } else if (normalizedEmail.endsWith('@hmperform.com')) {
      assignedRole = 'coach';
    } else {
      assignedRole = 'client';
    }

    const profileDataForFirestore: MinimalProfileDataForCreation = {
      email: normalizedEmail,
      displayName: data.displayName,
      role: assignedRole,
    };

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser) {
        throw new Error('User creation in Firebase Auth returned null user object.');
      }
      
      await updateProfile(firebaseUser, { displayName: data.displayName });
      
      // Pass the entire firebaseUser object
      await createUserProfileInFirestore(firebaseUser, profileDataForFirestore);

      toast({
        title: 'Account Created!',
        description: 'Your account has been successfully created. Please log in.',
      });
      router.push('/login');

    } catch (error: any) {
      let errorMessage: string;
      let errorCode: string;
      let toastMessage = 'Signup failed. Please try again.';

      if (error instanceof RangeError && error.message.includes('Maximum call stack size exceeded')) {
        errorMessage = 'A "Maximum call stack size exceeded" error occurred internally.';
        errorCode = 'STACK_OVERFLOW_ERROR';
        console.error("[SignupPage] Sign Up Error: Maximum call stack size exceeded during signup process.");
        toastMessage = "Signup failed due to an internal error (Stack Overflow). Please contact support.";
      } else {
        // Safely try to access message and code
        try {
          errorMessage = String(error?.message || 'Unknown signup error (message retrieval failed).');
        } catch (e) {
          errorMessage = 'Unknown signup error (error.message access failed).';
        }

        try {
          errorCode = String(error?.code || 'UNKNOWN_ERROR (code retrieval failed).');
        } catch (e) {
          errorCode = 'UNKNOWN_ERROR (error.code access failed).';
        }
        
        // Construct the log message using string concatenation
        const logMessage = "[SignupPage] Sign Up Error: " + errorMessage + " Code: " + errorCode;
        console.error(logMessage);
        
        if (errorCode === 'auth/email-already-in-use') {
          toastMessage = 'This email address is already in use.';
        } else if (errorCode === 'auth/weak-password') {
          toastMessage = 'The password is too weak.';
        } else if (errorMessage.includes("PERMISSION_DENIED")) { 
           toastMessage = "Signup failed due to permissions. Please contact support or check Firestore rules.";
        } else if (errorMessage.includes("Authentication state error")) {
          toastMessage = "Signup failed due to an authentication issue. Please try again.";
        }
      }

      toast({ title: 'Sign Up Failed', description: toastMessage, variant: 'destructive' });
    } finally {
      setIsSigningUp(false);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-6 selection:bg-primary/20">
      <Card className="w-full max-w-lg shadow-xl rounded-xl border-border/50 overflow-hidden">
        <CardHeader className="bg-card p-8 text-center">
            <Link href="/" className="inline-block mb-6 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card rounded-md">
                <Building className="h-12 w-12 text-primary transition-transform duration-300 ease-in-out hover:scale-110" />
            </Link>
          <CardTitle className="text-3xl font-headline font-bold text-foreground tracking-tight">
            Create Your SessionSync Account
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2 text-base">
            Join our platform to streamline your coaching and client management.
            Your role is auto-assigned based on your email.
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
            <CardContent className="space-y-6 p-8">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/90 font-medium text-sm">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Alex Johnson"
                        {...field}
                        disabled={isSigningUp || firebaseNotConfigured}
                        className="bg-background/80 border-input focus:border-primary h-11 text-base"
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
                    <FormLabel className="text-foreground/90 font-medium text-sm">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        disabled={isSigningUp || firebaseNotConfigured}
                        className="bg-background/80 border-input focus:border-primary h-11 text-base"
                      />
                    </FormControl>
                     {autoAssignedRole && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 pl-1">
                        {getRoleIcon(autoAssignedRole)}
                        Anticipated role: <span className="font-semibold capitalize">{autoAssignedRole}</span>
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
                      <FormLabel className="text-foreground/90 font-medium text-sm">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="•••••••• (min. 6 characters)"
                          {...field}
                          disabled={isSigningUp || firebaseNotConfigured}
                          className="bg-background/80 border-input focus:border-primary h-11 text-base"
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
                      <FormLabel className="text-foreground/90 font-medium text-sm">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          disabled={isSigningUp || firebaseNotConfigured}
                          className="bg-background/80 border-input focus:border-primary h-11 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center p-8 pt-2 bg-card">
              <Button
                type="submit"
                className="w-full text-lg py-3 h-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-300 ease-in-out transform hover:scale-[1.01] focus:scale-[1.01] focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:bg-primary/70"
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
                  className="font-medium text-primary hover:underline hover:text-primary/90 flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-primary focus:rounded-sm"
                >
                   <LogIn className="h-4 w-4"/> Log In
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
      {firebaseNotConfigured && (
         <p className="mt-4 text-xs text-destructive text-center max-w-md">
            Critical: Firebase is not configured. Sign up functionality is disabled. Please check your <code>src/lib/firebase.ts</code> file or environment variables.
        </p>
      )}
    </div>
  );
}
