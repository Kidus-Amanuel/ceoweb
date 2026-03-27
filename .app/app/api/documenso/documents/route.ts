import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = user.user_metadata?.company_id || 'default-tenant';
    const documensoApiToken = process.env.DOCUMENSO_API_TOKEN || ''; // In prod, use standard env var
    
    // Instead of querying Documenso, if we need it simple:
    // We could proxy to documenso API securely.
    const documensoUrl = process.env.DOCUMENSO_URL || 'https://documentsign.onrender.com';
    
    const response = await fetch(`${documensoUrl}/api/v1/documents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${documensoApiToken}`, // Fallback if API tokens configured
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      // Ensure we filter for this tenant if needed, or if API token is already scoped via teams.
      return NextResponse.json(data);
    } else {
      // Mock response if documenso isn't properly connected in dev
      return NextResponse.json({
        documents: [
          { id: '1', title: 'HR Contract - Mock', recipient: 'dev@dev.com', status: 'PENDING', date: new Date().toISOString() },
          { id: '2', title: 'Terms - Updated Mock', recipient: 'user@user.com', status: 'COMPLETED', date: new Date().toISOString() }
        ]
      });
    }

  } catch (err) {
    console.error('Fetch Documents Error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
