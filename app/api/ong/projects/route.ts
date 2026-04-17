import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { validateProjectPayload } from '@/lib/projects/payload';

export const runtime = 'nodejs';

async function ensureNgoOrAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado', status: 401 as const };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ngo_admin' && profile?.role !== 'platform_admin') {
    return { error: 'Não autorizado', status: 403 as const };
  }
  return { user };
}

export async function POST(request: Request) {
  const auth = await ensureNgoOrAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });

  const result = validateProjectPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.errors[0]?.message ?? 'Dados inválidos.', errors: result.errors }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('projects')
    .insert({
      ngo_admin_id: auth.user.id,
      ...result.data,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ong/projects] insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
