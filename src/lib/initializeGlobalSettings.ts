import { updateGlobalSettings } from './firestoreService';

/**
 * Initialize global settings document if it doesn't exist
 * This should be called once during app initialization
 */
export async function initializeGlobalSettings(userUid?: string) {
  try {
    if (!userUid) {
      console.log('[initializeGlobalSettings] No user UID provided, skipping initialization');
      return;
    }
    
    const defaultMode = process.env.NODE_ENV === 'production' ? 'live' : 'test';
    
    // This will create the document if it doesn't exist (using setDoc with merge: true)
    await updateGlobalSettings({ stripeMode: defaultMode }, userUid);
    
    console.log(`[initializeGlobalSettings] Global settings initialized with mode: ${defaultMode}`);
  } catch (error: any) {
    // Don't throw - this is optional initialization
    console.warn('[initializeGlobalSettings] Failed to initialize global settings:', error.message);
  }
}