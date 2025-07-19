/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateCompanyProfile } from '@/lib/firestoreService';

const relevantEvents = new Set([
  'account.updated',
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.paid',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'product.created',
  'price.created',
]);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = (await headers()).get('Stripe-Signature') as string;
  const webhookSecretTest = process.env.STRIPE_WEBHOOK_SECRET_TEST;
  const webhookSecretLive = process.env.STRIPE_WEBHOOK_SECRET_LIVE;

  if (!webhookSecretTest || !webhookSecretLive) {
    console.error('Stripe webhook secrets are not set.');
    return new NextResponse('Webhook secrets not configured', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    let tempEvent;
    try {
        if (!webhookSecretTest) throw new Error("Test secret not available.");
        tempEvent = stripe.webhooks.constructEvent(body, sig, webhookSecretTest);
    } catch (err) {
        if (!webhookSecretLive) throw new Error("Live secret not available.");
        tempEvent = stripe.webhooks.constructEvent(body, sig, webhookSecretLive);
    }
    event = tempEvent;
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const isLiveMode = event.livemode;
  console.log(`[Webhook] Received ${isLiveMode ? 'LIVE' : 'TEST'} event: ${event.type}`);

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          console.log(`[Webhook] Account updated: ${account.id}, charges_enabled: ${account.charges_enabled}`);
          
          const accountIdField = isLiveMode ? 'stripeAccountId_live' : 'stripeAccountId_test';
          const onboardedField = isLiveMode ? 'stripeAccountOnboarded_live' : 'stripeAccountOnboarded_test';

          const q = query(collection(db, "companies"), where(accountIdField, "==", account.id));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const companyDoc = querySnapshot.docs[0];
            await updateCompanyProfile(companyDoc.id, {
                [onboardedField]: account.charges_enabled && account.details_submitted
            });
            console.log(`[Webhook] Updated company ${companyDoc.id} with ${onboardedField}=${account.charges_enabled}`);
          } else {
            console.warn(`[Webhook] Received account.updated for unknown Stripe account ID in ${isLiveMode ? 'live' : 'test'} mode: ${account.id}`);
          }
          break;
        }

        case 'checkout.session.completed': {
            const checkoutSession = event.data.object as Stripe.Checkout.Session;
            console.log(`[Webhook] Checkout session completed: ${checkoutSession.id}`);
            // This event is now handled client-side via redirect, but can be used for logging or other async tasks.
            break;
        }
        
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[Webhook] Invoice payment succeeded for: ${invoice.id}`);
          // TODO: Future implementation: Find the corresponding session(s) in your database using a
          // description or metadata on the invoice, and update its status to 'Billed'.
          break;
        }
          
        default:
          console.warn(`[Webhook] Unhandled relevant event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handler failed.', error);
      return new NextResponse('Webhook handler failed. View logs.', { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}
