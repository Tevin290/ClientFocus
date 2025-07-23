import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStripeSecretKey } from '@/lib/stripe';
import { initializeFirebase } from '@/lib/firebase';

interface BillingRequest {
  sessionId: string;
  companyId: string;
  stripeMode: 'test' | 'live';
}

interface SessionData {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  sessionType: string;
  sessionDate: any;
  coachName: string;
  status: string;
  companyId: string;
}

interface CompanyProfile {
  stripeAccountId_test?: string;
  stripeAccountId_live?: string;
  stripeAccountOnboarded_test?: boolean;
  stripeAccountOnboarded_live?: boolean;
}

interface UserProfile {
  stripeCustomerId_test?: string;
  stripeCustomerId_live?: string;
  email: string;
  displayName: string;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, companyId, stripeMode }: BillingRequest = await request.json();

    if (!sessionId || !companyId || !stripeMode) {
      return NextResponse.json(
        { error: 'Missing required parameters: sessionId, companyId, stripeMode' },
        { status: 400 }
      );
    }

    // Initialize Firebase
    const firebaseApp = initializeFirebase();
    if (!firebaseApp) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 500 }
      );
    }

    const db = getFirestore(firebaseApp);

    // Get session data
    const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
    if (!sessionDoc.exists()) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const sessionData = sessionDoc.data() as SessionData;

    // Validate session status
    if (sessionData.status !== 'Approved') {
      return NextResponse.json(
        { error: 'Session must be approved before billing' },
        { status: 400 }
      );
    }

    // Get company profile
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    if (!companyDoc.exists()) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const companyProfile = companyDoc.data() as CompanyProfile;
    const stripeAccountId = stripeMode === 'test' 
      ? companyProfile.stripeAccountId_test 
      : companyProfile.stripeAccountId_live;
    
    const isOnboarded = stripeMode === 'test' 
      ? companyProfile.stripeAccountOnboarded_test 
      : companyProfile.stripeAccountOnboarded_live;

    if (!stripeAccountId || !isOnboarded) {
      return NextResponse.json(
        { error: `Company Stripe account not properly configured for ${stripeMode} mode` },
        { status: 400 }
      );
    }

    // For live mode billing, do basic validation but let Stripe handle the details
    if (stripeMode === 'live') {
      try {
        const secretKey = getStripeSecretKey(stripeMode);
        const stripe = new Stripe(secretKey, { 
          apiVersion: '2025-06-30.basil', 
          typescript: true 
        });

        // Just verify the account exists and isn't disabled
        const account = await stripe.accounts.retrieve(stripeAccountId);
        
        if (account.requirements?.disabled_reason) {
          return NextResponse.json(
            { 
              error: 'Account is disabled',
              details: account.requirements.disabled_reason
            },
            { status: 400 }
          );
        }

        // Let Stripe handle other validations during payment processing
        
      } catch (accountError: any) {
        if (accountError.code === 'account_invalid') {
          return NextResponse.json(
            { 
              error: 'Invalid Stripe account',
              details: 'Please reconnect your Stripe account'
            },
            { status: 400 }
          );
        }
        // For other errors, continue and let payment processing handle it
      }
    }

    // Get client profile
    const clientDoc = await getDoc(doc(db, 'users', sessionData.clientId));
    if (!clientDoc.exists()) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const clientProfile = clientDoc.data() as UserProfile;
    const stripeCustomerId = stripeMode === 'test' 
      ? clientProfile.stripeCustomerId_test 
      : clientProfile.stripeCustomerId_live;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Client has no payment method configured' },
        { status: 400 }
      );
    }

    // Verify customer has a default payment method
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId, {
        expand: ['default_source', 'invoice_settings.default_payment_method'],
      }, {
        stripeAccount: stripeAccountId,
      });

      if (customer.deleted) {
        return NextResponse.json(
          { error: 'Customer account is no longer active' },
          { status: 400 }
        );
      }

      const hasPaymentMethod = customer.invoice_settings?.default_payment_method || 
                              customer.default_source;

      if (!hasPaymentMethod) {
        return NextResponse.json(
          { error: 'Client must add a payment method before billing can be processed' },
          { status: 400 }
        );
      }
    } catch (customerError: any) {
      console.error('[Billing API] Customer verification failed:', customerError);
      return NextResponse.json(
        { 
          error: 'Unable to verify customer payment information',
          details: customerError.message 
        },
        { status: 400 }
      );
    }

    // Initialize Stripe
    const secretKey = getStripeSecretKey(stripeMode);
    const stripe = new Stripe(secretKey, { 
      apiVersion: '2025-06-30.basil', 
      typescript: true 
    });

    // Get session type pricing from Stripe products
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    }, {
      stripeAccount: stripeAccountId,
    });

    const matchingProduct = products.data.find(product => 
      product.name.toLowerCase() === sessionData.sessionType.toLowerCase()
    );

    if (!matchingProduct) {
      return NextResponse.json(
        { error: `No pricing found for session type: ${sessionData.sessionType}` },
        { status: 400 }
      );
    }

    // Get the price for the product
    const prices = await stripe.prices.list({
      product: matchingProduct.id,
      active: true,
    }, {
      stripeAccount: stripeAccountId,
    });

    if (prices.data.length === 0) {
      return NextResponse.json(
        { error: `No active price found for session type: ${sessionData.sessionType}` },
        { status: 400 }
      );
    }

    const price = prices.data[0];

    // Create payment intent
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: price.unit_amount!,
        currency: price.currency,
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          sessionId: sessionId,
          sessionType: sessionData.sessionType,
          clientId: sessionData.clientId,
          clientName: sessionData.clientName,
          coachName: sessionData.coachName,
          companyId: companyId,
        },
        description: `${sessionData.sessionType} session with ${sessionData.coachName} for ${sessionData.clientName}`,
      }, {
        stripeAccount: stripeAccountId,
      });
    } catch (paymentError: any) {
      console.error('[Billing API] Payment intent creation failed:', {
        error: paymentError.message,
        code: paymentError.code,
        type: paymentError.type,
        stripeCustomerId,
        stripeAccountId,
        amount: price.unit_amount,
        currency: price.currency,
      });
      
      return NextResponse.json(
        { 
          error: 'Payment processing failed',
          details: paymentError.message || 'Unable to process payment'
        },
        { status: 400 }
      );
    }

    // Check payment status
    if (paymentIntent.status === 'succeeded') {
      // Update session status to billed
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'Billed',
        billedAt: Timestamp.now(),
        paymentIntentId: paymentIntent.id,
        amountCharged: price.unit_amount,
        currency: price.currency,
        updatedAt: Timestamp.now(),
      });

      // Create billing record for audit trail
      await addDoc(collection(db, 'billing_records'), {
        sessionId: sessionId,
        paymentIntentId: paymentIntent.id,
        clientId: sessionData.clientId,
        clientName: sessionData.clientName,
        clientEmail: sessionData.clientEmail,
        coachName: sessionData.coachName,
        companyId: companyId,
        sessionType: sessionData.sessionType,
        amountCharged: price.unit_amount,
        currency: price.currency,
        stripeMode: stripeMode,
        stripeAccountId: stripeAccountId,
        billedAt: Timestamp.now(),
        status: 'succeeded',
        metadata: {
          sessionDate: sessionData.sessionDate,
          productId: matchingProduct.id,
          priceId: price.id,
        },
      });

      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        amountCharged: price.unit_amount,
        currency: price.currency,
        sessionType: sessionData.sessionType,
      });

    } else if (paymentIntent.status === 'requires_action') {
      return NextResponse.json(
        { error: 'Payment requires additional authentication', paymentIntentId: paymentIntent.id },
        { status: 400 }
      );

    } else {
      // Payment failed
      await addDoc(collection(db, 'billing_records'), {
        sessionId: sessionId,
        clientId: sessionData.clientId,
        clientName: sessionData.clientName,
        clientEmail: sessionData.clientEmail,
        coachName: sessionData.coachName,
        companyId: companyId,
        sessionType: sessionData.sessionType,
        amountCharged: price.unit_amount,
        currency: price.currency,
        stripeMode: stripeMode,
        stripeAccountId: stripeAccountId,
        billedAt: Timestamp.now(),
        status: 'failed',
        error: `Payment failed with status: ${paymentIntent.status}`,
        paymentIntentId: paymentIntent.id,
      });

      return NextResponse.json(
        { error: `Payment failed with status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('[Billing API] Error processing charge:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during billing',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}