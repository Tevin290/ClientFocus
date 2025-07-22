'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStripeModeFromServer, setStripeMode as setStripeModeAPI, getStripeMode } from '@/lib/stripeClient';
import { isFirebaseConfigured } from '@/lib/firebase';

export function useStripeMode() {
  const [stripeMode, setStripeModeState] = useState<'test' | 'live'>(getStripeMode());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripeModeRef = useRef(stripeMode);

  // Fetch initial mode from server
  useEffect(() => {
    let mounted = true;
    
    const fetchServerMode = async () => {
      try {
        setIsLoading(true);
        const serverMode = await getStripeModeFromServer();
        if (mounted) {
          setStripeModeState(serverMode);
          stripeModeRef.current = serverMode;
          setError(null);
        }
      } catch (err: any) {
        console.warn('[useStripeMode] Failed to fetch initial server mode:', err);
        
        // Don't show error for permission or network issues, just use localStorage fallback
        if (err?.message?.includes('permission') || 
            err?.message?.includes('fetch') || 
            err?.message?.includes('network')) {
          console.warn('[useStripeMode] Using localStorage fallback due to server error');
          // Keep the current localStorage-based mode
          if (mounted) {
            setError(null);
          }
        } else if (mounted) {
          setError('Failed to sync payment mode from server');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchServerMode();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Update ref whenever stripeMode changes
  useEffect(() => {
    stripeModeRef.current = stripeMode;
  }, [stripeMode]);

  // Polling approach to check for mode changes (disabled real-time listener due to Firebase issues)
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    // Poll for changes every 30 seconds instead of real-time listener
    const pollInterval = setInterval(async () => {
      try {
        const serverMode = await getStripeModeFromServer();
        if (serverMode !== stripeModeRef.current) {
          console.log(`[useStripeMode] Polling update: ${stripeModeRef.current} → ${serverMode}`);
          setStripeModeState(serverMode);
          stripeModeRef.current = serverMode;
          
          // Update localStorage for immediate access
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('stripe_test_mode', String(serverMode === 'test'));
            } catch (error) {
              console.warn('[useStripeMode] Failed to sync to localStorage:', error);
            }
          }
        }
      } catch (error) {
        // Silently ignore polling errors to avoid spamming console
        console.debug('[useStripeMode] Polling error (ignoring):', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, []); // Empty dependency array - only set up once

  // Function to update stripe mode
  const updateStripeMode = useCallback(async (newMode: 'test' | 'live', userUid: string) => {
    if (!userUid) {
      throw new Error('User UID is required to update payment mode');
    }

    setIsLoading(true);
    setError(null);

    try {
      await setStripeModeAPI(newMode, userUid);
      // The real-time listener will update the state automatically
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update payment mode');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to manually refresh mode from server
  const refreshMode = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const serverMode = await getStripeModeFromServer();
      setStripeModeState(serverMode);
      return serverMode;
    } catch (err: any) {
      setError(err.message || 'Failed to refresh payment mode');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    stripeMode,
    isLoading,
    error,
    updateStripeMode,
    refreshMode,
  };
}