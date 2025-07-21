/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getStripeSecretKey } from '@/lib/stripe';
import { updateCompanyProfile } from '@/lib/firestoreService';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth error
  if (error) {
    console.error('[Stripe OAuth] Error:', error, errorDescription);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?error=Invalid callback parameters`
    );
  }

  try {
    // Parse state to get company ID and mode
    const [companyId, mode] = state.split(':');
    if (!companyId || !mode || !['test', 'live'].includes(mode)) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for access token
    const secretKey = getStripeSecretKey(mode as 'test' | 'live');
    const stripe = new Stripe(secretKey, { apiVersion: '2025-06-30.basil', typescript: true });

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const { stripe_user_id } = response;

    // Update company profile with Stripe account information
    const fieldSuffix = mode === 'test' ? '_test' : '_live';
    console.log(`[Stripe OAuth] Updating company ${companyId} with Stripe account ${stripe_user_id} in ${mode} mode`);
    await updateCompanyProfile(companyId, {
      [`stripeAccountId${fieldSuffix}`]: stripe_user_id,
      [`stripeAccountOnboarded${fieldSuffix}`]: true,
    });

    console.log(`[Stripe OAuth] Successfully connected company ${companyId} with account ${stripe_user_id} in ${mode} mode`);

    // Redirect to billing page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=stripe_connected&mode=${mode}`
    );

  } catch (error: any) {
    console.error('[Stripe OAuth] Error processing callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?error=${encodeURIComponent(error.message || 'OAuth callback failed')}`
    );
  }
}