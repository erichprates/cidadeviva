import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

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

  const service = createServiceClient();
  const formData = await request.formData();
  const projectId = formData.get('project_id');
  const title = formData.get('title');
  const content = formData.get('content');
  const image = formData.get('image');

  if (typeof projectId !== 'string' || typeof title !== 'string' || typeof content !== 'string') {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
  }
  if (!title.trim() || !content.trim()) {
    return NextResponse.json({ error: 'Título e conteúdo são obrigatórios.' }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (image instanceof File && image.size > 0) {
    const buffer = Buffer.from(await image.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const ext = (image.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const path = `${projectId}/${Date.now()}-${hash}.${ext}`;

    const { error: upErr } = await service.storage
      .from('project-updates')
      .upload(path, buffer, { contentType: image.type || 'image/jpeg', upsert: false });

    if (upErr) {
      console.error('[project-updates] upload error:', upErr);
      return NextResponse.json(
        { error: 'Falha ao subir imagem. Verifique se o bucket "project-updates" existe.', detail: upErr.message },
        { status: 500 },
      );
    }

    const { data: pub } = service.storage.from('project-updates').getPublicUrl(path);
    imageUrl = pub.publicUrl;
  }

  const { data, error } = await service
    .from('project_updates')
    .insert({
      project_id: projectId,
      title: title.trim(),
      content: content.trim(),
      image_url: imageUrl,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[project-updates] insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
