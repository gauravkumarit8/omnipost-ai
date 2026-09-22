import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase';
import { adminClient } from '../../../../../utils/supabase/admin';

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const { platform } = params;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  // 1. Absolute Base URL from env to prevent "localhost" redirects
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (!code) {
    return NextResponse.redirect(new URL('/login', baseUrl));
  }

  try {
    let accessToken = '';

    if (platform === 'linkedin') {
      const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
          redirect_uri: `${baseUrl}/api/auth/${platform}/callback`,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('LinkedIn API Error:', errorText);
        return NextResponse.json({ error: `LinkedIn Error: ${errorText}` }, { status: res.status });
      }

      const data = await res.json();
      accessToken = data.access_// Fix: access_token
      accessToken = data.access_token;
    } else {
      return NextResponse.json({ error: 'Platform not implemented' }, { status: 501 });
    }

    // 2. AUTH VERIFICATION
    // We use the client to find the current user session
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // If the server can't find the user, we can't link the account
    if (userError || !user) {
      console.error('No authenticated user found during callback');
      // Redirect to login using the absolute baseUrl to avoid localhost error
      return NextResponse.redirect(new URL('/login', baseUrl));
    }

    // 3. SAVE TOKEN using Admin Client
    const { error: dbError } = await adminClient
      .from('user_connections')
      .upsert({
        user_id: user.id,
        platform,
        access_token: accessToken,
      });

    if (dbError) throw dbError;

    console.log(`Successfully linked ${platform} for user ${user.id}`);
    
    // Redirect back to settings using absolute baseUrl
    return NextResponse.redirect(new URL('/settings?connected=true', baseUrl));

  } catch (error: any) {
    console.error('Callback Critical Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}