'use client';

import { useEffect, useRef, useState } from 'react';
import { imageForSlug, rarityConfig } from '@/lib/collectibles/images';
import { playCollectibleSound } from '@/lib/collectibles/sounds';

export type CollectibleKind = 'marco' | 'conquista' | 'lendario' | 'sequencia' | 'desafio' | 'duplicata';

export interface CollectibleAward {
  slug: string;
  name: string;
  emoji: string;
  rarity: 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
  new: boolean;
  bonus?: number;
  kind?: CollectibleKind;
}

export const COLLECTIBLE_EVENT = 'cv:collectible-awarded';
export const LAST_SEEN_KEY = 'last_seen_collectible';

export function dispatchCollectibleAwards(awards: CollectibleAward[] | undefined | null) {
  if (typeof window === 'undefined') return;
  if (!awards?.length) return;
  for (const a of awards) {
    if (a.new) {
      try { localStorage.setItem('cv_pending_collectibles', '1'); } catch {}
    }
    window.dispatchEvent(new CustomEvent(COLLECTIBLE_EVENT, { detail: a }));
  }
}

const TOAST_DURATIONS: Record<string, number> = {
  comum: 3000,
  incomum: 4000,
  raro: 4000,
  epico: 5000,
  duplicata: 2000,
};

export function CollectibleToast() {
  const [queue, setQueue] = useState<CollectibleAward[]>([]);
  const [active, setActive] = useState<CollectibleAward | null>(null);
  const [legendary, setLegendary] = useState<CollectibleAward | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as CollectibleAward;
      if (!detail) return;
      setQueue((q) => [...q, detail]);
    }
    window.addEventListener(COLLECTIBLE_EVENT, handler);
    return () => window.removeEventListener(COLLECTIBLE_EVENT, handler);
  }, []);

  useEffect(() => {
    if (active || legendary || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));

    try { playCollectibleSound(next.rarity); } catch {}

    // Lendário novo → modal full-screen
    if (next.new && next.rarity === 'lendario') {
      setLegendary(next);
      return;
    }

    const isDupe = !next.new;
    const key = isDupe ? 'duplicata' : next.rarity;
    setActive(next);
    setVisible(true);
    const dur = TOAST_DURATIONS[key] ?? 3000;
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setActive(null), 350);
    }, dur);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [queue, active, legendary]);

  return (
    <>
      <GlobalKeyframes />
      {active && <Toast award={active} visible={visible} />}
      {legendary && <LegendaryModal award={legendary} onClose={() => setLegendary(null)} />}
    </>
  );
}

function GlobalKeyframes() {
  return (
    <style>{`
      @keyframes cv-toast-slide {
        0%   { transform: translate(-50%, -110%); opacity: 0; }
        70%  { transform: translate(-50%, 6px); opacity: 1; }
        100% { transform: translate(-50%, 0); }
      }
      @keyframes cv-toast-out {
        to { transform: translate(-50%, -120%); opacity: 0; }
      }
      @keyframes cv-flash-blue {
        0%, 100% { background-color: rgba(36, 99, 175, 0); }
        40%      { background-color: rgba(36, 99, 175, 0.35); }
      }
      @keyframes cv-border-green {
        0%, 100% { box-shadow: 0 0 0 rgba(27, 122, 74, 0); }
        50%      { box-shadow: 0 0 0 4px rgba(27, 122, 74, 0.22); }
      }
      @keyframes cv-epic-particle-1 { 0% { opacity: 0; transform: translate(0, 0) rotate(0); } 40% { opacity: 1 } 100% { opacity: 0; transform: translate(-18px, -24px) rotate(120deg); } }
      @keyframes cv-epic-particle-2 { 0% { opacity: 0; transform: translate(0, 0) rotate(0); } 40% { opacity: 1 } 100% { opacity: 0; transform: translate(22px, -22px) rotate(-120deg); } }
      @keyframes cv-epic-particle-3 { 0% { opacity: 0; transform: translate(0, 0) rotate(0); } 40% { opacity: 1 } 100% { opacity: 0; transform: translate(-24px, 18px) rotate(240deg); } }
      @keyframes cv-epic-particle-4 { 0% { opacity: 0; transform: translate(0, 0) rotate(0); } 40% { opacity: 1 } 100% { opacity: 0; transform: translate(20px, 22px) rotate(-240deg); } }
      @keyframes cv-epic-particle-5 { 0% { opacity: 0; transform: translate(0, 0) rotate(0); } 40% { opacity: 1 } 100% { opacity: 0; transform: translate(0, -28px) rotate(360deg); } }
      @keyframes cv-legendary-overlay {
        0% { opacity: 0 }
        30% { opacity: 0.6 }
        100% { opacity: 0 }
      }
      @keyframes cv-legendary-entry {
        0%   { transform: scale(0.3) rotate(-12deg); opacity: 0; }
        60%  { transform: scale(1.12) rotate(6deg); opacity: 1; }
        100% { transform: scale(1) rotate(0); }
      }
      @keyframes cv-confetti-fall-1 { 0% { transform: translateY(-10vh) rotate(0); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(110vh) rotate(540deg); opacity: 0 } }
      @keyframes cv-confetti-fall-2 { 0% { transform: translateY(-10vh) rotate(0); opacity: 0 } 20% { opacity: 1 } 100% { transform: translateY(110vh) rotate(-420deg); opacity: 0 } }
    `}</style>
  );
}

function Toast({ award, visible }: { award: CollectibleAward; visible: boolean }) {
  const isDupe = !award.new;
  const cfg = rarityConfig(award.rarity);
  const src = imageForSlug(award.slug);
  const size = isDupe ? 40 : 64;

  // Estilo por raridade
  let style: React.CSSProperties = {
    background: '#FEFCF8',
    border: `1px solid rgba(61, 43, 31, 0.08)`,
    color: '#3D2B1F',
  };
  let animationClass = '';
  if (isDupe) {
    style = {
      background: 'rgba(232, 160, 32, 0.15)',
      border: '1px solid rgba(232, 160, 32, 0.3)',
      color: '#3D2B1F',
    };
  } else if (award.rarity === 'incomum') {
    style = { ...style, background: cfg.bg };
    animationClass = 'cv-border-green-anim';
  } else if (award.rarity === 'raro') {
    style = { ...style, background: cfg.bg, border: `1px solid ${cfg.color}` };
  } else if (award.rarity === 'epico') {
    style = { ...style, background: cfg.bg, border: `1px solid ${cfg.color}` };
  }

  let headline: string;
  let subline: string;
  if (isDupe) {
    headline = `Você já tem ${award.name}`;
    subline = `+${award.bonus ?? 5} Seeds`;
  } else if (award.kind === 'marco') {
    headline = '🎁 Item desbloqueado!';
    subline = `${award.name} · ${cfg.label}`;
  } else if (award.kind === 'desafio') {
    headline = '🏁 Desafio completo!';
    subline = award.name;
  } else if (award.kind === 'sequencia') {
    headline = '🔥 Sequência recompensada!';
    subline = award.name;
  } else if (award.rarity === 'epico') {
    headline = '💎 ÉPICO!';
    subline = award.name;
  } else {
    headline = '🏆 Nova conquista!';
    subline = award.name;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[60] left-1/2 top-4"
      style={{
        transform: 'translate(-50%, 0)',
        width: 'min(92vw, 420px)',
        padding: '12px 14px',
        borderRadius: 18,
        animation: visible
          ? `cv-toast-slide 380ms cubic-bezier(0.2, 1.4, 0.6, 1)`
          : `cv-toast-out 300ms ease-out forwards`,
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
        ...style,
      }}
    >
      {award.rarity === 'raro' && !isDupe && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 18,
            animation: 'cv-flash-blue 600ms ease-out 1',
            pointerEvents: 'none',
          }}
        />
      )}
      {award.rarity === 'incomum' && !isDupe && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 18,
            animation: 'cv-border-green 1.8s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      <div className="relative flex items-center gap-3">
        <div
          className="grid place-items-center rounded-full shrink-0 relative"
          style={{
            width: size + 8,
            height: size + 8,
            background: isDupe ? 'rgba(61,43,31,0.06)' : cfg.bg,
          }}
        >
          {src ? (
            <img
              src={src}
              alt={award.name}
              style={{
                width: size,
                height: size,
                objectFit: 'contain',
                filter: isDupe ? 'grayscale(100%)' : 'none',
                opacity: isDupe ? 0.6 : 1,
              }}
            />
          ) : (
            <span style={{ fontSize: size * 0.8 }}>{award.emoji}</span>
          )}

          {award.rarity === 'epico' && !isDupe && (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    fontSize: 14,
                    top: '50%',
                    left: '50%',
                    animation: `cv-epic-particle-${i} 1.6s ease-out ${i * 0.12}s infinite`,
                    pointerEvents: 'none',
                  }}
                >
                  ✨
                </span>
              ))}
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide" style={{ opacity: 0.75 }}>
            {headline}
          </div>
          <div className="font-display mt-0.5 truncate" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>
            {subline}
          </div>
          <div
            className="inline-block mt-1 rounded-full px-2 py-0.5"
            style={{
              background: isDupe ? 'rgba(61,43,31,0.08)' : 'rgba(254,252,248,0.6)',
              color: cfg.color,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {cfg.label}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendaryModal({ award, onClose }: { award: CollectibleAward; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const src = imageForSlug(award.slug);
  const confettiItems = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* Overlay dourado breve */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(232, 160, 32, 0.55)',
          animation: 'cv-legendary-overlay 500ms ease-out forwards',
        }}
      />
      {/* Fundo final */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(61, 43, 31, 0.75)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Confete */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {confettiItems.map((i) => {
          const left = (i * 13.37) % 100;
          const delay = (i * 0.13) % 2.4;
          const kind = i % 3 === 0 ? '🎉' : i % 3 === 1 ? '✨' : '⭐';
          const anim = i % 2 === 0 ? 'cv-confetti-fall-1' : 'cv-confetti-fall-2';
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

      {/* Card central */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 text-center px-6 py-8 rounded-3xl"
        style={{
          transform: 'translate(-50%, -50%)',
          background: '#FEFCF8',
          width: 'min(92vw, 420px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          border: '2px solid #E8A020',
          animation: 'cv-legendary-entry 620ms cubic-bezier(0.2, 1.4, 0.5, 1)',
        }}
      >
        <div
          className="mx-auto grid place-items-center rounded-full"
          style={{
            width: 180,
            height: 180,
            background: 'linear-gradient(135deg, #FAECE7, #FAEEDA)',
            boxShadow: '0 20px 40px rgba(232, 160, 32, 0.35)',
          }}
        >
          {src ? (
            <img src={src} alt={award.name} style={{ width: 140, height: 140, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 100 }}>{award.emoji}</span>
          )}
        </div>
        <div
          className="inline-block mt-5 rounded-full px-4 py-1"
          style={{ background: '#C04828', color: '#FEFCF8', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em' }}
        >
          LENDÁRIO ✨
        </div>
        <h2
          className="font-display mt-3"
          style={{ fontSize: 26, fontWeight: 800, color: '#3D2B1F', letterSpacing: '-0.01em' }}
        >
          {award.name}
        </h2>
        <p className="mt-2 text-sm text-cv-earth/75">
          Pouquíssimas pessoas têm este item!
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full px-5 py-3 text-sm font-bold"
          style={{ background: '#1B7A4A', color: '#FEFCF8' }}
        >
          Incrível! 🎉
        </button>
      </div>
    </div>
  );
}
