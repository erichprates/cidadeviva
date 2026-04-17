import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function assertAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'platform_admin') return null;
  return user;
}

export async function POST(request: Request) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await request.json();
  const service = createServiceClient();

  const payload = {
    business_name: body.business_name,
    document: body.document || null,
    business_type: body.business_type,
    neighborhood: body.neighborhood,
    city: body.city || 'São José dos Campos',
    cashback_rate: Number(body.cashback_rate ?? 3),
    status: body.status || 'active',
  };

  if (!payload.business_name || !payload.business_type || !payload.neighborhood) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
  }

  if (body.id) {
    const { error } = await service.from('merchants').update(payload).eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: body.id });
  }

  const { data, error } = await service.from('merchants').insert(payload).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

export async function PATCH(request: Request) {
  const admin = await assertAdmin();
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const body = await request.json();
  if (!body.id || !body.status) return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.from('merchants').update({ status: body.status }).eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
