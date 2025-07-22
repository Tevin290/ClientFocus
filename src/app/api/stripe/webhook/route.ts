/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getDocs, query, collection, where, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
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
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
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

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`[Webhook] Payment intent succeeded: ${paymentIntent.id}`);
          
          const sessionId = paymentIntent.metadata?.sessionId;
          if (sessionId) {
            try {
              // Update session status and payment info
              await updateDoc(doc(db, 'sessions', sessionId), {
                status: 'Billed',
                billedAt: Timestamp.now(),
                paymentIntentId: paymentIntent.id,
                amountCharged: paymentIntent.amount,
                currency: paymentIntent.currency,
                updatedAt: Timestamp.now(),
                webhookProcessed: true,
              });

              // Create/update billing record
              await addDoc(collection(db, 'billing_records'), {
                sessionId: sessionId,
                paymentIntentId: paymentIntent.id,
                clientId: paymentIntent.metadata?.clientId,
                clientName: paymentIntent.metadata?.clientName,
                coachName: paymentIntent.metadata?.coachName,
                companyId: paymentIntent.metadata?.companyId,
                sessionType: paymentIntent.metadata?.sessionType,
                amountCharged: paymentIntent.amount,
                currency: paymentIntent.currency,
                stripeMode: isLiveMode ? 'live' : 'test',
                billedAt: Timestamp.now(),
                status: 'succeeded',
                webhookProcessed: true,
              });

              console.log(`[Webhook] Updated session ${sessionId} to Billed status`);
            } catch (error) {
              console.error(`[Webhook] Failed to update session ${sessionId}:`, error);
            }
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`[Webhook] Payment intent failed: ${paymentIntent.id}`);
          
          const sessionId = paymentIntent.metadata?.sessionId;
          if (sessionId) {
            try {
              // Create billing record for failed payment
              await addDoc(collection(db, 'billing_records'), {
                sessionId: sessionId,
                paymentIntentId: paymentIntent.id,
                clientId: paymentIntent.metadata?.clientId,
                clientName: paymentIntent.metadata?.clientName,
                coachName: paymentIntent.metadata?.coachName,
                companyId: paymentIntent.metadata?.companyId,
                sessionType: paymentIntent.metadata?.sessionType,
                amountCharged: paymentIntent.amount,
                currency: paymentIntent.currency,
                stripeMode: isLiveMode ? 'live' : 'test',
                billedAt: Timestamp.now(),
                status: 'failed',
                error: paymentIntent.last_payment_error?.message || 'Payment failed',
                webhookProcessed: true,
              });

              console.log(`[Webhook] Recorded failed payment for session ${sessionId}`);
            } catch (error) {
              console.error(`[Webhook] Failed to record failed payment for session ${sessionId}:`, error);
            }
          }
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
