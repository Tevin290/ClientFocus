'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import CompanyLayout from '@/components/company/company-layout';
import { useParams } from 'next/navigation';
import { 
  ArrowRight, 
  Users, 
  Calendar, 
  BarChart3, 
  Shield, 
  Zap, 
  CheckCircle,
  Star,
  Globe,
  Smartphone,
  Target,
  Award
} from 'lucide-react';

export default function CompanyLandingPage() {
  const params = useParams();
  const companySlug = params?.companySlug as string;

  return (
    <CompanyLayout>
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-headline font-bold text-primary">Professional Coaching</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link href={`/${companySlug}/login`}>
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href={`/${companySlug}/signup`}>
                  <Button className="bg-primary hover:bg-primary/90">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Badge className="mb-8 bg-accent/10 text-accent-foreground border-accent/20">
              <Zap className="w-3 h-3 mr-1" />
              Trusted by Clients Worldwide
            </Badge>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-headline font-bold text-foreground mb-6 leading-tight">
              Transform Your Life with
              <span className="text-primary block">Professional Coaching</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Connect with experienced coaches and unlock your full potential. Start your journey towards personal and professional growth with our proven coaching platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={`/${companySlug}/signup`}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-headline font-bold text-foreground mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Comprehensive coaching services designed to help you achieve your goals and unlock your potential.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: "Personalized Coaching",
                  description: "Work one-on-one with certified coaches who understand your unique goals and challenges."
                },
                {
                  icon: Users,
                  title: "Expert Coaches",
                  description: "Connect with experienced professionals who are passionate about helping you succeed."
                },
                {
                  icon: Calendar,
                  title: "Flexible Scheduling",
                  description: "Book sessions at your convenience with easy scheduling and automated reminders."
                },
                {
                  icon: BarChart3,
                  title: "Progress Tracking",
                  description: "Monitor your growth with detailed progress reports and achievement milestones."
                },
                {
                  icon: Shield,
                  title: "Secure & Private",
                  description: "Your personal information and coaching sessions are protected with enterprise-grade security."
                },
                {
                  icon: Smartphone,
                  title: "Mobile Access",
                  description: "Access your coaching platform anywhere with our fully responsive mobile experience."
                }
              ].map((feature, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card">
                  <CardContent className="p-6">
                    <feature.icon className="h-12 w-12 text-primary mb-4" />
                    <h3 className="text-xl font-headline font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-headline font-bold text-foreground mb-4">
                Trusted by Clients Everywhere
              </h2>
              <div className="flex justify-center items-center mb-8">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 text-accent fill-current" />
                ))}
                <span className="ml-2 text-lg font-semibold text-foreground">4.9/5 from client reviews</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Sarah Johnson",
                  role: "Marketing Executive",
                  content: "The coaching I received completely transformed my approach to leadership. I'm now more confident and effective in my role."
                },
                {
                  name: "Michael Chen",
                  role: "Entrepreneur",
                  content: "My coach helped me clarify my business vision and develop a concrete plan to achieve my goals. Highly recommended!"
                },
                {
                  name: "Emily Davis",
                  role: "Career Changer",
                  content: "The personalized approach and ongoing support made all the difference in my career transition. I couldn't be happier with the results."
                }
              ].map((testimonial, index) => (
                <Card key={index} className="border-0 shadow-lg bg-card">
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-accent fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-headline font-bold text-primary-foreground mb-4">
              Ready to Transform Your Life?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join the many clients who have already achieved their goals with professional coaching.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={`/${companySlug}/signup`}>
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg">
                  Start Your Journey Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center text-primary-foreground/90">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Free consultation available</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </CompanyLayout>
  );
}