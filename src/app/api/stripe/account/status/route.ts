import { NextRequest, NextResponse } from 'next/server';
import { getStripeSecretKey } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const mode = searchParams.get('mode');

  if (!accountId || !mode || !['test', 'live'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  try {
    const secretKey = getStripeSecretKey(mode as 'test' | 'live');
    const stripe = new Stripe(secretKey, { apiVersion: '2025-06-30.basil', typescript: true });

    const account = await stripe.accounts.retrieve(accountId);

    return NextResponse.json({
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted
    });

  } catch (error: any) {
    console.error('[Stripe Account Status] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}