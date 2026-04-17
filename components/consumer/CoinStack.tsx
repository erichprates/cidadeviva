'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  seedsBalance: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Limiares escolhidos para dar sensação de progressão visível desde o primeiro scan
// até um acúmulo grande, sem que a pilha estoure o layout do card.
const THRESHOLDS = [1, 25, 75, 200, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

function countFromSeeds(seeds: number): number {
  if (seeds <= 0) return 0;
  return THRESHOLDS.filter((t) => seeds >= t).length;
}

const SIZES = {
  sm: { coinW: 40, coinH: 14, offset: 6 },
  md: { coinW: 72, coinH: 24, offset: 10 },
  lg: { coinW: 92, coinH: 30, offset: 12 },
};

export function CoinStack({ seedsBalance, size = 'md', className = '' }: Props) {
  const target = countFromSeeds(seedsBalance);
  const [displayCount, setDisplayCount] = useState(target);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);
  const prevTarget = useRef(target);
  const { coinW, coinH, offset } = SIZES[size];

  useEffect(() => {
    if (prevTarget.current === target) return;
    const prev = prevTarget.current;
    prevTarget.current = target;

    if (prev < target) {
      let i = prev;
      const id = setInterval(() => {
        i += 1;
        setDisplayCount(i);
        if (i >= target) clearInterval(id);
      }, 180);
      return () => clearInterval(id);
    }

    // Shrink: fade out a moeda de cima antes de desmontar
    let i = prev;
    const tick = () => {
      const topIdx = i - 1;
      setRemovingIdx(topIdx);
      window.setTimeout(() => {
        i -= 1;
        setDisplayCount(i);
        setRemovingIdx(null);
        if (i > target) window.setTimeout(tick, 60);
      }, 260);
    };
    tick();
    return;
  }, [target]);

  const totalHeight = Math.max(coinH, coinH + (Math.max(0, displayCount - 1) * offset));

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: coinW,
        height: totalHeight,
        transition: 'height 320ms ease',
      }}
      aria-hidden
    >
      {Array.from({ length: displayCount }).map((_, i) => {
        const bottom = i * offset;
        const isRemoving = removingIdx === i;
        return (
          <img
            key={`coin-${i}`}
            src="/assets/moeda_soma.png"
            alt=""
            className={isRemoving ? 'cv-coin-pop' : 'cv-coin-drop'}
            style={{
              position: 'absolute',
              bottom,
              left: 0,
              width: coinW,
              height: coinH,
              objectFit: 'contain',
              animationDelay: isRemoving ? '0ms' : `${i * 70}ms`,
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.28))',
              zIndex: i,
            }}
          />
        );
      })}
      <style>{`
        @keyframes cv-coin-drop-kf {
          0%   { transform: translateY(-48px) scale(0.85); opacity: 0; }
          55%  { transform: translateY(5px)  scale(1.06); opacity: 1; }
          78%  { transform: translateY(-3px) scale(0.98); }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes cv-coin-pop-kf {
          0%   { transform: translateY(0)    scale(1);    opacity: 1; }
          100% { transform: translateY(-34px) scale(0.7); opacity: 0; }
        }
        .cv-coin-drop {
          animation: cv-coin-drop-kf 640ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .cv-coin-pop {
          animation: cv-coin-pop-kf 260ms ease-in forwards;
        }
      `}</style>
    </div>
  );
}
