import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ngo_admin' && profile?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { receipt_id, reason } = await request.json();
  if (!receipt_id || !reason) return NextResponse.json({ error: 'receipt_id e reason obrigatórios' }, { status: 400 });

  const service = createServiceClient();
  const { error } = await service.from('receipts').update({
    status: 'rejected',
    rejection_reason: reason,
  }).eq('id', receipt_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
