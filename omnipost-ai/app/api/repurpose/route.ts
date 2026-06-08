import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PROMPTS } from '../../../lib/prompts';
import { RepurposeRequest } from '../../../types';
import { createClient } from '../../../lib/supabase';
import { adminClient } from '../../../utils/supabase/admin';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Update the type locally to include projectId
interface RepurposeRequestWithId extends RepurposeRequest {
  projectId: string;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1]; 

    if (!token) return NextResponse.json({ error: 'Missing Token' }, { status: 401 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: RepurposeRequestWithId = await req.json();
    const { content, platform, tone, projectId } = body;

    if (!projectId) return NextResponse.json({ error: 'ProjectId is required' }, { status: 400 });

    const systemPrompt = PROMPTS[platform]?.[tone];
    if (!systemPrompt) return NextResponse.json({ error: 'Invalid platform or tone' }, { status: 400 });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
      temperature: 0.7,
    });

    const aiResult = response.choices[0].message.content;

    // SAVE ONLY THE CONTENT linked to the provided projectId
    const { error: contentError } = await adminClient
      .from('repurposed_content')
      .insert([{ 
          project_id: projectId, 
          platform, 
          tone, 
          content: aiResult 
      }]);

    if (contentError) console.error('Save Error:', contentError);

    return NextResponse.json({ result: aiResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}