'use client';

let cachedMode: 'test' | 'live' | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

// This is a client-callable function to safely get the mode from server with fallback to localStorage
export function getStripeMode(): 'test' | 'live' {
    if (typeof window !== 'undefined') {
        try {
            // Check localStorage first for immediate response
            const mode = localStorage.getItem('stripe_test_mode');
            const defaultMode = process.env.NODE_ENV === 'production' ? 'live' : 'test';
            return mode === null ? defaultMode : (mode === 'false' ? 'live' : 'test');
        } catch (error) {
            console.warn('[Stripe] localStorage access failed, falling back to environment default:', error);
            return process.env.NODE_ENV === 'production' ? 'live' : 'test';
        }
    }
    // Server-side: use production environment to determine default
    return process.env.NODE_ENV === 'production' ? 'live' : 'test';
}

// Async function to get the mode from server and sync to localStorage
export async function getStripeModeFromServer(): Promise<'test' | 'live'> {
    // Return cached mode if still fresh
    if (cachedMode && (Date.now() - lastFetchTime) < CACHE_DURATION) {
        return cachedMode;
    }

    try {
        const response = await fetch('/api/settings/stripe-mode');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const serverMode = data.stripeMode as 'test' | 'live';
        
        // Update cache
        cachedMode = serverMode;
        lastFetchTime = Date.now();
        
        // Sync to localStorage for immediate access
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('stripe_test_mode', String(serverMode === 'test'));
                console.log(`[Stripe] Mode synced from server: ${serverMode}`);
            } catch (error) {
                console.warn('[Stripe] Failed to sync mode to localStorage:', error);
            }
        }
        
        return serverMode;
    } catch (error) {
        console.error('[Stripe] Failed to fetch mode from server, falling back to localStorage:', error);
        return getStripeMode(); // Fallback to localStorage
    }
}

// This is a client-callable function to safely set the mode via server API
export async function setStripeMode(mode: 'test' | 'live', userUid: string): Promise<boolean> {
    try {
        const response = await fetch('/api/settings/stripe-mode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ stripeMode: mode, userUid }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Update cache and localStorage on success
        cachedMode = mode;
        lastFetchTime = Date.now();
        
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('stripe_test_mode', String(mode === 'test'));
                console.log(`[Stripe] Mode updated to ${mode} via server`);
            } catch (error) {
                console.warn('[Stripe] Failed to sync mode to localStorage:', error);
            }
        }
        
        return true;
    } catch (error) {
        console.error('[Stripe] Failed to set mode via server:', error);
        throw error;
    }
}

// Legacy function for backward compatibility - now just updates localStorage
export function setStripeModeLocal(mode: 'test' | 'live') {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('stripe_test_mode', String(mode === 'test'));
            console.log(`[Stripe] Mode set locally to ${mode}`);
        } catch (error) {
            console.error('[Stripe] Failed to save mode to localStorage:', error);
        }
    }
}
