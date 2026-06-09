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

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1]; 

    if (!token) return NextResponse.json({ error: 'Missing Token' }, { status: 401 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // --- BRAND VOICE INTEGRATION ---
    // Fetch the user's custom brand voice from the profiles table
    const { data: profile } = await adminClient
      .from('profiles')
      .select('brand_voice')
      .eq('id', user.id)
      .single();
    
    const userBrandVoice = profile?.brand_voice;

    const body: RepurposeRequest = await req.json();
    const { content, platform, tone } = body;

    let systemPrompt = PROMPTS[platform]?.[tone];
    if (!systemPrompt) return NextResponse.json({ error: 'Invalid platform or tone' }, { status: 400 });

    // If the user has a brand voice, append it to the platform prompt
    if (userBrandVoice) {
      systemPrompt += `\n\nCRITICAL: You must adapt the writing style to match the user's unique Brand Voice: "${userBrandVoice}". Ensure the output feels authentic to this description while still following the platform guidelines.`;
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

    // Save to Database
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .insert([{ user_id: user.id, master_content: content }])
      .select()
      .single();

    if (project) {
      await adminClient
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