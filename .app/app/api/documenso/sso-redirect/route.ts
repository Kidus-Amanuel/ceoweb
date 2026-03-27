import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

function signJWT(payload: any, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedHeader + '.' + encodedPayload)
    .digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const email = user.email || 'user@example.com';
    const name = user.user_metadata?.full_name || 'ERP User';
    const tenantId = user.user_metadata?.company_id || 'default-tenant';
    const tenantName = user.user_metadata?.company_name || 'ERP Company';

    const secret = process.env.ERP_SSO_SECRET || 'erp-super-secret';
    
    const payload = {
      email,
      name,
      tenantId,
      tenantName,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes validity
    };

    const token = signJWT(payload, secret);

    const documensoUrl = process.env.DOCUMENSO_URL || 'https://documentsign.onrender.com';
    return NextResponse.redirect(`${documensoUrl}/api/auth/erp-sso?token=${token}`);
  } catch (err) {
    console.error('SSO Redirect Error:', err);
    return NextResponse.json({ error: 'SSO Error' }, { status: 500 });
  }
}
