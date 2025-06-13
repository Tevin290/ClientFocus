
'use client';

import type { ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter }
from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Users,
  Settings,
  ClipboardList,
  UserCircle,
  BarChart3,
  LogOut,
  LayoutDashboard,
  Bell,
  Sun,
  Moon,
  LifeBuoy,
  CreditCard,
  History,
  FileText,
} from 'lucide-react';
import { useRole, type UserRole } from '@/context/role-context';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/admin/sessions', label: 'Session Review', icon: ClipboardList, roles: ['admin'] },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard, roles: ['admin'] },
  { href: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'], disabled: true },
  { href: '/admin/settings', label: 'Stripe Settings', icon: Settings, roles: ['admin'] },
  
  { href: '/coach/dashboard', label: 'Coach Dashboard', icon: BarChart3, roles: ['coach'] },
  { href: '/coach/log-session', label: 'Log Session', icon: FileText, roles: ['coach'] },
  { href: '/coach/my-sessions', label: 'My Sessions', icon: History, roles: ['coach'] },
  { href: '/coach/my-clients', label: 'My Clients', icon: Users, roles: ['coach'] },

  { href: '/client/dashboard', label: 'Client Dashboard', icon: LayoutDashboard, roles: ['client'], disabled: true },
  { href: '/client/history', label: 'Session History', icon: History, roles: ['client'], disabled: false },
  { href: '/client/profile', label: 'My Profile', icon: UserCircle, roles: ['client'], disabled: true },
];

const AppLogo = () => (
  <Link href="/" className="flex items-center gap-2 px-2 min-h-[4rem]">
    <LifeBuoy className="h-8 w-8 text-primary" />
    <h1 className="text-xl font-bold font-headline text-foreground">SessionSync</h1>
  </Link>
);

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, setRole, isLoading: isRoleLoading } = useRole();
  const router = useRouter(); 
  const [isMounted, setIsMounted] = useState(false);
  const [isStripeTestMode, setIsStripeTestMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setIsMounted(true);
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  useEffect(() => {
    if(!isRoleLoading && !role && pathname !== '/login' && !pathname.startsWith('/coach/log-session/success')) { 
      router.push('/login');
    }
  }, [role, isRoleLoading, pathname, router]);


  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = () => {
    setRole(null);
    router.push('/login');
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.roles.includes(role)) {
      return !item.disabled; 
    }
    return item.roles.includes(role) && !item.disabled;
  });


  if (!isMounted || (isRoleLoading && pathname !== '/coach/log-session/success')) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 p-4 border-r">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full mb-2" />
            ))}
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!role && pathname !== '/login' && !pathname.startsWith('/coach/log-session/success')) {
    return null; 
  }


  return (
    <SidebarProvider defaultOpen collapsible="icon">
      <Sidebar side="left" variant="sidebar" className="border-r shadow-light">
        <SidebarHeader>
          <AppLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {filteredNavItems.map((item) => (
               <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    className={`font-medium`}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="font-medium" tooltip="Logout">
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-background/80 backdrop-blur-sm border-b shadow-light sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
          </div>

          <div className="flex items-center gap-4">
            {role === 'admin' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="stripe-test-mode"
                  checked={isStripeTestMode}
                  onCheckedChange={setIsStripeTestMode}
                  className={isStripeTestMode ? 'animate-glow-pulse' : ''}
                  aria-label="Stripe Test Mode"
                />
                <Label htmlFor="stripe-test-mode" className="text-xs font-light uppercase text-muted-foreground">
                  Stripe Test
                </Label>
              </div>
            )}

            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=${role ? role.charAt(0).toUpperCase() : 'U'}`} alt={role ?? 'User'} data-ai-hint="user avatar" />
                    <AvatarFallback>{role ? role.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none font-headline">SessionSync User</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {role ? `${role.charAt(0).toUpperCase() + role.slice(1)} Account` : 'No Role'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 overflow-auto sm:p-6 bg-background">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
