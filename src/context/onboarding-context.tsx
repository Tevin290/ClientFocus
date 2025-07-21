'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRole } from './role-context';
import { X, ChevronLeft, ChevronRight, Sparkles, Target } from 'lucide-react';
import '../styles/onboarding.css';

export interface OnboardingStep {
  id: string;
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showArrow?: boolean;
  disableBeacon?: boolean;
  optional?: boolean;
  action?: () => void;
}

interface OnboardingContextType {
  startTour: (tourKey: string) => void;
  addSteps: (tourKey: string, steps: OnboardingStep[]) => void;
  isRunning: boolean;
  currentTour: string | null;
  currentStepIndex: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  closeTour: () => void;
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
  const { user } = useRole();
  const [isRunning, setIsRunning] = useState(false);
  const [currentTour, setCurrentTour] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [tourData, setTourData] = useState<Record<string, OnboardingStep[]>>({});
  const [isMounted, setIsMounted] = useState(false);

  // Check if user has completed onboarding
  const getOnboardingKey = useCallback((tourKey: string) => `onboarding_${tourKey}_${user?.uid}`, [user?.uid]);

  const hasCompletedTour = useCallback((tourKey: string) => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(getOnboardingKey(tourKey)) === 'completed';
  }, [getOnboardingKey]);

  const markTourCompleted = useCallback((tourKey: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getOnboardingKey(tourKey), 'completed');
  }, [getOnboardingKey]);

  const startTour = useCallback((tourKey: string) => {
    if (hasCompletedTour(tourKey)) return;
    
    const tourSteps = tourData[tourKey];
    if (!tourSteps || tourSteps.length === 0) return;

    setCurrentTour(tourKey);
    setSteps(tourSteps);
    setCurrentStepIndex(0);
    setIsRunning(true);
  }, [tourData, hasCompletedTour]);

  const closeTour = useCallback(() => {
    if (currentTour) {
      markTourCompleted(currentTour);
    }
    setIsRunning(false);
    setCurrentTour(null);
    setCurrentStepIndex(0);
  }, [currentTour, markTourCompleted]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      closeTour();
    }
  }, [currentStepIndex, steps.length, closeTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    if (currentTour) {
      markTourCompleted(currentTour);
    }
    setIsRunning(false);
    setCurrentTour(null);
    setCurrentStepIndex(0);
  }, [currentTour, markTourCompleted]);

  const addSteps = useCallback((tourKey: string, newSteps: OnboardingStep[]) => {
    setTourData(prev => ({
      ...prev,
      [tourKey]: newSteps
    }));
  }, []);

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-start role-based tours for first-time users (disabled to prevent infinite loops)
  /*
  useEffect(() => {
    if (!user || !role || !isMounted || hasTriedAutoStart) return;

    const autoStartTours = () => {
      let tourKey = '';
      switch (role) {
        case 'admin':
          tourKey = 'admin-dashboard';
          break;
        case 'coach':
          tourKey = 'coach-dashboard';
          break;
        case 'client':
          tourKey = 'client-dashboard';
          break;
      }
      
      if (tourKey) {
        startTour(tourKey);
        setHasTriedAutoStart(true);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(autoStartTours, 1000);
    return () => clearTimeout(timer);
  }, [user, role, isMounted, hasTriedAutoStart, startTour]);
  */

  return (
    <OnboardingContext.Provider value={{
      startTour,
      addSteps,
      isRunning,
      currentTour,
      currentStepIndex,
      nextStep,
      prevStep,
      skipTour,
      closeTour
    }}>
      {children}
      {isMounted && isRunning && steps.length > 0 && (
        <OnboardingTooltip 
          step={steps[currentStepIndex]}
          stepIndex={currentStepIndex}
          totalSteps={steps.length}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          onClose={closeTour}
        />
      )}
    </OnboardingContext.Provider>
  );
};

// Enhanced useTooltipPosition hook with auto-scroll
const useTooltipPosition = (targetSelector: string) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) {
        setIsVisible(false);
        return;
      }

      // Auto-scroll to target element
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center', 
        inline: 'center' 
      });

      // Wait for scroll to complete
      setTimeout(() => {
        const rect = targetElement.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        setPosition({
          top: rect.top + scrollY,
          left: rect.left + scrollX,
          width: rect.width,
          height: rect.height
        });
        setIsVisible(true);
      }, 300);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [targetSelector]);

  return { position, isVisible };
};

// Keyboard navigation hook
const useKeyboardNavigation = (
  onNext: () => void,
  onPrev: () => void,
  onSkip: () => void,
  onClose: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'Enter':
        case ' ':
          event.preventDefault();
          onNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onPrev();
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 's':
        case 'S':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onSkip();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onSkip, onClose]);
};

// Spotlight Component
const OnboardingSpotlight: React.FC<{ 
  target: { top: number; left: number; width: number; height: number } 
}> = ({ target }) => {
  if (!target) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] onboarding-backdrop">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-all duration-700"
        style={{
          clipPath: `polygon(
            0% 0%, 0% 100%, 
            ${target.left}px 100%, 
            ${target.left}px ${target.top}px, 
            ${target.left + target.width}px ${target.top}px, 
            ${target.left + target.width}px ${target.top + target.height}px, 
            ${target.left}px ${target.top + target.height}px, 
            ${target.left}px 100%, 
            100% 100%, 100% 0%
          )`
        }}
      />
      {/* Animated ring around target */}
      <div
        className="absolute rounded-lg border-2 border-blue-400 onboarding-spotlight-ring onboarding-glow"
        style={{
          top: target.top - 4,
          left: target.left - 4,
          width: target.width + 8,
          height: target.height + 8,
        }}
      />
      {/* Pulsing background highlight */}
      <div
        className="absolute rounded-lg bg-blue-400/10 animate-pulse"
        style={{
          top: target.top - 8,
          left: target.left - 8,
          width: target.width + 16,
          height: target.height + 16,
        }}
      />
    </div>
  );
};

// Main Tooltip Component
const OnboardingTooltip: React.FC<{
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
}> = ({ step, stepIndex, totalSteps, onNext, onPrev, onSkip, onClose }) => {
  const { position, isVisible } = useTooltipPosition(step.target);
  const [isAnimating, setIsAnimating] = useState(false);

  // Add keyboard navigation
  useKeyboardNavigation(onNext, onPrev, onSkip, onClose);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  if (!isVisible) return null;

  const getTooltipPosition = () => {
    const placement = step.placement || 'bottom';
    const tooltipWidth = 400;
    const tooltipHeight = 200;
    const offset = 20;

    switch (placement) {
      case 'top':
        return {
          top: position.top - tooltipHeight - offset,
          left: position.left + (position.width / 2) - (tooltipWidth / 2),
        };
      case 'bottom':
        return {
          top: position.top + position.height + offset,
          left: position.left + (position.width / 2) - (tooltipWidth / 2),
        };
      case 'left':
        return {
          top: position.top + (position.height / 2) - (tooltipHeight / 2),
          left: position.left - tooltipWidth - offset,
        };
      case 'right':
        return {
          top: position.top + (position.height / 2) - (tooltipHeight / 2),
          left: position.left + position.width + offset,
        };
      default:
        return {
          top: position.top + position.height + offset,
          left: position.left + (position.width / 2) - (tooltipWidth / 2),
        };
    }
  };

  const tooltipPos = getTooltipPosition();

  return (
    <>
      <OnboardingSpotlight target={position} />
      
      <div
        className={`fixed z-[9999] onboarding-tooltip transition-all duration-500 ${
          isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{
          top: Math.max(20, tooltipPos.top),
          left: Math.max(20, Math.min(window.innerWidth - 420, tooltipPos.left)),
          maxWidth: '400px',
        }}
      >
        {/* Arrow */}
        <div className="relative">
          {step.showArrow !== false && (
            <div
              className={`absolute w-0 h-0 filter drop-shadow-lg ${
                step.placement === 'top' ? 'border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white -top-2'
                : step.placement === 'left' ? 'border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white -right-2 top-1/2 transform -translate-y-1/2'
                : step.placement === 'right' ? 'border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white -left-2 top-1/2 transform -translate-y-1/2'
                : 'border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white -bottom-2'
              }`}
              style={{
                left: step.placement === 'left' || step.placement === 'right' ? undefined : '50%',
                transform: step.placement === 'left' || step.placement === 'right' ? undefined : 'translateX(-50%)',
              }}
            />
          )}
          
          {/* Tooltip Content */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 px-6 py-5 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 transition-opacity duration-300 hover:opacity-100"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1 bg-white/20 rounded-full">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="onboarding-progress bg-white rounded-full h-2 shadow-sm"
                    style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                  />
                </div>
                
                <div className="mt-3 flex justify-between items-center text-sm text-white/90">
                  <span className="font-medium">Step {stepIndex + 1} of {totalSteps}</span>
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                    <Target className="w-3 h-3" />
                    Getting Started
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 bg-gradient-to-b from-white to-gray-50">
              <p className="text-gray-700 text-base leading-relaxed mb-6 font-medium">
                {step.content}
              </p>

              {/* Keyboard Shortcuts Hint */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-600 font-medium mb-1">Keyboard Shortcuts:</div>
                <div className="text-xs text-blue-500 space-y-1">
                  <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">→</kbd> or <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Enter</kbd> - Next</div>
                  <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">←</kbd> - Previous</div>
                  <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Esc</kbd> - Close</div>
                  <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded text-xs">Ctrl+S</kbd> - Skip Tour</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <button
                    onClick={onPrev}
                    disabled={stepIndex === 0}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  
                  <button
                    onClick={onSkip}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-all duration-200 hover:bg-gray-100 rounded-lg"
                  >
                    Skip Tour
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (step.action) step.action();
                    onNext();
                  }}
                  className="onboarding-button flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg font-medium"
                >
                  {stepIndex === totalSteps - 1 ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Finish
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};