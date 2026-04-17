'use client';

import { useEffect, useState } from 'react';
import { getUserLevel, getNextLevelMeta, reaisFromSeeds } from '@/lib/credits/calculator';
import { formatBRL, formatSeeds } from '@/lib/format';
import { SeedIcon } from '../ui/SeedIcon';
import { CoinStack } from './CoinStack';

interface Props {
  totalSeedsEarned: number;
  seedsBalance: number;
}

export function CreditWallet({ totalSeedsEarned, seedsBalance }: Props) {
  const [display, setDisplay] = useState(0);
  const level = getUserLevel(totalSeedsEarned);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const raf = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(seedsBalance * (0.2 + 0.8 * t)));
      if (t < 1) requestAnimationFrame(raf);
      else setDisplay(seedsBalance);
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, [seedsBalance]);

  return (
    <div className="relative rounded-3xl bg-cv-earth text-cv-white p-8 shadow-sm overflow-hidden">
      <div
        className="absolute bg-cv-lime/15 border border-cv-lime/30 rounded-full px-3 py-1.5 text-sm font-medium text-cv-lime whitespace-nowrap"
        style={{ top: 24, right: 24, zIndex: 3 }}
      >
        {level.level} {level.emoji}
      </div>

      <div
        className="pointer-events-none absolute"
        style={{ right: 24, bottom: 24, zIndex: 1 }}
      >
        <CoinStack seedsBalance={seedsBalance} size="md" />
      </div>

      <div className="relative z-[2]" style={{ paddingRight: 96 }}>
        <div className="text-sm opacity-80">Suas Seeds</div>
        <div className="mt-2 font-display text-6xl text-cv-lime flex items-center gap-2">
          {formatSeeds(display)}
          <SeedIcon size={40} />
        </div>

        <div className="mt-5 text-sm opacity-90">
          {level.emoji} {level.message}
        </div>

        {(() => {
          const nextMeta = getNextLevelMeta(level.level);
          if (!nextMeta) {
            return <div className="mt-4 text-xs opacity-80">Nível máximo alcançado 🌲</div>;
          }
          const missing = Math.max(0, level.next - totalSeedsEarned);
          return (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-cv-white/10 overflow-hidden">
                <div className="h-full bg-cv-lime transition-all" style={{ width: `${level.progress}%` }} />
              </div>
              <div className="mt-2 text-xs opacity-80">
                Faltam {formatSeeds(missing)} Seeds para {nextMeta.name} {nextMeta.emoji}
              </div>
            </div>
          );
        })()}

        <div className="mt-5 pt-4 border-t border-white/10 text-xs opacity-60">
          equivale a {formatBRL(reaisFromSeeds(seedsBalance))}
        </div>
      </div>
    </div>
  );
}
