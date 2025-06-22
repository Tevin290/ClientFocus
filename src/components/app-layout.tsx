
'use client';

import type { ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  BarChart3,
  LogOut,
  LayoutDashboard,
  Bell,
  Sun,
  Moon,
  LifeBuoy,
  CreditCard,
  History,
  FileText
} from 'lucide-react';
import { useRole, type UserRole } from '@/context/role-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';


interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin', 'super-admin'] },
  { href: '/admin/sessions', label: 'Session Review', icon: ClipboardList, roles: ['admin', 'super-admin'] },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard, roles: ['admin', 'super-admin'] },
  { href: '/admin/users', label: 'User Management', icon: Users, roles: ['admin', 'super-admin'], disabled: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, roles: ['admin', 'super-admin'] },
  
  { href: '/coach/dashboard', label: 'Coach Dashboard', icon: BarChart3, roles: ['coach'] },
  { href: '/coach/log-session', label: 'Log Session', icon: FileText, roles: ['coach'] },
  { href: '/coach/my-sessions', label: 'My Sessions', icon: History, roles: ['coach'] },
  { href: '/coach/my-clients', label: 'My Clients', icon: Users, roles: ['coach'] },

  { href: '/client/dashboard', label: 'Client Dashboard', icon: LayoutDashboard, roles: ['client'], disabled: false },
  { href: '/client/history', label: 'Session History', icon: History, roles: ['client'], disabled: false },
  { href: '/client/settings', label: 'Settings', icon: Settings, roles: ['client'], disabled: false },
];

const AppLogo = () => (
  <Link href="/" className="flex items-center gap-2 px-2 min-h-[4rem]">
    <LifeBuoy className="h-8 w-8 text-primary" />
    <h1 className="text-xl font-bold font-headline text-foreground">SessionSync</h1>
  </Link>
);

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, userProfile, isLoading: isRoleLoading, logout } = useRole(); // Use userProfile for display
  const router = useRouter(); 
  const [isStripeTestMode, setIsStripeTestMode] = useState(false); // This could come from Firestore appSettings later
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { toast } = useToast();

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    toast({ title: `Theme changed to ${newTheme}`});
  };

  const handleLogout = async () => {
    await logout(); // This now calls the logout from RoleContext which handles Firebase signOut
    // RoleContext will redirect to /login via onAuthStateChanged
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
  };

  const filteredNavItems = navItems.filter(item => {
    return role && item.roles.includes(role) && !item.disabled;
  });

  // --- Defensive User Display Logic ---
  let avatarFallback = 'U';
  let avatarAltText = 'User';
  let userDisplayName = 'SessionSync User';
  let userEmailLine: string = 'No Role';

  if (userProfile) {
      if (userProfile.displayName) {
          avatarFallback = userProfile.displayName.charAt(0).toUpperCase();
          avatarAltText = userProfile.displayName;
          userDisplayName = userProfile.displayName;
      }
      if (userProfile.email) {
          userEmailLine = userProfile.email;
      }
  } else if (role) {
      // Fallback to role info if profile is not yet available
      avatarFallback = role.charAt(0).toUpperCase();
      avatarAltText = role;
      userEmailLine = `${role.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Account`;
  }
  // --- End Defensive Logic ---

  if (isRoleLoading) {
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
  
  if (!role && pathname !== '/login' && !pathname.startsWith('/coach/log-session/success') && pathname !== '/signup') {
    return null; // Let RoleContext handle the redirect
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
                    isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))} // More robust active check
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
            {(role === 'admin' || role === 'super-admin') && (
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
                    <AvatarImage 
                      src={userProfile?.photoURL || `https://placehold.co/100x100.png?text=${avatarFallback}`} 
                      alt={avatarAltText}
                      data-ai-hint="user avatar" />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none font-headline">{userDisplayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                       {userEmailLine}
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
