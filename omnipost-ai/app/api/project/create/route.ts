import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase';
import { adminClient } from '../../../../utils/supabase/admin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await req.json();

    // Create the project and return the ID
    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .insert([{ user_id: user.id, master_content: content }])
      .select()
      .single();

    if (projectError) throw projectError;

    return NextResponse.json({ projectId: project.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}