# Custom Onboarding System

A world-class, custom-built onboarding system with beautiful UI/UX, smooth animations, and advanced features.

## Features

✨ **World-Class UI/UX**
- Beautiful gradient backgrounds with animated effects
- Smooth transitions and micro-interactions
- Responsive design that works on all devices
- Dark mode support
- Accessibility features built-in

🎯 **Advanced Functionality**
- Auto-scroll to target elements
- Keyboard navigation support
- Progress tracking with visual indicators
- Role-based onboarding tours
- Persistent completion state
- Custom actions per step

⌨️ **Keyboard Shortcuts**
- `→` or `Enter` or `Space` - Next step
- `←` - Previous step
- `Esc` - Close tour
- `Ctrl+S` - Skip tour

## Usage

### 1. Basic Setup

The onboarding system is already integrated into your app through the `OnboardingProvider` in your context.

```tsx
import { useOnboarding } from '@/context/onboarding-context';

function MyComponent() {
  const { startTour, addSteps } = useOnboarding();
  
  // Add your steps
  useEffect(() => {
    addSteps('my-tour', [
      {
        id: 'step1',
        target: '[data-onboarding="welcome"]',
        title: 'Welcome!',
        content: 'This is your first step.',
        placement: 'bottom'
      }
    ]);
  }, []);
  
  return (
    <div>
      <div data-onboarding="welcome">Welcome content</div>
      <button onClick={() => startTour('my-tour')}>
        Start Tour
      </button>
    </div>
  );
}
```

### 2. Adding Data Attributes

Add `data-onboarding` attributes to elements you want to highlight:

```tsx
<button data-onboarding="submit-button">Submit</button>
<nav data-onboarding="sidebar">Navigation</nav>
<div data-onboarding="dashboard">Dashboard content</div>
```

### 3. Creating Onboarding Steps

```tsx
import { OnboardingStep } from '@/context/onboarding-context';

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    target: '[data-onboarding="welcome"]',
    title: 'Welcome to the App!',
    content: 'This is where your journey begins. Let\'s explore the features together.',
    placement: 'bottom',
    showArrow: true,
  },
  {
    id: 'navigation',
    target: '[data-onboarding="nav"]',
    title: 'Navigation Menu',
    content: 'Use this menu to navigate between different sections of the app.',
    placement: 'right',
    showArrow: true,
    action: () => {
      // Optional: Execute custom action when step is shown
      console.log('Navigation step shown');
    }
  },
  {
    id: 'dashboard',
    target: '[data-onboarding="dashboard"]',
    title: 'Your Dashboard',
    content: 'Here you can see an overview of all your important information.',
    placement: 'top',
    showArrow: true,
  }
];
```

### 4. Step Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for the step |
| `target` | string | CSS selector for the target element |
| `title` | string | Step title displayed in the tooltip |
| `content` | string | Step content/description |
| `placement` | 'top' \| 'bottom' \| 'left' \| 'right' | Tooltip placement relative to target |
| `showArrow` | boolean | Whether to show arrow pointing to target |
| `disableBeacon` | boolean | Disable the animated beacon (not implemented yet) |
| `optional` | boolean | Mark step as optional (not implemented yet) |
| `action` | () => void | Custom function to execute when step is shown |

### 5. Context Methods

```tsx
const {
  startTour,      // Start a specific tour
  addSteps,       // Add steps to a tour
  isRunning,      // Check if tour is currently running
  currentTour,    // Get current tour name
  currentStepIndex, // Get current step index
  nextStep,       // Go to next step
  prevStep,       // Go to previous step
  skipTour,       // Skip the entire tour
  closeTour       // Close the tour
} = useOnboarding();
```

### 6. Auto-Start Tours

Tours automatically start based on user roles:
- Admin users: `admin-dashboard` tour
- Coach users: `coach-dashboard` tour  
- Client users: `client-dashboard` tour

### 7. Persistent State

The system remembers completed tours using localStorage:
- Key format: `onboarding_${tourKey}_${userId}`
- Tours won't restart if already completed
- Clear localStorage to reset onboarding state

### 8. Example Implementation

```tsx
// In your page component
import { useOnboarding } from '@/context/onboarding-context';
import { useEffect } from 'react';

const DashboardPage = () => {
  const { addSteps } = useOnboarding();
  
  useEffect(() => {
    // Define your onboarding steps
    const dashboardSteps = [
      {
        id: 'header',
        target: '[data-onboarding="header"]',
        title: 'Welcome to Your Dashboard',
        content: 'This is your main dashboard where you can access all features.',
        placement: 'bottom'
      },
      {
        id: 'sidebar',
        target: '[data-onboarding="sidebar"]',
        title: 'Navigation Sidebar',
        content: 'Use this sidebar to navigate between different sections.',
        placement: 'right'
      },
      {
        id: 'main-content',
        target: '[data-onboarding="main-content"]',
        title: 'Main Content Area',
        content: 'Your main content and data will be displayed here.',
        placement: 'top'
      }
    ];
    
    addSteps('dashboard-tour', dashboardSteps);
  }, [addSteps]);
  
  return (
    <div>
      <header data-onboarding="header">
        <h1>Dashboard</h1>
      </header>
      
      <nav data-onboarding="sidebar">
        <ul>
          <li>Home</li>
          <li>Settings</li>
          <li>Profile</li>
        </ul>
      </nav>
      
      <main data-onboarding="main-content">
        <p>Your dashboard content here...</p>
      </main>
    </div>
  );
};
```

## Styling

The system includes beautiful CSS animations and styles in `src/styles/onboarding.css`:

- Smooth fade-in animations
- Gradient backgrounds
- Pulsing spotlight effects
- Responsive design
- Dark mode support
- Accessibility features

## Best Practices

1. **Use descriptive data attributes**: `data-onboarding="user-profile-section"`
2. **Keep step content concise**: Aim for 1-2 sentences per step
3. **Use appropriate placement**: Consider element position and viewport
4. **Add custom actions sparingly**: Only when necessary for UX
5. **Test keyboard navigation**: Ensure all shortcuts work properly
6. **Consider mobile users**: Test on different screen sizes

## Advanced Features

### Custom Actions
Execute custom code when a step is shown:

```tsx
{
  id: 'special-step',
  target: '[data-onboarding="special"]',
  title: 'Special Feature',
  content: 'This step will trigger a custom action.',
  action: () => {
    // Custom logic here
    analytics.track('onboarding_special_step_viewed');
    highlightElement('.special-element');
  }
}
```

### Dynamic Tours
Create tours based on user data or app state:

```tsx
const createDynamicTour = (userRole: string, features: string[]) => {
  const steps = [
    {
      id: 'welcome',
      target: '[data-onboarding="welcome"]',
      title: `Welcome, ${userRole}!`,
      content: `Let's explore the features available to you.`,
      placement: 'bottom'
    }
  ];
  
  // Add feature-specific steps
  features.forEach(feature => {
    steps.push({
      id: feature,
      target: `[data-onboarding="${feature}"]`,
      title: `${feature} Feature`,
      content: `Learn about the ${feature} feature.`,
      placement: 'bottom'
    });
  });
  
  return steps;
};
```

## Troubleshooting

### Common Issues

1. **Target element not found**: Make sure the element exists in the DOM before starting the tour
2. **Tour not starting**: Check that steps are added before calling `startTour`
3. **Positioning issues**: Ensure target elements are visible and properly positioned
4. **Keyboard shortcuts not working**: Check for conflicting event handlers

### Debugging

```tsx
// Debug current tour state
const { currentTour, currentStepIndex, isRunning } = useOnboarding();
console.log('Current tour:', currentTour);
console.log('Step index:', currentStepIndex);
console.log('Is running:', isRunning);
```

This custom onboarding system provides a superior user experience compared to traditional libraries, with full control over styling, behavior, and functionality.
