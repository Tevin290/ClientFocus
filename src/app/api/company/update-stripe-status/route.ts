import { NextRequest, NextResponse } from 'next/server';
import { updateCompanyProfile } from '@/lib/firestoreService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, ...updateData } = body;

    if (!companyId || !updateData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    await updateCompanyProfile(companyId, updateData);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Update Stripe Status] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}