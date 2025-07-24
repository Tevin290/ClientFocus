'use client';

import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  progress?: number;
  status?: 'loading' | 'success' | 'error';
  onClose?: () => void;
}

export function LoadingModal({
  isOpen,
  title = 'Loading',
  message = 'Please wait...',
  progress,
  status = 'loading',
  onClose,
}: LoadingModalProps) {
  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Success!';
      case 'error':
        return 'Error';
      default:
        return title;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md ${status === 'loading' ? '[&>button]:hidden' : ''}`}>
        <DialogHeader className="sr-only">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          {getIcon()}
          
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{getTitle()}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>

          {progress !== undefined && status === 'loading' && (
            <div className="w-full max-w-xs space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-gray-500">{Math.round(progress)}%</p>
            </div>
          )}

          {status === 'loading' && progress === undefined && (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}