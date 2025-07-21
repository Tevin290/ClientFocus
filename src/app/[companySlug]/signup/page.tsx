/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCompanyBySlug, getAllCoaches, createUserProfileInFirestore, type CompanyProfile } from '@/lib/firestoreService';
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import CompanyLayout from '@/components/company/company-layout';
import Link from 'next/link';

export default function CompanySignupPage() {
  const router = useRouter();
  const params = useParams();
  const { role, isLoading: roleLoading } = useRole();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '',
    displayName: '', 
    role: 'client' as 'admin' | 'coach' | 'client',
    coachId: ''
  });
  const [isSigningUp, setIsSigningUp] = useState(false);

  const companySlug = params?.companySlug as string;

  useEffect(() => {
    const loadCompanyData = async () => {
      if (!companySlug) return;
      
      try {
        const companyData = await getCompanyBySlug(companySlug);
        if (!companyData) {
          setError('Company not found');
          return;
        }
        setCompany(companyData);

        // Load coaches for client signup - only coaches from this company
        const coachList = await getAllCoaches(companyData.id);
        setCoaches(coachList);
      } catch (err) {
        setError('Failed to load company information');
      } finally {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, [companySlug]);

  useEffect(() => {
    if (!roleLoading && role && company) {
      let dashboardPath = `/${role}/dashboard`;
      if (role === 'super-admin') dashboardPath = '/admin/dashboard';
      router.replace(dashboardPath);
    }
  }, [role, roleLoading, company, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Business rule validation
    if (formData.role === 'client' && !formData.coachId) {
      setError('Clients must select a coach');
      return;
    }
    
    if ((formData.role === 'coach' || formData.role === 'admin') && !company?.id) {
      setError('Coaches and admins must belong to a company');
      return;
    }
    
    setIsSigningUp(true);
    setError('');

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // Create Firestore profile
      const profileData = {
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        companyId: company!.id,
        createdAt: serverTimestamp(),
        ...(formData.role === 'client' && { coachId: formData.coachId })
      };

      await createUserProfileInFirestore(userCredential.user.uid, profileData);
      
      // Navigation will be handled by role context
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (loading || roleLoading) {
    return (
      <CompanyLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </CompanyLayout>
    );
  }

  if (error && !company) {
    return (
      <CompanyLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Alert className="max-w-md">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </CompanyLayout>
    );
  }

  // Check if user can register as admin (must match company admin email)
  const canRegisterAsAdmin = formData.email === company?.adminEmail;

  return (
    <CompanyLayout>
      <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Join {company?.name}
          </CardTitle>
          <CardDescription>
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value: 'admin' | 'coach' | 'client') => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canRegisterAsAdmin && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              {formData.email && !canRegisterAsAdmin && formData.role === 'admin' && (
                <p className="text-xs text-red-500">
                  Only {company?.adminEmail} can register as admin
                </p>
              )}
            </div>

            {formData.role === 'client' && (
              <div className="space-y-2">
                <Label htmlFor="coachId">Select Your Coach</Label>
                <Select value={formData.coachId} onValueChange={(value) => setFormData(prev => ({ ...prev, coachId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.uid} value={coach.uid}>
                        {coach.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {coaches.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No coaches available in this company yet.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
              />
            </div>

            {error && (
              <Alert>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSigningUp}
            >
              {isSigningUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  href={`/${companySlug}/login`}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </CompanyLayout>
  );
}