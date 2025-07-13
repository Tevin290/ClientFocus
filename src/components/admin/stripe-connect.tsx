'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useRole } from '@/context/role-context';
import { useLoading } from '@/context/loading-context';
import { CheckCircle, XCircle, ExternalLink, CreditCard, DollarSign, Settings } from 'lucide-react';
import { createConnectOAuthLink } from '@/lib/stripeService';

interface StripeConnectProps {
  mode: 'test' | 'live';
}

export default function StripeConnect({ mode }: StripeConnectProps) {
  const { companyProfile } = useRole();
  const [error, setError] = useState<string>('');
  const { showLoading, showError } = useLoading();

  const isTestMode = mode === 'test';
  const stripeAccountId = isTestMode ? companyProfile?.stripeAccountId_test : companyProfile?.stripeAccountId_live;
  const isOnboarded = isTestMode ? companyProfile?.stripeAccountOnboarded_test : companyProfile?.stripeAccountOnboarded_live;
  const isConnected = !!stripeAccountId;

  const handleConnect = async () => {
    if (!companyProfile?.id) {
      setError('Company profile not found');
      return;
    }

    showLoading({
      title: 'Connecting to Stripe',
      message: 'Preparing secure connection...',
    });

    setError('');

    try {
      const result = await createConnectOAuthLink(companyProfile.id, mode);
      
      if (result.error) {
        showError(result.error);
        return;
      }

      if (result.url) {
        // Redirect to Stripe OAuth flow
        window.location.href = result.url;
      } else {
        showError('Failed to create connection URL');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to initiate Stripe connection');
    }
  };

  const getStatusBadge = () => {
    if (!isConnected) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    
    if (isOnboarded) {
      return <Badge variant="default" className="bg-green-100 text-green-800">✓ Connected & Ready</Badge>;
    }
    
    return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Connected (Setup Required)</Badge>;
  };

  const getStatusIcon = () => {
    if (!isConnected) {
      return <XCircle className="h-5 w-5 text-gray-400" />;
    }
    
    if (isOnboarded) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    return <Settings className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="flex items-center gap-2">
                Stripe Connect - {isTestMode ? 'Test' : 'Live'} Mode
                {getStatusBadge()}
              </CardTitle>
              <CardDescription>
                {isTestMode 
                  ? 'Connect your Stripe test account for development and testing'
                  : 'Connect your live Stripe account to accept real payments'
                }
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            <DollarSign className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Account Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account ID:</span>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded">{stripeAccountId}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={isOnboarded ? 'text-green-600' : 'text-yellow-600'}>
                  {isOnboarded ? 'Ready to accept payments' : 'Onboarding required'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {!isConnected ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Connect your Stripe account to start accepting payments. This will redirect you to Stripe's secure OAuth flow.
              </p>
              <Button 
                onClick={handleConnect} 
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Stripe Account
              </Button>
            </div>
          ) : !isOnboarded ? (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Your Stripe account is connected but requires additional setup to accept payments.
              </p>
              <Button 
                onClick={handleConnect} 
                variant="outline"
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Complete Stripe Setup
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-green-600 mb-3">
                ✓ Your Stripe account is connected and ready to accept payments.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleConnect} 
                  variant="outline"
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Account
                </Button>
                <Button 
                  onClick={() => window.open(`https://dashboard.stripe.com/${isTestMode ? 'test/' : ''}`, '_blank')}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Stripe Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isTestMode && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> This is your live Stripe connection. Only connect this when you're ready to accept real payments from customers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}