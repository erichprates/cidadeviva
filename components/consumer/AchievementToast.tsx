'use client';

import { useEffect, useState } from 'react';
import { achievementDifficulty, achievementImage } from '@/lib/achievements/images';
import { playCollectibleSound } from '@/lib/collectibles/sounds';

export interface AchievementUnlock {
  slug: string;
  title: string;
  description: string;
  icon: string;
  condition_type?: string;
  condition_value?: number;
}

export const ACHIEVEMENT_EVENT = 'cv:achievement-unlocked';

export function dispatchAchievementUnlocks(list: AchievementUnlock[] | undefined | null) {
  if (typeof window === 'undefined') return;
  if (!list?.length) return;
  for (const a of list) {
    window.dispatchEvent(new CustomEvent(ACHIEVEMENT_EVENT, { detail: a }));
  }
}

export function AchievementToast() {
  const [queue, setQueue] = useState<AchievementUnlock[]>([]);
  const [active, setActive] = useState<AchievementUnlock | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as AchievementUnlock;
      if (!detail) return;
      setQueue((q) => [...q, detail]);
    }
    window.addEventListener(ACHIEVEMENT_EVENT, handler);
    return () => window.removeEventListener(ACHIEVEMENT_EVENT, handler);
  }, []);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));
    setActive(next);
    try {
      const diff = achievementDifficulty(next.slug);
      // Épico/Difícil → som de raridade épica; resto → raro
      playCollectibleSound(diff.level >= 6 ? 'epico' : diff.level >= 5 ? 'epico' : 'raro');
    } catch {}
  }, [queue, active]);

  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [active]);

  if (!active) return null;

  const diff = achievementDifficulty(active.slug);
  const img = achievementImage(active.slug);
  const isEpic = diff.level >= 6;
  const confettiItems = Array.from({ length: 18 }, (_, i) => i);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0"
      style={{ zIndex: 9999 }}
      onClick={() => setActive(null)}
    >
      <style>{`
        @keyframes cv-ach-bounce-in {
          0%   { transform: scale(0.3); opacity: 0; }
          50%  { transform: scale(1.1); opacity: 1; }
          70%  { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes cv-ach-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cv-ach-card-in {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes cv-ach-confetti-1 { 0% { transform: translateY(-10vh) rotate(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(110vh) rotate(540deg); opacity: 0 } }
        @keyframes cv-ach-confetti-2 { 0% { transform: translateY(-10vh) rotate(0); opacity: 0 } 20% { opacity: 1 } 100% { transform: translateY(110vh) rotate(-420deg); opacity: 0 } }
      `}</style>

      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(61, 43, 31, 0.7)',
          backdropFilter: 'blur(3px)',
          animation: 'cv-ach-fade-in 240ms ease-out',
        }}
      />

      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {confettiItems.map((i) => {
          const left = (i * 17.31) % 100;
          const delay = (i * 0.17) % 2.8;
          const kind = i % 3 === 0 ? '🎉' : i % 3 === 1 ? '✨' : '⭐';
          const anim = i % 2 === 0 ? 'cv-ach-confetti-1' : 'cv-ach-confetti-2';
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: 0,
                fontSize: 22,
                animation: `${anim} ${2.4 + (i % 4) * 0.4}s linear ${delay}s infinite`,
              }}
            >
              {kind}
            </span>
          );
        })}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 text-center px-6 py-8 rounded-3xl"
        style={{
          transform: 'translate(-50%, -50%)',
          background: '#FEFCF8',
          width: 'min(92vw, 420px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          border: `2px solid ${diff.color}`,
          animation: 'cv-ach-card-in 360ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="mx-auto grid place-items-center rounded-full"
          style={{
            width: 180,
            height: 180,
            background: diff.bg,
            boxShadow: `0 20px 40px ${diff.color}40`,
            animation: isEpic
              ? 'cv-ach-bounce-in 700ms cubic-bezier(0.2, 1.4, 0.5, 1)'
              : 'cv-ach-bounce-in 520ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {img ? (
            <img src={img} alt={active.title} style={{ width: 140, height: 140, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 100 }}>{active.icon}</span>
          )}
        </div>

        <div
          className="inline-block mt-5 rounded-full px-4 py-1"
          style={{ background: diff.color, color: '#FEFCF8', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          {diff.label}
        </div>
        <div className="mt-2 text-sm font-bold" style={{ color: diff.color }}>
          🏆 Conquista desbloqueada!
        </div>
        <h2
          className="font-display mt-1"
          style={{ fontSize: 24, fontWeight: 800, color: '#3D2B1F', letterSpacing: '-0.01em' }}
        >
          {active.title}
        </h2>
        <p className="mt-2 text-sm text-cv-earth/75">{active.description}</p>
        <button
          type="button"
          onClick={() => setActive(null)}
          className="mt-6 w-full rounded-full px-5 py-3 text-sm font-bold"
          style={{ background: '#1B7A4A', color: '#FEFCF8' }}
        >
          Incrível! 🎉
        </button>
      </div>
    </div>
  );
}
