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
  let isLiveMode: boolean;
  
  try {
    // Try to construct event with appropriate webhook secret
    // In production, try live secret first; in development, try test secret first
    const tryLiveFirst = process.env.NODE_ENV === 'production';
    let tempEvent;
    
    if (tryLiveFirst && webhookSecretLive) {
      try {
        tempEvent = stripe.webhooks.constructEvent(body, sig, webhookSecretLive);
        isLiveMode = true;
      } catch (err) {
        if (webhookSecretTest) {
          tempEvent = stripe.webhooks.constructEvent(body, sig, webhookSecretTest);
          isLiveMode = false;
        } else {
          throw err;
        }
      }
    } else if (webhookSecretTest) {
      try {
        tempEvent = stripe.webhooks.constructEvent(body, sig, webhookSecretTest);
        isLiveMode = false;
      } catch (err) {
        if (webhookSecretLive) {
          tempEvent = stripe.webhooks.constructEvent(body, sig, webhookSecretLive);
          isLiveMode = true;
        } else {
          throw err;
        }
      }
    } else {
      throw new Error("No webhook secrets available");
    }
    
    event = tempEvent;
    
    // Verify the mode matches the event's livemode flag
    if (isLiveMode !== event.livemode) {
      console.warn(`[Webhook] Mode mismatch: webhook secret suggests ${isLiveMode ? 'live' : 'test'} but event.livemode is ${event.livemode}`);
      // Use the event's livemode as the authoritative source
      isLiveMode = event.livemode;
    }
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
  console.log(`[Webhook] Received ${isLiveMode ? 'LIVE' : 'TEST'} event: ${event.type}`);
  
  // Add webhook endpoint validation to prevent conflicts
  const expectedMode = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  if (process.env.STRIPE_WEBHOOK_STRICT_MODE === 'true' && isLiveMode !== (expectedMode === 'live')) {
    console.warn(`[Webhook] Mode mismatch: received ${isLiveMode ? 'live' : 'test'} event but environment expects ${expectedMode}`);
  }

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
