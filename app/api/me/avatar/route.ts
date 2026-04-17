import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Envie um arquivo no campo "file".' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo 5 MB.` },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: 'Formato não aceito. Use JPG, PNG ou WEBP.' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const ext = EXT_MAP[file.type] ?? 'jpg';
  const path = `${user.id}/${Date.now()}-${hash}.${ext}`;

  const service = createServiceClient();

  const { error: upErr } = await service.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error('[me/avatar] storage error:', upErr);
    return NextResponse.json(
      {
        error:
          'Falha ao subir imagem. Verifique se o bucket "avatars" existe e é público no Supabase.',
        detail: upErr.message,
      },
      { status: 500 },
    );
  }

  const { data: pub } = service.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = pub.publicUrl;

  // Apaga avatares antigos do mesmo usuário pra não lotar o bucket.
  try {
    const { data: existing } = await service.storage.from('avatars').list(user.id);
    const current = path.split('/').slice(-1)[0];
    const toRemove = (existing ?? [])
      .map((f) => f.name)
      .filter((n) => n !== current)
      .map((n) => `${user.id}/${n}`);
    if (toRemove.length > 0) {
      await service.storage.from('avatars').remove(toRemove);
    }
  } catch {
    // best-effort
  }

  const { error: updErr } = await service
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);

  if (updErr) {
    console.error('[me/avatar] profile update error:', updErr);
    return NextResponse.json({ error: 'Falha ao atualizar perfil.', detail: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ url: avatarUrl });
}

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const service = createServiceClient();

  try {
    const { data: existing } = await service.storage.from('avatars').list(user.id);
    const toRemove = (existing ?? []).map((f) => `${user.id}/${f.name}`);
    if (toRemove.length > 0) {
      await service.storage.from('avatars').remove(toRemove);
    }
  } catch {
    // best-effort
  }

  const { error } = await service.from('profiles').update({ avatar_url: null }).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
