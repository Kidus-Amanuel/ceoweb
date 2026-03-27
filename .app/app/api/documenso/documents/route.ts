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
      return NextResponse.json(data);
    } else {
      // Return empty array and the status if call fails
      return NextResponse.json({
        documents: [],
        error: `Documenso API returned ${response.status}`,
        debug_url: `${documensoUrl}/api/v1/documents`
      });
    }

  } catch (err) {
    console.error('Fetch Documents Error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
