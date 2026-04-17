'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/supabase/types';
import { getCategory } from '@/lib/categories';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { seedsFromAmount } from '@/lib/credits/calculator';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';
import { timeAgoPt } from '@/lib/avatars';

export interface NgoProjectRow extends Project {
  unique_planters: number;
  total_planted_seeds: number;
}

const CATEGORY_OPTIONS = [
  { v: 'all', l: 'Todas as categorias' },
  { v: 'saude', l: '💊 Saúde' },
  { v: 'educacao', l: '📚 Educação' },
  { v: 'alimentacao', l: '🥗 Alimentação' },
  { v: 'cultura', l: '🎨 Cultura' },
  { v: 'meio_ambiente', l: '🌿 Meio Ambiente' },
];

type StatusFilter = 'all' | 'active' | 'paused';

export function NgoProjectsList({ projects }: { projects: NgoProjectRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (status !== 'all' && p.status !== status) return false;
      if (q && !p.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, category, status]);

  const remove = async (p: NgoProjectRow) => {
    if (p.unique_planters > 0) return;
    if (!confirm(`Excluir "${p.title}"? Essa ação não pode ser desfeita.`)) return;
    setDeletingId(p.id);
    const res = await fetch(`/api/ong/projects/${p.id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? 'Falha ao excluir.');
      return;
    }
    router.refresh();
  };

  return (
    <div>
      <style>{`
        @keyframes cv-confetti-fall {
          0% { transform: translateY(-8px) rotate(0); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateY(26px) rotate(180deg); opacity: 0; }
        }
        .cv-confetti span { animation: cv-confetti-fall 2.4s ease-in infinite; display: inline-block; }
      `}</style>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-2 mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="flex-1 rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-white text-sm focus:outline-none focus:border-cv-green"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-full border border-cv-earth/15 px-3 py-2 bg-cv-white text-sm focus:outline-none focus:border-cv-green"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.v} value={c.v}>{c.l}</option>
          ))}
        </select>
        <div className="flex gap-1 rounded-full p-1 bg-cv-earth/5">
          {(['all', 'active', 'paused'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setStatus(k)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition whitespace-nowrap"
              style={{
                background: status === k ? '#FEFCF8' : 'transparent',
                color: '#3D2B1F',
                boxShadow: status === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {k === 'all' ? 'Todos' : k === 'active' ? 'Ativos' : 'Pausados'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-cv-white rounded-2xl p-10 text-center text-cv-earth/60 border border-cv-earth/5">
          {projects.length === 0 ? (
            <>
              <div className="mb-2 inline-block"><SeedIcon size={44} /></div>
              <div className="font-display text-lg text-cv-earth">Nenhum projeto ainda</div>
              <p className="mt-1 text-sm">Crie seu primeiro projeto para começar a receber Seeds da comunidade.</p>
              <Link
                href="/ong/projects/new"
                className="mt-4 inline-flex items-center rounded-full bg-cv-green text-cv-white px-5 py-2 text-sm font-medium"
              >
                Novo projeto +
              </Link>
            </>
          ) : (
            <div className="text-sm">Nenhum projeto bate com os filtros atuais.</div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => {
          const cat = getCategory(p.category);
          const goalSeeds = Number(p.goal_seeds ?? 0) || seedsFromAmount(Number(p.goal_amount));
          const currentSeeds = Number(p.current_seeds ?? 0) || seedsFromAmount(Number(p.current_amount));
          const hasGoal = goalSeeds > 0;
          const pct = hasGoal ? Math.min(100, Math.round((currentSeeds / goalSeeds) * 100)) : 0;
          const isActive = p.status === 'active';
          const reached = hasGoal && pct >= 100;
          const canDelete = !isActive && p.unique_planters === 0;

          return (
            <article key={p.id} className="rounded-2xl bg-cv-white border border-cv-earth/5 overflow-hidden flex flex-col">
              <ProjectCover
                coverUrl={p.cover_image_url}
                category={p.category}
                title={p.title}
                height={140}
                titleSize={18}
              >
                <span
                  className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{ background: 'rgba(254,252,248,0.22)', color: '#FEFCF8', backdropFilter: 'blur(4px)' }}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </span>
                <span
                  className="absolute top-2.5 right-2.5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: isActive ? 'rgba(254,252,248,0.95)' : 'rgba(232,160,32,0.95)',
                    color: isActive ? '#1B7A4A' : '#3D2B1F',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {isActive ? 'Ativo' : 'Pausado'}
                </span>
              </ProjectCover>

              {reached && (
                <div
                  className="relative overflow-hidden flex items-center justify-center gap-2 px-3 py-2"
                  style={{ background: 'rgba(27, 122, 74, 0.15)', color: '#1B7A4A' }}
                >
                  <span aria-hidden className="cv-confetti" style={{ position: 'absolute', left: 10, top: 2 }}>
                    <span style={{ fontSize: 12, animationDelay: '0s' }}>🎉</span>
                  </span>
                  <span aria-hidden className="cv-confetti" style={{ position: 'absolute', right: 14, top: 4 }}>
                    <span style={{ fontSize: 12, animationDelay: '0.6s' }}>✨</span>
                  </span>
                  <span aria-hidden className="cv-confetti" style={{ position: 'absolute', left: '40%', top: 0 }}>
                    <span style={{ fontSize: 11, animationDelay: '1.2s' }}>🌱</span>
                  </span>
                  <strong className="text-sm font-semibold">🎉 Meta atingida!</strong>
                </div>
              )}

              <div className="p-4 flex flex-col gap-3 flex-1">
                {p.neighborhood && (
                  <div className="text-cv-earth/55" style={{ fontSize: 12 }}>
                    📍 {p.neighborhood}
                  </div>
                )}

                <div>
                  <div className="h-2 rounded-full bg-cv-sand overflow-hidden">
                    <div className="h-full bg-cv-lime transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between" style={{ fontSize: 11 }}>
                    {hasGoal ? (
                      <>
                        <span className="text-cv-earth/65 inline-flex items-center gap-1">
                          <strong className="text-cv-green">{formatSeeds(currentSeeds)}</strong> / {formatSeeds(goalSeeds)} <SeedIcon size={11} />
                        </span>
                        <span className="font-medium text-cv-green">{pct}%</span>
                      </>
                    ) : (
                      <span className="text-cv-earth/60 italic">Meta não definida</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-cv-earth/65">
                  <span>👥 <strong>{formatSeeds(p.beneficiaries_count ?? 0)}</strong> beneficiados</span>
                  <span className="inline-flex items-center gap-1"><SeedIcon size={11} /> <strong>{formatSeeds(p.unique_planters)}</strong> plantador{p.unique_planters === 1 ? '' : 'es'} únicos</span>
                  <span>🗓️ Criado {timeAgoPt(p.created_at)}</span>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Link
                    href={`/ong/projects/${p.id}/edit`}
                    className={`flex-1 min-w-[110px] inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-medium transition ${
                      !hasGoal
                        ? 'bg-cv-gold/20 border border-cv-gold/50 text-cv-earth'
                        : 'border border-cv-earth/15 text-cv-earth hover:bg-cv-sand'
                    }`}
                  >
                    Editar ✏️
                    {!hasGoal && <span className="ml-1 text-[10px] font-semibold" style={{ color: '#a06a00' }}>· sem meta</span>}
                  </Link>
                  <Link
                    href={`/ong/projects/${p.id}/updates`}
                    className="flex-1 min-w-[110px] inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-3 py-2 text-sm font-medium hover:bg-cv-green/90 transition active:scale-95"
                  >
                    Atualizações 📢
                  </Link>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      disabled={deletingId === p.id}
                      className="text-xs text-red-600 hover:bg-red-50 rounded-full px-3 py-2 border border-red-200 disabled:opacity-50"
                      title="Sem plantios — pode excluir."
                    >
                      {deletingId === p.id ? 'Excluindo...' : '🗑️ Excluir'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
