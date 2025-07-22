'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign } from 'lucide-react';

interface Session {
  id: string;
  clientName?: string;
  clientEmail?: string;
  sessionType: string;
  coachName?: string;
  sessionDate: any;
}

interface BillingConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  session: Session | null;
  isProcessing: boolean;
  estimatedAmount?: string;
}

export function BillingConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  session,
  isProcessing,
  estimatedAmount,
}: BillingConfirmationDialogProps) {
  if (!session) return null;

  const sessionDate = session.sessionDate?.toDate ? 
    session.sessionDate.toDate().toLocaleDateString() : 
    new Date(session.sessionDate).toLocaleDateString();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Confirm Billing
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to charge the client for this session. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Client:</span>
              <p className="font-medium">{session.clientName || 'Unknown Client'}</p>
              {session.clientEmail && (
                <p className="text-xs text-muted-foreground">{session.clientEmail}</p>
              )}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Coach:</span>
              <p className="font-medium">{session.coachName || 'Unknown Coach'}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Session Type:</span>
              <Badge variant="outline" className="mt-1">
                {session.sessionType}
              </Badge>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Session Date:</span>
              <p className="font-medium">{sessionDate}</p>
            </div>
          </div>

          {estimatedAmount && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-muted-foreground">Amount to charge:</span>
                <span className="text-lg font-bold text-primary">{estimatedAmount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on the session type pricing configured in Stripe
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Important:</strong> The client's payment method will be charged immediately. 
              Make sure all session details are correct before proceeding.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isProcessing}
            className="bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Charge Client
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}