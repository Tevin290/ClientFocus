
'use server';

import Stripe from 'stripe';
import { headers } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStripeSecretKey } from './stripe';

/**
 * Creates a Stripe Connect onboarding link for a company.
 * Creates a new Stripe Express account if one doesn't exist.
 */
export async function createConnectAccountLink(
    companyId: string, 
    companyName: string,
    mode: 'test' | 'live',
    stripeAccountId?: string
): Promise<{ url: string | null; newAccountId?: string; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20', typescript: true });
    
    let finalStripeAccountId = stripeAccountId;
    let newAccountId: string | undefined = undefined;

    if (!finalStripeAccountId) {
      console.log(`[Stripe Service] No stripeAccountId provided for company ${companyId}. Creating a new one.`);
      const account = await stripe.accounts.create({
        type: 'express',
        company: { name: companyName },
        business_type: 'company',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      finalStripeAccountId = account.id;
      newAccountId = account.id;
    }

    if (!finalStripeAccountId) {
        throw new Error('Could not create or find a Stripe Account ID.');
    }

    const accountLink = await stripe.accountLinks.create({
      account: finalStripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/stripe/connect/return`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url, newAccountId };

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
  existingStripeCustomerId: string | undefined,
  mode: 'test' | 'live'
): Promise<{ url: string | null; newStripeCustomerId?: string; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20', typescript: true });

    let stripeCustomerId = existingStripeCustomerId;
    let newStripeCustomerId: string | undefined = undefined;

    // Create a Stripe Customer if one doesn't exist for this client in the connected account
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: clientEmail,
        description: `Client ${clientId} for company ${companyId}`,
      }, {
        stripeAccount: stripeAccountId,
      });
      stripeCustomerId = customer.id;
      newStripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'setup',
        customer: stripeCustomerId,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/settings?payment_setup_success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/settings?payment_setup_cancelled=true`,
    }, {
        stripeAccount: stripeAccountId,
    });

    return { url: session.url, newStripeCustomerId };

  } catch (error: any) {
    console.error('[Stripe Service] Error creating Checkout setup session:', error);
    return { url: null, error: error.message || 'Failed to create payment setup session.' };
  }
}
