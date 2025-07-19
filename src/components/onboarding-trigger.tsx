import React from 'react';
import { useOnboarding } from '../context/onboarding-context';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';

interface OnboardingTriggerProps {
  tourKey: string;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const OnboardingTrigger: React.FC<OnboardingTriggerProps> = ({
  tourKey,
  children,
  className,
  variant = 'default',
  size = 'default',
}) => {
  const { startTour } = useOnboarding();

  const handleStartTour = () => {
    startTour(tourKey);
  };

  return (
    <Button
      onClick={handleStartTour}
      variant={variant}
      size={size}
      className={className}
    >
      {children || (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Start Tour
        </>
      )}
    </Button>
  );
};

export default OnboardingTrigger;
