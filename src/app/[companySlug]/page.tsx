'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Target, Award, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import CompanyLayout from '@/components/company/company-layout';
import { useParams } from 'next/navigation';

export default function CompanyLandingPage() {
  const params = useParams();
  const companySlug = params?.companySlug as string;

  return (
    <CompanyLayout hideHeader>
      {/* Hero Header */}
      <header className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                {/* Company logo or icon */}
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Welcome</h1>
                <p className="text-muted-foreground">Professional Coaching Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href={`/${companySlug}/login`}>
                  Sign In
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/${companySlug}/signup`}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Transform Your Life with
            <span className="text-primary block">Professional Coaching</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with experienced coaches and unlock your full potential. 
            Start your journey towards personal and professional growth today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href={`/${companySlug}/signup`}>
                <Users className="mr-2 h-5 w-5" />
                Join as Client
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={`/${companySlug}/signup`}>
                <Award className="mr-2 h-5 w-5" />
                Become a Coach
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Why Choose Our Platform?</h3>
            <p className="text-lg text-muted-foreground">
              Professional coaching services tailored to your needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Target className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Personalized Coaching</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Work one-on-one with certified coaches who understand your unique goals and challenges.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Expert Coaches</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect with experienced professionals who are passionate about helping you succeed.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Award className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Proven Results</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Join thousands of clients who have achieved their goals through our coaching programs.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h3 className="text-3xl font-bold mb-6">Ready to Get Started?</h3>
          <p className="text-lg text-muted-foreground mb-8">
            Take the first step towards achieving your goals with professional coaching.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href={`/${companySlug}/signup`}>
                Create Account
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={`/${companySlug}/login`}>
                Already have an account? Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </CompanyLayout>
  );
}