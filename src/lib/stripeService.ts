
'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getCompanyProfile, updateCompanyProfile, updateUserProfile } from './firestoreService';

function getStripeSecretKey(mode: 'test' | 'live'): string {
    const key = mode === 'test' 
        ? process.env.STRIPE_SECRET_KEY_TEST 
        : process.env.STRIPE_SECRET_KEY_LIVE;

    if (!key) {
        throw new Error(`Stripe secret key for ${mode} mode is not set in environment variables.`);
    }
    return key;
}

export const stripe = new Stripe(getStripeSecretKey('live'), {
  apiVersion: '2024-06-20',
  typescript: true,
});

/**
 * Creates a Stripe Connect onboarding link for a company.
 * Creates a new Stripe Express account if one doesn't exist.
 */
export async function createConnectAccountLink(
    companyId: string, 
    companyName: string,
    mode: 'test' | 'live'
): Promise<{ url: string | null; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    let companyProfile = await getCompanyProfile(companyId);
    if (!companyProfile) {
      throw new Error('Company profile not found.');
    }

    let { stripeAccountId } = companyProfile;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        company: { name: companyName },
        business_type: 'company',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      }, { apiKey: secretKey });
      stripeAccountId = account.id;
      await updateCompanyProfile(companyId, { stripeAccountId });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/stripe/connect/return`,
      type: 'account_onboarding',
    }, { apiKey: secretKey });

    return { url: accountLink.url };

  } catch (error: any) {
    console.error('[Stripe Service] Error creating Connect account link:', error);
    return { url: null, error: error.message || 'Failed to create Stripe connection link.' };
  }
}


/**
 * Creates a Stripe Checkout Session for a client to set up their payment method.
 * This will create a Stripe Customer if one does not already exist.
 */
export async function createCheckoutSetupSession(
  companyId: string,
  stripeAccountId: string,
  clientId: string,
  clientEmail: string,
  mode: 'test' | 'live'
): Promise<{ url: string | null; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    const userRef = doc(db, 'users', clientId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error('Client user profile not found.');
    }

    let { stripeCustomerId } = userSnap.data();

    // Create a Stripe Customer if one doesn't exist for this client in the connected account
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: clientEmail,
        description: `Client ${clientId} for company ${companyId}`,
      }, {
        stripeAccount: stripeAccountId,
        apiKey: secretKey,
      });
      stripeCustomerId = customer.id;
      await updateUserProfile(clientId, { stripeCustomerId });
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'setup',
        customer: stripeCustomerId,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/settings?payment_setup_success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/settings?payment_setup_cancelled=true`,
    }, {
        stripeAccount: stripeAccountId,
        apiKey: secretKey,
    });

    return { url: session.url };

  } catch (error: any) {
    console.error('[Stripe Service] Error creating Checkout setup session:', error);
    return { url: null, error: error.message || 'Failed to create payment setup session.' };
  }
}

    