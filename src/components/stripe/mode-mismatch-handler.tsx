'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TriangleAlert, RefreshCw } from 'lucide-react';
import { getStripeMode } from '@/lib/stripeClient';
import { useToast } from '@/hooks/use-toast';

interface ModeMismatchHandlerProps {
  accountMode: 'test' | 'live' | null;
  onModeSwitch?: () => void;
  className?: string;
}

export function ModeMismatchHandler({ 
  accountMode, 
  onModeSwitch,
  className = "" 
}: ModeMismatchHandlerProps) {
  const [currentMode, setCurrentMode] = useState<'test' | 'live'>('test');
  const [showMismatch, setShowMismatch] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const mode = getStripeMode();
    setCurrentMode(mode);
    
    // Check for mismatch
    if (accountMode && accountMode !== mode) {
      setShowMismatch(true);
    } else {
      setShowMismatch(false);
    }
  }, [accountMode]);

  const handleReconnect = () => {
    toast({
      title: 'Reconnection Required',
      description: `You need to reconnect your Stripe account in ${currentMode} mode. Please use the Connect button above.`,
      variant: 'default',
    });
    onModeSwitch?.();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!showMismatch) return null;

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <TriangleAlert className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Mode Mismatch Detected</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-amber-700">
          Your Stripe account is connected in <strong>{accountMode}</strong> mode, 
          but the platform is currently in <strong>{currentMode}</strong> mode.
        </p>
        <div className="flex space-x-2">
          <Button 
            onClick={handleReconnect}
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Reconnect in {currentMode} mode
          </Button>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Page
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}