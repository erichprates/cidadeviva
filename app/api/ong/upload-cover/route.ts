import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PROJECT_FORM_LIMITS } from '@/lib/projects/payload';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'ngo_admin' && profile?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const folder = (formData.get('folder') as string | null) ?? 'covers';

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Envie um arquivo no campo "file".' }, { status: 400 });
  }
  if (file.size > PROJECT_FORM_LIMITS.uploadMaxBytes) {
    return NextResponse.json(
      { error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo 5 MB.` },
      { status: 413 },
    );
  }
  if (!PROJECT_FORM_LIMITS.uploadMimes.has(file.type)) {
    return NextResponse.json(
      { error: 'Formato não aceito. Use JPG, PNG ou WEBP.' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extMap[file.type] ?? 'jpg';
  const path = `${folder}/${user.id}/${Date.now()}-${hash}.${ext}`;

  const service = createServiceClient();
  const { error: upErr } = await service.storage
    .from('project-updates')
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error('[upload-cover] storage error:', upErr);
    return NextResponse.json(
      {
        error: 'Falha ao subir imagem. Verifique se o bucket "project-updates" existe e é público.',
        detail: upErr.message,
      },
      { status: 500 },
    );
  }

  const { data: pub } = service.storage.from('project-updates').getPublicUrl(path);
  return NextResponse.json({ url: pub.publicUrl, path });
}
