
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripeService';
import { getDocs, query, collection, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateCompanyProfile } from '@/lib/firestoreService';


const relevantEvents = new Set([
  'account.updated',
  'checkout.session.completed',
]);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret is not set.');
    return new NextResponse('Webhook secret not configured', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          console.log(`[Webhook] Account updated: ${account.id}, charges_enabled: ${account.charges_enabled}`);
          
          // Find the company with this stripeAccountId
          const q = query(collection(db, "companies"), where("stripeAccountId", "==", account.id));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const companyDoc = querySnapshot.docs[0];
            await updateCompanyProfile(companyDoc.id, {
                stripeAccountOnboarded: account.charges_enabled && account.details_submitted
            });
            console.log(`[Webhook] Updated company ${companyDoc.id} with stripeAccountOnboarded=${account.charges_enabled}`);
          } else {
            console.warn(`[Webhook] Received account.updated for unknown Stripe account ID: ${account.id}`);
          }
          break;
        }

        case 'checkout.session.completed': {
            const checkoutSession = event.data.object as Stripe.Checkout.Session;
            console.log(`[Webhook] Checkout session completed: ${checkoutSession.id}`);
            // This event is now handled client-side via redirect, but can be used for logging or other async tasks.
            // For example, if a client's payment setup is successful, you could trigger a welcome email.
            break;
        }
          
        default:
          console.warn(`Unhandled relevant event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handler failed.', error);
      return new NextResponse('Webhook handler failed. View logs.', { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}
