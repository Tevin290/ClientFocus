'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LoadingModal } from '@/components/ui/loading-modal';

interface LoadingState {
  isLoading: boolean;
  title?: string;
  message?: string;
  progress?: number;
  status?: 'loading' | 'success' | 'error';
}

interface LoadingContextType {
  showLoading: (options?: {
    title?: string;
    message?: string;
    progress?: number;
  }) => void;
  updateLoading: (options: {
    title?: string;
    message?: string;
    progress?: number;
    status?: 'loading' | 'success' | 'error';
  }) => void;
  hideLoading: () => void;
  showSuccess: (message?: string) => void;
  showError: (message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
  });

  const showLoading = (options?: {
    title?: string;
    message?: string;
    progress?: number;
  }) => {
    setLoadingState({
      isLoading: true,
      title: options?.title || 'Loading',
      message: options?.message || 'Please wait...',
      progress: options?.progress,
      status: 'loading',
    });
  };

  const updateLoading = (options: {
    title?: string;
    message?: string;
    progress?: number;
    status?: 'loading' | 'success' | 'error';
  }) => {
    setLoadingState(prev => ({
      ...prev,
      ...options,
    }));
  };

  const hideLoading = () => {
    setLoadingState({ isLoading: false });
  };

  const showSuccess = (message?: string) => {
    setLoadingState({
      isLoading: true,
      message: message || 'Operation completed successfully!',
      status: 'success',
    });
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
      hideLoading();
    }, 2000);
  };

  const showError = (message?: string) => {
    setLoadingState({
      isLoading: true,
      message: message || 'An error occurred. Please try again.',
      status: 'error',
    });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      hideLoading();
    }, 3000);
  };

  return (
    <LoadingContext.Provider
      value={{
        showLoading,
        updateLoading,
        hideLoading,
        showSuccess,
        showError,
      }}
    >
      {children}
      <LoadingModal
        isOpen={loadingState.isLoading}
        title={loadingState.title}
        message={loadingState.message}
        progress={loadingState.progress}
        status={loadingState.status}
        onClose={loadingState.status !== 'loading' ? hideLoading : undefined}
      />
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};