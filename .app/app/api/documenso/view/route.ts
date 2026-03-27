import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const documentId = url.searchParams.get('id');

    if (!documentId) {
      return new NextResponse('Missing document ID', { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const tenantId = user.user_metadata?.company_id || 'default-tenant';
    
    // Create an iframe view for the user so it looks embedded
    const documensoUrl = process.env.DOCUMENSO_URL || 'https://documentsign.onrender.com';
    const embedIframeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Document Viewer</title>
        <style>
          body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #fff; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <iframe src="${documensoUrl}/t/${tenantId}/documents/${documentId}"></iframe>
      </body>
      </html>
    `;

    return new NextResponse(embedIframeHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    return new NextResponse('Error loading document viewer', { status: 500 });
  }
}
