'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { PlantAnimation } from './PlantAnimation';
import { MIN_SEEDS_TO_PLANT, reaisFromSeeds } from '@/lib/credits/calculator';
import { playPlantSound } from '@/lib/sounds';
import { dispatchCollectibleAwards, type CollectibleAward } from './CollectibleToast';
import { dispatchAchievementUnlocks, type AchievementUnlock } from './AchievementToast';
import { formatBRL, formatSeeds } from '@/lib/format';
import { SeedIcon } from '../ui/SeedIcon';

interface Props {
  projectId: string;
  projectTitle: string;
  seedsBalance: number;
  className?: string;
  variant?: 'block' | 'inline';
}

export function PlantButton({ projectId, projectTitle, seedsBalance, className = '', variant = 'block' }: Props) {
  const [open, setOpen] = useState(false);
  const [seeds, setSeeds] = useState<string>(String(MIN_SEEDS_TO_PLANT));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [pressed, setPressed] = useState(false);

  const canPlant = seedsBalance >= MIN_SEEDS_TO_PLANT;
  const seedsNum = Math.floor(Number(seeds.replace(',', '.')) || 0);
  const reais = reaisFromSeeds(seedsNum);
  const valid = seedsNum >= MIN_SEEDS_TO_PLANT && seedsNum <= seedsBalance;

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
        body: JSON.stringify({ project_id: projectId, seeds: seedsNum }),
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

  const isBlock = variant === 'block';
  const baseClass = `relative inline-flex items-center justify-center rounded-full transition active:scale-[0.98] ${
    isBlock ? 'w-full' : ''
  } ${className}`;
  const baseStyle: React.CSSProperties = {
    height: isBlock ? 56 : 40,
    fontFamily: 'var(--font-outfit), sans-serif',
    fontWeight: 700,
    fontSize: isBlock ? 16 : 13,
    letterSpacing: '0.08em',
  };
  const plantW = isBlock ? 72 : 50;

  return (
    <>
      {canPlant ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Plantar Seeds"
          className={`${baseClass} bg-cv-green text-cv-white hover:bg-cv-green/90`}
          style={baseStyle}
        >
          <span>PLANTAR{isBlock ? ' SEEDS' : ''}</span>
          <img
            src="/assets/plantar.png"
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              width: plantW,
              height: plantW,
              bottom: 0,
              right: isBlock ? -8 : -6,
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
          title={`Mínimo ${MIN_SEEDS_TO_PLANT} 🌱 — você tem ${seedsBalance}`}
          className={`${baseClass} bg-cv-earth/10 text-cv-earth/40 cursor-not-allowed`}
          style={baseStyle}
        >
          <span>PLANTAR{isBlock ? ` (MÍN. ${MIN_SEEDS_TO_PLANT})` : ''}</span>
          <img
            src="/assets/plantar.png"
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              width: plantW,
              height: plantW,
              bottom: 0,
              right: isBlock ? -8 : -6,
              objectFit: 'contain',
              objectPosition: 'bottom',
              pointerEvents: 'none',
              filter: 'grayscale(100%)',
              opacity: 0.4,
            }}
          />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cv-earth/40 p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-cv-white rounded-3xl p-6 border border-cv-earth/10">
            <h3 className="font-display text-xl">Plantar em {projectTitle}</h3>
            <p className="mt-1 text-sm text-cv-earth/70">
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

      {showAnimation && <PlantAnimation projectTitle={projectTitle} onDone={onAnimationDone} />}
    </>
  );
}
