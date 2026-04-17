import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const { user_id, role, merchant_id } = body;
  if (!user_id || !role) return NextResponse.json({ error: 'user_id e role obrigatórios' }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.from('profiles').update({ role }).eq('id', user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (role === 'merchant' && merchant_id) {
    await service.from('merchants').update({ profile_id: user_id }).eq('id', merchant_id);
  }

  return NextResponse.json({ success: true });
}
