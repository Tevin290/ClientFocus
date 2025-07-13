
'use server';

import Stripe from 'stripe';
import { getStripeSecretKey } from './stripe';

/**
 * Creates a Stripe Connect OAuth link for a company.
 * This allows companies to authorize via Stripe's OAuth flow.
 */
export async function createConnectOAuthLink(
    companyId: string,
    mode: 'test' | 'live'
): Promise<{ url: string | null; error?: string }> {
  try {
    const clientId = mode === 'test' 
      ? process.env.STRIPE_CONNECT_CLIENT_ID_TEST 
      : process.env.STRIPE_CONNECT_CLIENT_ID_LIVE;
    
    if (!clientId) {
      throw new Error(`Stripe Connect client ID for ${mode} mode is not configured.`);
    }

    const baseUrl = 'https://connect.stripe.com/oauth/authorize';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
      state: `${companyId}:${mode}`, // Pass company ID and mode in state
    });

    return { url: `${baseUrl}?${params.toString()}` };

  } catch (error: any) {
    console.error('[Stripe Service] Error creating Connect OAuth link:', error);
    return { url: null, error: error.message || 'Failed to create Stripe OAuth link.' };
  }
}

/**
 * Creates a Stripe Connect onboarding link for a company.
 * Creates a new Stripe Express account if one doesn't exist.
 */
export async function createConnectAccountLink(
    companyName: string,
    mode: 'test' | 'live',
    stripeAccountId?: string
): Promise<{ url: string | null; newAccountId?: string; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10', typescript: true });
    
    let finalStripeAccountId = stripeAccountId;
    let newAccountId: string | undefined = undefined;

    if (!finalStripeAccountId) {
      console.log(`[Stripe Service] No stripeAccountId provided. Creating a new one for company: ${companyName}.`);
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
    const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10', typescript: true });

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

/**
 * Creates a product in the connected Stripe account
 */
export async function createProduct(
  stripeAccountId: string,
  name: string,
  description: string,
  mode: 'test' | 'live'
): Promise<{ product: any | null; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10', typescript: true });

    const product = await stripe.products.create({
      name,
      description,
      type: 'service',
    }, {
      stripeAccount: stripeAccountId,
    });

    return { product };
  } catch (error: any) {
    console.error('[Stripe Service] Error creating product:', error);
    return { product: null, error: error.message || 'Failed to create product.' };
  }
}

/**
 * Creates a price for a product in the connected Stripe account
 */
export async function createPrice(
  stripeAccountId: string,
  productId: string,
  unitAmount: number,
  currency: string = 'usd',
  mode: 'test' | 'live'
): Promise<{ price: any | null; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10', typescript: true });

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: unitAmount,
      currency,
    }, {
      stripeAccount: stripeAccountId,
    });

    return { price };
  } catch (error: any) {
    console.error('[Stripe Service] Error creating price:', error);
    return { price: null, error: error.message || 'Failed to create price.' };
  }
}

/**
 * Gets all products for a connected Stripe account
 */
export async function getProducts(
  stripeAccountId: string,
  mode: 'test' | 'live'
): Promise<{ products: any[] | null; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10', typescript: true });

    const products = await stripe.products.list({
      limit: 100,
      active: true,
    }, {
      stripeAccount: stripeAccountId,
    });

    return { products: products.data };
  } catch (error: any) {
    console.error('[Stripe Service] Error fetching products:', error);
    return { products: null, error: error.message || 'Failed to fetch products.' };
  }
}

/**
 * Gets all prices for a connected Stripe account
 */
export async function getPrices(
  stripeAccountId: string,
  mode: 'test' | 'live'
): Promise<{ prices: any[] | null; error?: string }> {
  try {
    const secretKey = getStripeSecretKey(mode);
    const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10', typescript: true });

    const prices = await stripe.prices.list({
      limit: 100,
      active: true,
    }, {
      stripeAccount: stripeAccountId,
    });

    return { prices: prices.data };
  } catch (error: any) {
    console.error('[Stripe Service] Error fetching prices:', error);
    return { prices: null, error: error.message || 'Failed to fetch prices.' };
  }
}
