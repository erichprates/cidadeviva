'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { PlantAnimation } from './PlantAnimation';
import type { Project } from '@/lib/supabase/types';
import { MIN_SEEDS_TO_PLANT, reaisFromSeeds, seedsFromAmount } from '@/lib/credits/calculator';
import { playPlantSound } from '@/lib/sounds';
import { dispatchCollectibleAwards, type CollectibleAward } from './CollectibleToast';
import { dispatchAchievementUnlocks, type AchievementUnlock } from './AchievementToast';
import { colorForName, firstName, initials } from '@/lib/avatars';
import { getCategory } from '@/lib/categories';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { SeedIcon } from '@/components/ui/SeedIcon';
import { formatBRL, formatSeeds } from '@/lib/format';

export interface PlanterMini {
  consumer_id: string;
  name: string;
}

interface Props {
  project: Project;
  seedsBalance: number;
  planters?: PlanterMini[];
  totalPlanters?: number;
}

export function ProjectCard({ project, seedsBalance, planters = [], totalPlanters }: Props) {
  const [open, setOpen] = useState(false);
  const [seeds, setSeeds] = useState<string>(String(MIN_SEEDS_TO_PLANT));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [pressed, setPressed] = useState(false);

  const canPlant = seedsBalance >= MIN_SEEDS_TO_PLANT;
  const goalSeeds = Number(project.goal_seeds ?? 0) || seedsFromAmount(Number(project.goal_amount));
  const currentSeeds = Number(project.current_seeds ?? 0) || seedsFromAmount(Number(project.current_amount));
  const pct = Math.min(100, Math.round((currentSeeds / Math.max(1, goalSeeds)) * 100));
  const seedsNum = Math.floor(Number(seeds.replace(',', '.')) || 0);
  const reais = reaisFromSeeds(seedsNum);
  const valid = seedsNum >= MIN_SEEDS_TO_PLANT && seedsNum <= seedsBalance;

  const cat = getCategory(project.category);
  const impactPerSeed = Number(project.impact_per_seed ?? 0);
  const impactNow = Math.floor(currentSeeds * impactPerSeed);
  const impactUnit = project.impact_unit ?? 'beneficiados';

  const visible = planters.slice(0, 5);
  const extra = (totalPlanters ?? planters.length) - visible.length;

  const submit = async () => {
    if (!valid) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 150);
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, seeds: seedsNum }),
      });
      const data = (await res.json()) as { error?: string; collectibles?: CollectibleAward[]; achievements?: AchievementUnlock[] };
      if (res.ok) {
        setOpen(false);
        playPlantSound();
        setShowAnimation(true);
        setTimeout(() => dispatchCollectibleAwards(data.collectibles), 1200);
        setTimeout(() => dispatchAchievementUnlocks(data.achievements), 2200);
      } else {
        setMsg(data.error ?? 'Falha.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onAnimationDone = () => {
    setShowAnimation(false);
    window.location.reload();
  };

  return (
    <>
      <article className="rounded-2xl bg-cv-white border border-cv-earth/5 overflow-hidden flex flex-col">
        {/* Cover com título centralizado */}
        <ProjectCover
          coverUrl={project.cover_image_url}
          category={project.category}
          title={project.title}
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
        </ProjectCover>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3 flex-1">
          {project.neighborhood && (
            <div className="text-cv-earth/55" style={{ fontSize: 12 }}>
              📍 {project.neighborhood}
            </div>
          )}

          <div>
            <div className="h-2 rounded-full bg-cv-sand overflow-hidden">
              <div className="h-full bg-cv-lime transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between" style={{ fontSize: 11 }}>
              <span className="text-cv-earth/65 inline-flex items-center gap-1">
                <strong className="text-cv-green">{formatSeeds(currentSeeds)}</strong>
                {' / '}
                {formatSeeds(goalSeeds)}
                <SeedIcon size={12} />
              </span>
              <span className="font-medium text-cv-green">{pct}%</span>
            </div>
          </div>

          {impactPerSeed > 0 && (
            <div
              className="rounded-lg px-3 py-2"
              style={{ background: 'rgba(141, 198, 63, 0.15)', fontSize: 12 }}
            >
              <span className="text-cv-earth/75">≈ </span>
              <strong className="text-cv-green">{formatSeeds(impactNow)}</strong>
              <span className="text-cv-earth/75"> {impactUnit}</span>
            </div>
          )}

          {/* Planters */}
          {visible.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {visible.map((p) => {
                  const c = colorForName(p.name);
                  return (
                    <span
                      key={p.consumer_id}
                      className="grid place-items-center rounded-full border-2 border-cv-white"
                      style={{ width: 24, height: 24, background: c.bg, color: c.fg, fontSize: 10, fontWeight: 700 }}
                      title={p.name}
                    >
                      {initials(p.name)}
                    </span>
                  );
                })}
                {extra > 0 && (
                  <span
                    className="grid place-items-center rounded-full border-2 border-cv-white"
                    style={{
                      width: 24,
                      height: 24,
                      background: '#3D2B1F',
                      color: '#FEFCF8',
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    +{extra}
                  </span>
                )}
              </div>
              <span className="text-cv-earth/60" style={{ fontSize: 11 }}>
                {visible.length === 1 && extra <= 0
                  ? `${firstName(visible[0].name)} plantando`
                  : `${firstName(visible[0].name)} e mais ${(totalPlanters ?? visible.length) - 1} pessoa${(totalPlanters ?? visible.length) - 1 === 1 ? '' : 's'} plantando`}
              </span>
            </div>
          )}

          <div className="mt-auto flex gap-2 pt-1">
            <Link
              href={`/projects/${project.id}`}
              className="flex-1 inline-flex items-center justify-center rounded-full border border-cv-earth/15 px-3 py-2 text-sm font-medium text-cv-earth hover:bg-cv-sand transition"
            >
              Ver projeto →
            </Link>
            {canPlant ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Plantar Seeds"
                className="relative flex-1 inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white hover:bg-cv-green/90 transition active:scale-95"
                style={{
                  height: 40,
                  fontFamily: 'var(--font-outfit), sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.08em',
                }}
              >
                <span>PLANTAR</span>
                <img
                  src="/assets/plantar.png"
                  alt=""
                  aria-hidden
                  style={{
                    position: 'absolute',
                    width: 50,
                    height: 50,
                    bottom: 0,
                    right: -6,
                    objectFit: 'contain',
                    objectPosition: 'bottom',
                    pointerEvents: 'none',
                  }}
                />
              </button>
            ) : (
              <button
                type="button"
                disabled
                title={`Mínimo ${MIN_SEEDS_TO_PLANT} 🌱 para plantar — você tem ${seedsBalance}`}
                aria-label={`Plantar — bloqueado, mínimo ${MIN_SEEDS_TO_PLANT} Seeds`}
                className="relative flex-1 inline-flex items-center justify-center rounded-full bg-cv-earth/10 text-cv-earth/40 cursor-not-allowed"
                style={{
                  height: 40,
                  fontFamily: 'var(--font-outfit), sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.08em',
                }}
              >
                <span>PLANTAR</span>
                <img
                  src="/assets/plantar.png"
                  alt=""
                  aria-hidden
                  style={{
                    position: 'absolute',
                    width: 50,
                    height: 50,
                    bottom: 0,
                    right: -6,
                    objectFit: 'contain',
                    objectPosition: 'bottom',
                    pointerEvents: 'none',
                    filter: 'grayscale(100%)',
                    opacity: 0.4,
                  }}
                />
              </button>
            )}
          </div>
        </div>
      </article>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cv-earth/40 p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-cv-white rounded-3xl p-6 border border-cv-earth/10">
            <h3 className="font-display text-xl">Plantar em {project.title}</h3>
            <p className="mt-1 text-sm text-cv-earth/70 inline-flex items-center gap-1">
              Seu saldo: <strong className="inline-flex items-center gap-1">{seedsBalance} <SeedIcon size={14} /> Seeds</strong>
            </p>

            <label className="block mt-5 text-sm">Quantas Seeds plantar?</label>
            <input
              inputMode="numeric"
              value={seeds}
              onChange={(e) => setSeeds(e.target.value.replace(/[^0-9]/g, ''))}
              className="mt-1 w-full rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-sand focus:outline-none focus:border-cv-green text-lg font-medium"
            />
            <div className="mt-2 text-xs text-cv-earth/60">
              Mínimo {MIN_SEEDS_TO_PLANT} · Máximo {seedsBalance}
            </div>

            <div className="mt-4 bg-cv-sand rounded-2xl p-4 text-center">
              <div className="text-xs text-cv-earth/60">Equivalente em reais</div>
              <div className="font-display text-2xl text-cv-green">
                {formatSeeds(seedsNum)} Seeds = {formatBRL(reais)}
              </div>
              <div className="text-xs text-cv-earth/60 mt-1">para este projeto</div>
            </div>

            {msg && <div className="mt-4 text-sm text-cv-earth/80 text-center">{msg}</div>}

            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading} className="flex-1">Cancelar</Button>
              <Button
                onClick={submit}
                disabled={!valid || loading}
                className={`flex-1 transition-transform ${pressed ? 'scale-95' : 'scale-100'}`}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-cv-white/40 border-t-cv-white animate-spin" />
                    Plantando...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">Confirmar <SeedIcon size={16} /></span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAnimation && (
        <PlantAnimation projectTitle={project.title} onDone={onAnimationDone} />
      )}
    </>
  );
}
