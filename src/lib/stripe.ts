import Stripe from 'stripe';

export function getStripeSecretKey(mode: 'test' | 'live'): string {
    const key = mode === 'test' 
        ? process.env.STRIPE_SECRET_KEY_TEST 
        : process.env.STRIPE_SECRET_KEY_LIVE;

    if (!key) {
        throw new Error(`Stripe secret key for ${mode} mode is not set in environment variables.`);
    }
    return key;
}

// This instance is primarily for the webhook handler, where the exact key for initialization
// is less important than the key provided to `constructEvent`.
// We'll initialize it with the live key as a default.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE || '', {
  apiVersion: '2024-06-20',
  typescript: true,
});
