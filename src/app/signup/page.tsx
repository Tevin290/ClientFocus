
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
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || ['jacob@hmperform.com']);


const signupSchemaBase = z.object({
  displayName: z.string().min(3, 'Display name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  // Role selected in the form - Zod validation ensures this selected role is valid for the email type.
  // The actual role saved to Firestore will be auto-assigned based on email logic later.
  role: z.enum(['admin', 'coach', 'client'], { required_error: 'Please select a role' }),
});

const signupSchema = signupSchemaBase
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], 
  })
  // This refine ensures the ROLE SELECTED IN THE FORM is valid for the email domain.
  // The actual role assignment will happen in onSubmit based on email.
  .refine(data => {
    if ((data.role === 'admin' || data.role === 'coach') && !data.email.toLowerCase().endsWith('@hmperform.com')) {
      return false;
    }
    // If admin role is selected, email must be in ADMIN_EMAILS list
    if (data.role === 'admin' && !ADMIN_EMAILS.includes(data.email.toLowerCase())) {
        // This specific message for admin role might not show directly due to how Zod pathing works with refine,
        // but the combination of rules will prevent invalid admin selection.
        // A more complex Zod schema could provide distinct messages.
        return false; 
    }
    return true;
  }, {
    message: "Admin/Coach roles require an @hmperform.com email. Admin role requires a pre-approved email.",
    path: ["role"], // Attach error to role field or email field as appropriate
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
      role: initialRole || undefined, // Role selected by user in the form
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
    
    // Auto-assign the role based on email domain and ADMIN_EMAILS list
    const normalizedEmail = data.email.toLowerCase();
    const assignedRole: Exclude<UserRole, null> = ADMIN_EMAILS.includes(normalizedEmail)
      ? 'admin'
      : normalizedEmail.endsWith('@hmperform.com')
      ? 'coach'
      : 'client';

    console.log(`[SignupPage] Attempting sign up with form data:`, data);
    console.log(`[SignupPage] Auto-assigned role based on email (${normalizedEmail}): ${assignedRole}`);

    const profileDataForFirestore: MinimalProfileDataForCreation = {
      email: normalizedEmail, // Use normalized email
      displayName: data.displayName,
      role: assignedRole, 
    };
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;
      
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: data.displayName });
        
        console.log(`[SignupPage] Auth user created (UID: ${firebaseUser.uid}). Attempting to create Firestore profile.`);
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
      let toastTitle = 'Sign Up Failed';
      let toastDescription = 'An unexpected error occurred. Please try again.';

      if (error.code === 'auth/email-already-in-use') {
        toastDescription = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        toastDescription = 'The password is too weak.';
      } else if (error.message && error.message.includes("Failed to create/update user profile in Firestore")) {
        // This covers permission denied and other Firestore write issues based on your request.
        toastDescription = "Signup failed – check email domain or try again.";
      }
      // Log the specific error for debugging if it's a Firestore permission issue
      if (error.message && error.message.includes("PERMISSION_DENIED")) {
        console.error("[SignupPage] Firestore permission denied during profile creation. Check rules and data.", error);
      }

      toast({ title: toastTitle, description: toastDescription, variant: 'destructive' });
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
                    <FormLabel>Select Your Role (Your final role will be assigned based on email)</FormLabel>
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
