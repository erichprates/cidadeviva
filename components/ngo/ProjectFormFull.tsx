'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { coverBackground } from '@/lib/categories';
import type { Project } from '@/lib/supabase/types';

const CATEGORIES = [
  { v: 'saude', l: '💊 Saúde' },
  { v: 'educacao', l: '📚 Educação' },
  { v: 'alimentacao', l: '🥗 Alimentação' },
  { v: 'cultura', l: '🎨 Cultura' },
  { v: 'meio_ambiente', l: '🌿 Meio Ambiente' },
];

const DESC_MAX = 200;
const UPLOAD_MAX_MB = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp';

interface Props {
  mode: 'create' | 'edit';
  project?: Project;
}

interface FormState {
  title: string;
  description: string;
  story: string;
  category: string;
  neighborhood: string;
  goal_seeds: string;
  impact_unit: string;
  impact_per_seed: string;
  beneficiaries_count: string;
  created_by_name: string;
  status: 'active' | 'paused';
  cover_image_url: string | null;
}

function projectToForm(p?: Project): FormState {
  return {
    title: p?.title ?? '',
    description: p?.description ?? '',
    story: p?.story ?? '',
    category: p?.category ?? 'saude',
    neighborhood: p?.neighborhood ?? '',
    goal_seeds: String(p?.goal_seeds ?? 5000),
    impact_unit: p?.impact_unit ?? 'beneficiados',
    impact_per_seed: String(p?.impact_per_seed ?? 0.1),
    beneficiaries_count: String(p?.beneficiaries_count ?? 0),
    created_by_name: p?.created_by_name ?? '',
    status: (p?.status === 'paused' ? 'paused' : 'active'),
    cover_image_url: p?.cover_image_url ?? null,
  };
}

export function ProjectFormFull({ mode, project }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => projectToForm(project));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onPickCover = async (file: File | null) => {
    setErr(null);
    if (!file) return;
    if (file.size > UPLOAD_MAX_MB * 1024 * 1024) {
      setErr(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo ${UPLOAD_MAX_MB} MB.`);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErr('Formato não aceito. Use JPG, PNG ou WEBP.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'covers');
      const res = await fetch('/api/ong/upload-cover', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? 'Falha no upload.');
        return;
      }
      set('cover_image_url', data.url);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setErr(null);

    if (!form.title.trim()) return setErr('Título é obrigatório.');
    if (!form.description.trim()) return setErr('Descrição é obrigatória.');
    if (form.description.length > DESC_MAX) return setErr(`Descrição passou de ${DESC_MAX} caracteres.`);
    const goalSeeds = Number(form.goal_seeds);
    if (!goalSeeds || goalSeeds <= 0) return setErr('Meta em Seeds deve ser maior que zero.');

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        story: form.story,
        category: form.category,
        neighborhood: form.neighborhood,
        goal_seeds: goalSeeds,
        impact_unit: form.impact_unit,
        impact_per_seed: Number(form.impact_per_seed) || 0,
        beneficiaries_count: Number(form.beneficiaries_count) || 0,
        created_by_name: form.created_by_name,
        status: form.status,
        cover_image_url: form.cover_image_url,
      };

      const url = mode === 'create' ? '/api/ong/projects' : `/api/ong/projects/${project!.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? 'Falha ao salvar.');
        return;
      }

      const projectId = mode === 'create' ? data.id : project!.id;
      // Após criar: vai pra página de updates. Após editar: volta pra listagem.
      router.push(mode === 'create' ? `/ong/projects/${projectId}/updates` : '/ong/projects');
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async () => {
    if (mode !== 'edit' || !project) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/ong/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? 'Falha ao alterar status.');
        return;
      }
      set('status', data.status === 'paused' ? 'paused' : 'active');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'mt-1 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand focus:outline-none focus:border-cv-green text-sm';

  return (
    <div className="max-w-2xl space-y-5">
      {/* Cover */}
      <div>
        <label className="text-sm text-cv-earth/70 font-medium">Foto de capa</label>
        <div
          className="mt-2 rounded-2xl overflow-hidden border border-cv-earth/10"
          style={{
            height: 180,
            background: coverBackground(form.category, form.cover_image_url),
          }}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center rounded-full border border-cv-earth/15 px-4 py-2 cursor-pointer hover:bg-cv-sand">
            <input
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => onPickCover(e.target.files?.[0] ?? null)}
            />
            {uploading ? 'Enviando...' : form.cover_image_url ? 'Trocar foto' : 'Escolher foto'}
          </label>
          {form.cover_image_url && (
            <button
              type="button"
              onClick={() => set('cover_image_url', null)}
              className="text-sm text-red-600 hover:underline"
            >
              Remover foto
            </button>
          )}
          <span className="text-xs text-cv-earth/55">JPG, PNG ou WEBP · máx {UPLOAD_MAX_MB} MB</span>
        </div>
      </div>

      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">Título *</span>
        <input className={inp} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex: Farmácia Comunitária" />
      </label>

      <label className="block text-sm">
        <div className="flex justify-between">
          <span className="text-cv-earth/70 font-medium">Descrição curta *</span>
          <span className={`text-xs ${form.description.length > DESC_MAX ? 'text-red-600' : 'text-cv-earth/55'}`}>
            {form.description.length}/{DESC_MAX}
          </span>
        </div>
        <textarea
          className={inp}
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Resumo de uma linha que aparece no card."
          maxLength={DESC_MAX + 30}
        />
      </label>

      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">História completa</span>
        <textarea
          className={inp}
          rows={6}
          value={form.story}
          onChange={(e) => set('story', e.target.value)}
          placeholder="Conte a história do projeto: como nasceu, quem atende, qual é o impacto. Quebras de linha são preservadas."
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-cv-earth/70 font-medium">Categoria *</span>
          <select className={inp} value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-cv-earth/70 font-medium">Bairro</span>
          <input className={inp} value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} placeholder="Ex: Centro" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-cv-earth/70 font-medium">Meta em Seeds *</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className={inp}
            value={form.goal_seeds}
            onChange={(e) => set('goal_seeds', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-cv-earth/70 font-medium">Beneficiados (estimativa)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className={inp}
            value={form.beneficiaries_count}
            onChange={(e) => set('beneficiaries_count', e.target.value)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-cv-earth/70 font-medium">Unidade de impacto</span>
          <input
            className={inp}
            value={form.impact_unit}
            onChange={(e) => set('impact_unit', e.target.value)}
            placeholder="ex: medicamentos distribuídos"
          />
        </label>
        <label className="block text-sm">
          <span className="text-cv-earth/70 font-medium">Seeds por unidade</span>
          <input
            type="number"
            step="0.01"
            min={0}
            className={inp}
            value={form.impact_per_seed}
            onChange={(e) => set('impact_per_seed', e.target.value)}
            placeholder="0.5 = 1 unidade a cada 2 Seeds"
          />
          <span className="block text-xs text-cv-earth/55 mt-1">Multiplicador: cada Seed plantada gera essa quantidade.</span>
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">Criador / responsável</span>
        <input
          className={inp}
          value={form.created_by_name}
          onChange={(e) => set('created_by_name', e.target.value)}
          placeholder="Nome que aparece no card 'Criado por'"
        />
      </label>

      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">Status</span>
        <select className={inp} value={form.status} onChange={(e) => set('status', e.target.value as 'active' | 'paused')}>
          <option value="active">Ativo (visível para apoiadores)</option>
          <option value="paused">Pausado (oculto)</option>
        </select>
      </label>

      {err && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">{err}</div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button onClick={submit} disabled={saving || uploading}>
          {saving ? 'Salvando...' : mode === 'create' ? 'Criar projeto' : 'Salvar alterações'}
        </Button>
        <Button variant="secondary" onClick={() => router.push('/ong/projects')} disabled={saving}>Cancelar</Button>
        {mode === 'edit' && project && (
          <button
            type="button"
            onClick={togglePause}
            disabled={saving}
            className="ml-auto inline-flex items-center rounded-full border border-cv-earth/15 px-4 py-2 text-sm hover:bg-cv-sand disabled:opacity-50"
          >
            {form.status === 'active' ? 'Pausar projeto' : 'Reativar projeto'}
          </button>
        )}
      </div>
    </div>
  );
}
