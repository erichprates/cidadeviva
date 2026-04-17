import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { receipt_id, reason } = await request.json();
  if (!receipt_id || !reason) return NextResponse.json({ error: 'Dados faltando.' }, { status: 400 });

  const service = createServiceClient();
  const { data: merchant } = await service.from('merchants').select('id').eq('profile_id', user.id).maybeSingle();
  if (!merchant) return NextResponse.json({ error: 'Lojista não encontrado.' }, { status: 403 });

  const { error } = await service.from('contestations').insert({
    receipt_id,
    merchant_id: merchant.id,
    reason,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
