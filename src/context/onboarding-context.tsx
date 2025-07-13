'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { useRole } from './role-context';

interface OnboardingContextType {
  startTour: (tourKey: string) => void;
  addSteps: (tourKey: string, steps: Step[]) => void;
  isRunning: boolean;
  currentTour: string | null;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user, role } = useRole();
  const [isRunning, setIsRunning] = useState(false);
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [tourData, setTourData] = useState<Record<string, Step[]>>({});
  const [isMounted, setIsMounted] = useState(false);

  // Check if user has completed onboarding
  const getOnboardingKey = (tourKey: string) => `onboarding_${tourKey}_${user?.uid}`;

  const hasCompletedTour = (tourKey: string) => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(getOnboardingKey(tourKey)) === 'completed';
  };

  const markTourCompleted = (tourKey: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getOnboardingKey(tourKey), 'completed');
  };

  const startTour = (tourKey: string) => {
    if (hasCompletedTour(tourKey)) return;
    
    const tourSteps = tourData[tourKey];
    if (!tourSteps || tourSteps.length === 0) return;

    setCurrentTour(tourKey);
    setSteps(tourSteps);
    setIsRunning(true);
  };

  const addSteps = (tourKey: string, newSteps: Step[]) => {
    setTourData(prev => ({
      ...prev,
      [tourKey]: newSteps
    }));
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setIsRunning(false);
      if (currentTour) {
        markTourCompleted(currentTour);
      }
      setCurrentTour(null);
    }
  };

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-start role-based tours for first-time users
  useEffect(() => {
    if (!user || !role || !isMounted) return;

    const autoStartTours = () => {
      switch (role) {
        case 'admin':
          startTour('admin-dashboard');
          break;
        case 'coach':
          startTour('coach-dashboard');
          break;
        case 'client':
          startTour('client-dashboard');
          break;
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(autoStartTours, 1000);
    return () => clearTimeout(timer);
  }, [user, role, isMounted]);

  return (
    <OnboardingContext.Provider value={{
      startTour,
      addSteps,
      isRunning,
      currentTour
    }}>
      {children}
      {isMounted && (
        <Joyride
          steps={steps}
          run={isRunning}
          continuous
          showProgress
          showSkipButton
          callback={handleJoyrideCallback}
          styles={{
            options: {
              primaryColor: '#3b82f6',
              textColor: '#1f2937',
              backgroundColor: '#ffffff',
              overlayColor: 'rgba(0, 0, 0, 0.4)',
              arrowColor: '#ffffff',
              zIndex: 1000,
            },
            tooltip: {
              fontSize: '16px',
              padding: '20px',
            },
            buttonNext: {
              backgroundColor: '#3b82f6',
              fontSize: '14px',
              padding: '8px 16px',
            },
            buttonSkip: {
              color: '#6b7280',
              fontSize: '14px',
            },
          }}
          locale={{
            back: 'Back',
            close: 'Close',
            last: 'Finish',
            next: 'Next',
            skip: 'Skip tour',
          }}
        />
      )}
    </OnboardingContext.Provider>
  );
};