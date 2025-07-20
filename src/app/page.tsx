import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
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
  Smartphone
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-headline font-bold text-primary">ClientFocus</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
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
            Trusted by 1000+ Coaches Worldwide
          </Badge>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-headline font-bold text-foreground mb-6 leading-tight">
            Transform Your
            <span className="text-primary block">Coaching Practice</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Streamline client management, track sessions, and grow your coaching business with our all-in-one platform designed for modern coaches.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                Watch Demo
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
              Everything You Need to Scale
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built by coaches, for coaches. Every feature is designed to help you focus on what matters most.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Client Management",
                description: "Organize all your clients in one place with detailed profiles, progress tracking, and communication history."
              },
              {
                icon: Calendar,
                title: "Session Scheduling",
                description: "Seamlessly schedule, reschedule, and manage coaching sessions with automated reminders."
              },
              {
                icon: BarChart3,
                title: "Progress Analytics",
                description: "Track client progress with detailed analytics and generate reports to measure success."
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Enterprise-grade security ensures your client data is always protected and compliant."
              },
              {
                icon: Globe,
                title: "Multi-Company",
                description: "Manage multiple coaching businesses or departments with separate workspaces."
              },
              {
                icon: Smartphone,
                title: "Mobile Ready",
                description: "Access your coaching practice anywhere with our fully responsive mobile experience."
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
              Loved by Coaches Worldwide
            </h2>
            <div className="flex justify-center items-center mb-8">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-accent fill-current" />
              ))}
              <span className="ml-2 text-lg font-semibold text-foreground">4.9/5 from 500+ reviews</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                role: "Life Coach",
                content: "ClientFocus has transformed how I manage my practice. The analytics help me track my clients' progress like never before."
              },
              {
                name: "Michael Chen",
                role: "Business Coach",
                content: "The multi-company feature is perfect for managing different coaching programs. Highly recommended!"
              },
              {
                name: "Emily Davis",
                role: "Wellness Coach",
                content: "Simple, intuitive, and powerful. Everything I need to focus on coaching rather than administration."
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
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of coaches who have already elevated their practice with ClientFocus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center text-primary-foreground/90">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>No credit card required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-headline font-bold text-primary mb-4">ClientFocus</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                The all-in-one platform for modern coaches to manage clients, track progress, and grow their practice.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
                <li><Link href="/login" className="text-muted-foreground hover:text-foreground">Sign In</Link></li>
                <li><Link href="/signup" className="text-muted-foreground hover:text-foreground">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link href="#" className="text-muted-foreground hover:text-foreground">Help Center</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-foreground">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 ClientFocus. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
