'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import type { ProjectUpdate } from '@/lib/supabase/types';
import { timeAgoPt } from '@/lib/avatars';

interface Props {
  projectId: string;
  updates: ProjectUpdate[];
}

const UPLOAD_MAX_MB = 5;

export function UpdatesManager({ projectId, updates }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const onPickImage = (file: File | null) => {
    setErr(null);
    if (!file) {
      setImage(null);
      return;
    }
    if (file.size > UPLOAD_MAX_MB * 1024 * 1024) {
      setErr(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo ${UPLOAD_MAX_MB} MB.`);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErr('Formato não aceito. Use JPG, PNG ou WEBP.');
      return;
    }
    setImage(file);
  };

  const submit = async () => {
    if (!title.trim() || !content.trim()) {
      setErr('Título e conteúdo são obrigatórios.');
      return;
    }
    setLoading(true);
    setErr(null);
    const fd = new FormData();
    fd.append('project_id', projectId);
    fd.append('title', title);
    fd.append('content', content);
    if (image) fd.append('image', image);

    const res = await fetch('/api/ong/project-updates', { method: 'POST', body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setErr(data?.error ?? 'Falha ao publicar.');
      return;
    }
    setTitle('');
    setContent('');
    setImage(null);
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Apagar essa atualização?')) return;
    setDeletingId(id);
    const res = await fetch(`/api/ong/project-updates/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? 'Falha ao apagar.');
      return;
    }
    router.refresh();
  };

  const inp = 'mt-1 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand focus:outline-none focus:border-cv-green text-sm';

  return (
    <div className="space-y-5">
      <div className="bg-cv-white rounded-2xl border border-cv-earth/5 p-5">
        <h3 className="font-display text-lg text-cv-earth">Nova atualização</h3>
        <p className="mt-1 text-sm text-cv-earth/65">Conta o que está acontecendo no projeto. Os apoiadores recebem essa novidade.</p>

        <label className="block mt-4 text-sm">
          <span className="text-cv-earth/70">Título *</span>
          <input className={inp} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Primeira remessa entregue" />
        </label>
        <label className="block mt-3 text-sm">
          <span className="text-cv-earth/70">Conteúdo *</span>
          <textarea className={inp} rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conte o que aconteceu, fotos do dia, agradecimentos..." />
        </label>
        <div className="mt-3">
          <span className="text-sm text-cv-earth/70">Imagem (opcional)</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center rounded-full border border-cv-earth/15 px-4 py-2 cursor-pointer hover:bg-cv-sand text-sm">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {image ? 'Trocar imagem' : 'Escolher imagem'}
            </label>
            {image && (
              <button
                type="button"
                onClick={() => setImage(null)}
                className="text-sm text-red-600 hover:underline"
              >
                Remover
              </button>
            )}
            <span className="text-xs text-cv-earth/55">JPG, PNG ou WEBP · máx {UPLOAD_MAX_MB} MB</span>
          </div>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Pré-visualização"
              className="mt-3 rounded-xl"
              style={{ maxHeight: 220, objectFit: 'cover' }}
            />
          )}
        </div>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        <div className="mt-4">
          <Button onClick={submit} disabled={loading}>
            {loading ? 'Publicando...' : 'Publicar atualização 📢'}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg text-cv-earth mb-3">Atualizações publicadas ({updates.length})</h3>
        {updates.length === 0 ? (
          <div className="bg-cv-white rounded-2xl p-6 text-sm text-cv-earth/60 text-center border border-cv-earth/5">
            Nenhuma atualização ainda. Publique a primeira acima.
          </div>
        ) : (
          <div className="space-y-3">
            {updates.map((u) => (
              <div key={u.id} className="bg-cv-white rounded-2xl p-4 border border-cv-earth/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-cv-earth/55 uppercase tracking-wide">{timeAgoPt(u.created_at)}</div>
                    <div className="font-display text-base mt-0.5 text-cv-earth">{u.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(u.id)}
                    disabled={deletingId === u.id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deletingId === u.id ? 'Apagando...' : 'Apagar'}
                  </button>
                </div>
                {u.image_url && (
                  <img src={u.image_url} alt="" className="mt-3 rounded-xl w-full" style={{ maxHeight: 220, objectFit: 'cover' }} />
                )}
                <p className="mt-2 text-sm text-cv-earth/80 whitespace-pre-line">{u.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
