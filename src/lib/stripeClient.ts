'use client';

// This is a client-callable function to safely get the mode from localStorage
export function getStripeMode(): 'test' | 'live' {
    if (typeof window !== 'undefined') {
        const mode = localStorage.getItem('stripe_test_mode');
        return mode === 'false' ? 'live' : 'test'; // Default to test mode
    }
    return 'test'; // Server-side default
}

// This is a client-callable function to safely set the mode in localStorage
export function setStripeMode(mode: 'test' | 'live') {
    if (typeof window !== 'undefined') {
        localStorage.setItem('stripe_test_mode', String(mode === 'test'));
    }
}
