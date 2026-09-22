import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PROMPTS } from '../../../lib/prompts';
import { RepurposeRequest } from '../../../types';
import { createClient } from '../../../utils/supabase/server';
import { adminClient } from '../../../utils/supabase/admin';
import { hasEnoughCredits, decrementCredits } from '../../../lib/credits';

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

    const body: RepurposeRequest = await req.json();
    const { content, platform, tone } = body;

    // CREDIT SYSTEM CHECK
    if (!(await hasEnoughCredits(user.id))) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }

    let systemPrompt = PROMPTS[platform]?.[tone];
    if (!systemPrompt) return NextResponse.json({ error: 'Invalid platform or tone' }, { status: 400 });

    // INJECT CEO IMPACT LENS
    systemPrompt += `\n\nAdditionally, provide a "Business Impact Analysis". 
    Identify if this story is: Regulatory, Competitive, Talent, or Market. 
    Then provide a 1-sentence "Why it matters" for a CEO.
    
    You MUST return the response in this JSON format:
    {
      "content": "The repurposed post text",
      "impactTag": "Regulatory | Competitive | Talent | Market | Other",
      "whyItMatters": "The 1-sentence explanation"
    }`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const resultData = JSON.parse(response.choices[0].message.content || '{}');
    const aiResult = resultData.content;

    // PERSISTENCE
    const { data: project } = await adminClient
      .from('projects')
      .insert([{ user_id: user.id, master_content: content }])
      .select().single();

    if (project) {
      await adminClient.from('repurposed_content').insert([{ 
          project_id: project.id, 
          platform, 
          tone, 
          content: aiResult 
      }]);
    }

    // DECREMENT CREDITS
    await decrementCredits(user.id);

    return NextResponse.json({ 
      result: aiResult, 
      impactTag: resultData.impactTag, 
      whyItMatters: resultData.whyItMatters 
    });
  } catch (error: any) {
    console.error('Internal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
