interface BillingResponse {
  success: boolean;
  paymentIntentId?: string;
  amountCharged?: number;
  currency?: string;
  sessionType?: string;
  error?: string;
  details?: string;
}

export async function chargeSessionToClient(
  sessionId: string, 
  companyId: string, 
  stripeMode: 'test' | 'live'
): Promise<BillingResponse> {
  try {
    const response = await fetch('/api/billing/charge-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        companyId,
        stripeMode,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Billing request failed',
        details: data.details,
      };
    }

    return {
      success: true,
      paymentIntentId: data.paymentIntentId,
      amountCharged: data.amountCharged,
      currency: data.currency,
      sessionType: data.sessionType,
    };

  } catch (error: any) {
    console.error('[Billing Service] Error:', error);
    return {
      success: false,
      error: 'Network error during billing request',
      details: error.message,
    };
  }
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Stripe amounts are in cents
}