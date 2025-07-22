import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSettings, updateGlobalSettings, getUserProfile } from '@/lib/firestoreService';

// GET: Fetch current global Stripe mode
export async function GET() {
  try {
    const settings = await getGlobalSettings();
    
    if (!settings) {
      // Return default settings if document doesn't exist yet
      const defaultMode = process.env.NODE_ENV === 'production' ? 'live' : 'test';
      return NextResponse.json({ 
        stripeMode: defaultMode,
        updatedAt: new Date().toISOString(),
        updatedBy: null,
        isDefault: true
      });
    }

    return NextResponse.json({ 
      stripeMode: settings.stripeMode,
      updatedAt: settings.updatedAt.toDate().toISOString(),
      updatedBy: settings.updatedBy,
      isDefault: false
    });

  } catch (error: any) {
    console.error('[Stripe Mode API] GET Error:', error);
    
    // If there are permission issues, return default mode
    if (error.message?.includes('permission') || error.code === 'permission-denied') {
      const defaultMode = process.env.NODE_ENV === 'production' ? 'live' : 'test';
      return NextResponse.json({ 
        stripeMode: defaultMode,
        updatedAt: new Date().toISOString(),
        updatedBy: null,
        isDefault: true,
        error: 'Using default mode due to permissions'
      });
    }
    
    return NextResponse.json({ 
      error: error.message,
      stripeMode: process.env.NODE_ENV === 'production' ? 'live' : 'test',
      isDefault: true
    }, { status: 500 });
  }
}

// POST: Update global Stripe mode (super-admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stripeMode, userUid } = body;

    // Validate input
    if (!stripeMode || !['test', 'live'].includes(stripeMode)) {
      return NextResponse.json({ error: 'Invalid stripe mode' }, { status: 400 });
    }

    if (!userUid) {
      return NextResponse.json({ error: 'User UID is required' }, { status: 400 });
    }

    // Check if user is admin or super-admin
    const userProfile = await getUserProfile(userUid);

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found. Please ensure you are logged in.' }, { status: 404 });
    }

    if (!['admin', 'super-admin'].includes(userProfile.role)) {
      return NextResponse.json({ 
        error: `Unauthorized. Current role: ${userProfile.role}. Admin or super-admin access required.` 
      }, { status: 403 });
    }

    // Update global settings
    await updateGlobalSettings({ stripeMode }, userUid);

    return NextResponse.json({ 
      success: true,
      stripeMode,
      message: `Global Stripe mode updated to ${stripeMode}`
    });

  } catch (error: any) {
    console.error('[Stripe Mode API] POST Error:', error);
    console.error('[Stripe Mode API] Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}