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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await ensureNgoOrAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });

  const result = validateProjectPayload(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.errors[0]?.message ?? 'Dados inválidos.', errors: result.errors }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from('projects')
    .update(result.data)
    .eq('id', params.id);

  if (error) {
    console.error('[ong/projects PUT] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await ensureNgoOrAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  const service = createServiceClient();

  if (action === 'toggle_status') {
    const { data: existing } = await service.from('projects').select('status').eq('id', params.id).maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
    const next = existing.status === 'active' ? 'paused' : 'active';
    const { error } = await service.from('projects').update({ status: next }).eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: next });
  }

  if (typeof body?.status === 'string' && (body.status === 'active' || body.status === 'paused')) {
    const { error } = await service.from('projects').update({ status: body.status }).eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: body.status });
  }

  return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await ensureNgoOrAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = createServiceClient();
  const { error } = await service.from('projects').delete().eq('id', params.id);
  if (error) {
    if (error.message.toLowerCase().includes('foreign key')) {
      return NextResponse.json(
        { error: 'Projeto possui plantios — não é possível apagar. Pause em vez disso.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
