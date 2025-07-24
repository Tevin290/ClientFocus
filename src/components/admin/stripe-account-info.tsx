'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw,
  Building,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StripeAccountInfo {
  accountId: string;
  businessName?: string;
  email?: string;
  country?: string;
  charges_enabled: boolean;
  details_submitted: boolean;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    past_due: string[];
    eventually_due: string[];
    disabled_reason?: string;
  };
  created: string;
}

interface StripeAccountInfoProps {
  companyProfile: any;
  stripeMode: 'test' | 'live';
}

export function StripeAccountInfo({ companyProfile, stripeMode }: StripeAccountInfoProps) {
  const [accountInfo, setAccountInfo] = useState<StripeAccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const stripeAccountId = stripeMode === 'test' 
    ? companyProfile?.stripeAccountId_test 
    : companyProfile?.stripeAccountId_live;
  
  const isOnboarded = stripeMode === 'test' 
    ? companyProfile?.stripeAccountOnboarded_test 
    : companyProfile?.stripeAccountOnboarded_live;

  const fetchAccountInfo = async () => {
    if (!stripeAccountId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stripe/account/status?accountId=${stripeAccountId}&mode=${stripeMode}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch account info');
      }

      const data = await response.json();
      setAccountInfo(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: 'Failed to fetch Stripe account information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountInfo();
  }, [stripeAccountId, stripeMode]);

  if (!stripeAccountId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Stripe Account Information
          </CardTitle>
          <CardDescription>
            No Stripe account connected for {stripeMode} mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Connect your Stripe account to view account details and manage billing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Connected Stripe Account
            </CardTitle>
            <CardDescription>
              Account details for {stripeMode} mode
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccountInfo}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : accountInfo ? (
          <>
            {/* Account Basic Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account ID</p>
                <p className="font-mono text-sm">{accountInfo.accountId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                <p className="text-sm">{accountInfo.businessName || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{accountInfo.email || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Country</p>
                <p className="text-sm">{accountInfo.country || 'Not provided'}</p>
              </div>
            </div>

            {/* Account Status */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Account Capabilities
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Charges</span>
                  <Badge variant={accountInfo.charges_enabled ? "default" : "destructive"}>
                    {accountInfo.charges_enabled ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Disabled
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Details</span>
                  <Badge variant={accountInfo.details_submitted ? "default" : "destructive"}>
                    {accountInfo.details_submitted ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Submitted
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Missing
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Payouts</span>
                  <Badge variant={accountInfo.payouts_enabled ? "default" : "secondary"}>
                    {accountInfo.payouts_enabled ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Disabled
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {(accountInfo.requirements.currently_due.length > 0 || 
              accountInfo.requirements.past_due.length > 0 || 
              accountInfo.requirements.disabled_reason) && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Requirements & Issues
                </h4>

                {accountInfo.requirements.disabled_reason && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Account Disabled:</strong> {accountInfo.requirements.disabled_reason}
                    </AlertDescription>
                  </Alert>
                )}

                {accountInfo.requirements.past_due.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Past Due Requirements:</strong> {accountInfo.requirements.past_due.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}

                {accountInfo.requirements.currently_due.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Currently Due:</strong> {accountInfo.requirements.currently_due.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Stripe Dashboard
              </Button>
              
              {(!accountInfo.charges_enabled || !accountInfo.details_submitted) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  <Building className="h-4 w-4 mr-2" />
                  Re-run Onboarding
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground pt-2">
              Account created: {new Date(accountInfo.created).toLocaleDateString()}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading account information...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}