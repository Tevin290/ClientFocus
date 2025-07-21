'use client';

// This is a client-callable function to safely get the mode from localStorage
export function getStripeMode(): 'test' | 'live' {
    if (typeof window !== 'undefined') {
        try {
            const mode = localStorage.getItem('stripe_test_mode');
            // In production, default to live mode; in development, default to test
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

// This is a client-callable function to safely set the mode in localStorage
export function setStripeMode(mode: 'test' | 'live') {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('stripe_test_mode', String(mode === 'test'));
            console.log(`[Stripe] Mode set to ${mode}`);
        } catch (error) {
            console.error('[Stripe] Failed to save mode to localStorage:', error);
            // In incognito mode or when localStorage is disabled, this will fail silently
            // The app will continue to work using environment defaults
        }
    }
}
