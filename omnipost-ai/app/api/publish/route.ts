import { NextResponse } from 'next/server';
import { createClient } from '../.../../../../lib/supabase';
import { adminClient } from '../.../../../../utils/supabase/admin';

export async function POST(req: Request) {
  try {
    // 1. GET TOKEN FROM HEADER (Same as repurpose route)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1]; 

    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization Token' }, { status: 401 });
    }

    // 2. VERIFY USER using the token
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
    }

    const { platform, content } = await req.json();

    // 3. Get the platform token from DB
    const { data: connection } = await adminClient
      .from('user_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .single();

    if (!connection) {
      return NextResponse.json({ error: `Please connect your ${platform} account in Settings first.` }, { status: 400 });
    }

    // 4. Handle Publishing
    let apiResponse: Response;

    if (platform === 'linkedin') {
      apiResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${connection.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author: `urn:li:person:USER_ID`, // Reminder: You must replace USER_ID with the actual ID from the auth callback
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': { shareCommentary: { text: content }, shareMediaCategory: 'NONE' }
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
        }),
      });
    } else {
      return NextResponse.json({ 
        error: `Direct publishing to ${platform} is coming soon!` 
      }, { status: 501 });
    }

    if (!apiResponse.ok) {
      const errData = await apiResponse.json().catch(() => ({}));
      console.error('Platform API Error:', errData);
      throw new Error(`Platform API responded with ${apiResponse.status}`);
    }

    return NextResponse.json({ message: `Successfully published to ${platform}!` });
  } catch (error: any) {
    console.error('Publish Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}