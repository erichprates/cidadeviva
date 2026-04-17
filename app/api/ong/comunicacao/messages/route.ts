import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ALLOWED_SEGMENTS = new Set(['todos', 'projeto', 'nivel', 'inativos']);

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ngo_admin' && profile?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const segment = typeof body?.segment === 'string' ? body.segment : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  const recipientsCount = Math.max(0, Math.floor(Number(body?.recipients_count ?? 0)));

  if (!ALLOWED_SEGMENTS.has(segment)) {
    return NextResponse.json({ error: 'Segmento inválido.' }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: 'A mensagem não pode ficar vazia.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('message_logs')
    .insert({
      ngo_admin_id: user.id,
      recipients_count: recipientsCount,
      segment,
      content,
      status: 'simulated',
    })
    .select('id, sent_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id, sent_at: data.sent_at });
}
