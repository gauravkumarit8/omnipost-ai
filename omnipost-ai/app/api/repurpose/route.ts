import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PROMPTS } from '../../../lib/prompts';
import { RepurposeRequest } from '../../../types';
import { createClient } from '../../../lib/supabase';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Get the token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1]; // Extract "Bearer <token>"

    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization Token' }, { status: 401 });
    }

    // 2. Manually set the session using the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth Error:', authError);
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const body: RepurposeRequest = await req.json();
    const { content, platform, tone } = body;

    const systemPrompt = PROMPTS[platform]?.[tone];
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Invalid platform or tone' }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
      temperature: 0.7,
    });

    const aiResult = response.choices[0].message.content;

    // 3. Save to Database
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([{ user_id: user.id, master_content: content }])
      .select()
      .single();

    if (project) {
      await supabase
        .from('repurposed_content')
        .insert([{ 
            project_id: project.id, 
            platform, 
            tone, 
            content: aiResult 
        }]);
    }

    return NextResponse.json({ result: aiResult });
  } catch (error: any) {
    console.error('Internal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}