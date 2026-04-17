import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ngo_admin' && profile?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const service = createServiceClient();

  // Tenta apagar a imagem do storage se houver.
  const { data: existing } = await service
    .from('project_updates')
    .select('image_url')
    .eq('id', params.id)
    .maybeSingle();

  if (existing?.image_url) {
    const marker = '/storage/v1/object/public/project-updates/';
    const idx = existing.image_url.indexOf(marker);
    if (idx >= 0) {
      const path = existing.image_url.slice(idx + marker.length);
      await service.storage.from('project-updates').remove([path]).catch(() => null);
    }
  }

  const { error } = await service.from('project_updates').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
