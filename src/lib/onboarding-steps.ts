import { OnboardingStep } from '../context/onboarding-context';

// Example onboarding steps for admin dashboard
export const adminDashboardSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="welcome"]',
    title: 'Welcome to ClientFocus!',
    content: 'Welcome to your admin dashboard! This is where you can manage your entire coaching platform. Let\'s take a quick tour to get you started.',
    placement: 'bottom',
    showArrow: true,
  },
  {
    id: 'sidebar',
    target: '[data-onboarding="sidebar"]',
    title: 'Navigation Sidebar',
    content: 'Use this sidebar to navigate between different sections of your admin panel. You can manage users, companies, billing, and more.',
    placement: 'right',
    showArrow: true,
  },
  {
    id: 'user-management',
    target: '[data-onboarding="user-management"]',
    title: 'User Management',
    content: 'Here you can view and manage all users in your system - coaches, clients, and other admins. You can edit profiles, assign roles, and monitor activity.',
    placement: 'bottom',
    showArrow: true,
  },
  {
    id: 'analytics',
    target: '[data-onboarding="analytics"]',
    title: 'Analytics Dashboard',
    content: 'Monitor your platform\'s performance with detailed analytics. Track user engagement, session statistics, and revenue metrics.',
    placement: 'left',
    showArrow: true,
  },
  {
    id: 'billing',
    target: '[data-onboarding="billing"]',
    title: 'Billing & Subscriptions',
    content: 'Manage subscriptions, process payments, and view financial reports. Connect with Stripe for seamless payment processing.',
    placement: 'bottom',
    showArrow: true,
  },
  {
    id: 'settings',
    target: '[data-onboarding="settings"]',
    title: 'Platform Settings',
    content: 'Configure your platform settings, customize branding, and manage system preferences from here.',
    placement: 'left',
    showArrow: true,
  },
];

// Example onboarding steps for coach dashboard
export const coachDashboardSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="coach-welcome"]',
    title: 'Welcome, Coach!',
    content: 'Welcome to your coaching dashboard! This is your central hub for managing clients, scheduling sessions, and tracking progress.',
    placement: 'bottom',
    showArrow: true,
  },
  {
    id: 'my-clients',
    target: '[data-onboarding="my-clients"]',
    title: 'My Clients',
    content: 'View all your clients here. You can see their progress, upcoming sessions, and detailed profiles.',
    placement: 'bottom',
    showArrow: true,
  },
  {
    id: 'schedule-session',
    target: '[data-onboarding="schedule-session"]',
    title: 'Schedule Sessions',
    content: 'Easily schedule new coaching sessions with your clients. Set dates, times, and session types.',
    placement: 'right',
    showArrow: true,
  },
  {
    id: 'session-notes',
    target: '[data-onboarding="session-notes"]',
    title: 'Session Notes',
    content: 'Document your coaching sessions with detailed notes. Track client progress and set action items.',
    placement: 'left',
    showArrow: true,
  },
  {
    id: 'calendar',
    target: '[data-onboarding="calendar"]',
    title: 'Calendar View',
    content: 'View your coaching schedule in a convenient calendar format. See upcoming sessions and availability.',
    placement: 'top',
    showArrow: true,
  },
];

// Example onboarding steps for client dashboard
export const clientDashboardSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="client-welcome"]',
    title: 'Welcome to Your Journey!',
    content: 'Welcome to your personal coaching dashboard! This is where you\'ll track your progress and connect with your coach.',
    placement: 'bottom',
    showArrow: true,
  },
  {
    id: 'next-session',
    target: '[data-onboarding="next-session"]',
    title: 'Your Next Session',
    content: 'See details about your upcoming coaching session. Join video calls and view session materials here.',
    placement: 'bottom',
    showArrow: true,
  },
  {
    id: 'progress-tracking',
    target: '[data-onboarding="progress-tracking"]',
    title: 'Progress Tracking',
    content: 'Monitor your coaching progress with visual charts and metrics. See how you\'re improving over time.',
    placement: 'right',
    showArrow: true,
  },
  {
    id: 'session-history',
    target: '[data-onboarding="session-history"]',
    title: 'Session History',
    content: 'Review past coaching sessions, notes, and action items. Track your journey and reflect on your growth.',
    placement: 'left',
    showArrow: true,
  },
  {
    id: 'goals',
    target: '[data-onboarding="goals"]',
    title: 'Your Goals',
    content: 'Set and track your personal goals. Work with your coach to define objectives and measure success.',
    placement: 'top',
    showArrow: true,
  },
];

// Utility function to initialize onboarding for a specific role
export const initializeOnboarding = (role: string, addSteps: (tourKey: string, steps: OnboardingStep[]) => void) => {
  switch (role) {
    case 'admin':
      addSteps('admin-dashboard', adminDashboardSteps);
      break;
    case 'coach':
      addSteps('coach-dashboard', coachDashboardSteps);
      break;
    case 'client':
      addSteps('client-dashboard', clientDashboardSteps);
      break;
    default:
      console.warn(`Unknown role: ${role}`);
  }
};
