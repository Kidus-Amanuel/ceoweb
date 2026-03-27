import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documensoUrl = process.env.NEXT_PUBLIC_DOCUMENSO_URL || 'https://documentsign.onrender.com';
    const ssoSecret = process.env.ERP_SSO_SECRET || 'ceo222';
    const companyId = user.user_metadata?.company_id || 'default-tenant';
    const userEmail = user.email || 'user@example.com';

    // Call our NEW internal ERP bridging API in Documenso
    // This allows us to fetch all documents for this tenant correctly
    const internalUrl = `${documensoUrl}/api/erp/documents?secret=${ssoSecret}&email=${userEmail}&teamUrl=${companyId}`;
    
    const response = await fetch(internalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      return NextResponse.json({
        documents: [],
        error: `Documenso internal API error: ${response.status}`,
      });
    }

  } catch (err) {
    console.error('Fetch Documents Error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
