import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { platform: string } }) {
  const { platform } = params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL; 

  if (!baseUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_BASE_URL is not set' }, { status: 500 });
  }

  const redirectUri = `${baseUrl}/api/auth/${platform}/callback`;
  let authUrl = '';

  if (platform === 'linkedin') {
    authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=w_member_social%20openid%20profile`;
  } else if (platform === 'twitter') {
    authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.write%20users.read&state=state&code_challenge=challenge&code_challenge_method=S256`;
  } else if (platform === 'instagram') {
    authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.META_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish`;
  } else {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
  }

  return NextResponse.redirect(authUrl);
}