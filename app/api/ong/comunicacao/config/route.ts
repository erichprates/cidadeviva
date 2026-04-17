import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ngo_admin' && profile?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const payload = {
    ngo_admin_id: user.id,
    instance_name: typeof body?.instance_name === 'string' ? body.instance_name.trim() || null : null,
    api_url: typeof body?.api_url === 'string' ? body.api_url.trim() || null : null,
    api_key: typeof body?.api_key === 'string' ? body.api_key.trim() || null : null,
    phone_number: typeof body?.phone_number === 'string' ? body.phone_number.trim() || null : null,
    is_connected: false, // sempre false até integração real
  };

  const service = createServiceClient();
  const { error } = await service.from('whatsapp_config').upsert(payload, { onConflict: 'ngo_admin_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
