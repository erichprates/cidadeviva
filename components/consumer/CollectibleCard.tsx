'use client';

import { imageForSlug, rarityConfig } from '@/lib/collectibles/images';

export interface CollectibleCardItem {
  slug: string;
  name: string;
  emoji: string;
  rarity: string;
}

export interface CollectibleCardOwned {
  quantity: number;
  first_obtained_at?: string | null;
}

interface Props {
  item: CollectibleCardItem;
  owned?: CollectibleCardOwned | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  ariaLabel?: string;
}

const SIZES = {
  sm: { img: 64 },
  md: { img: 96 },
  lg: { img: 128 },
};

export function CollectibleCard({ item, owned, size = 'md', onClick, ariaLabel }: Props) {
  const src = imageForSlug(item.slug);
  const cfg = rarityConfig(item.rarity);
  const s = SIZES[size];
  const isLendario = item.rarity === 'lendario';
  const isEpico = item.rarity === 'epico';
  const isOwned = !!owned;

  const animClass = isOwned && isLendario ? 'cv-leg-anim' : isOwned && isEpico ? 'cv-epic-anim' : '';

  return (
    <>
      <style jsx>{`
        @keyframes cv-leg-float {
          0%, 100% {
            transform: translateY(0) rotate(-1deg);
            filter: drop-shadow(0 4px 10px rgba(192, 72, 40, 0.35));
          }
          50% {
            transform: translateY(-5px) rotate(1deg);
            filter: drop-shadow(0 10px 18px rgba(232, 160, 32, 0.55));
          }
        }
        @keyframes cv-epic-pulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 3px 6px rgba(139, 105, 20, 0.3));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 6px 14px rgba(232, 160, 32, 0.55));
          }
        }
        .cv-card { transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1); }
        .cv-card:active { transform: scale(0.95); }
        .cv-leg-anim { animation: cv-leg-float 3.2s ease-in-out infinite; transform-origin: center; }
        .cv-epic-anim { animation: cv-epic-pulse 2.4s ease-in-out infinite; transform-origin: center; }
      `}</style>

      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? item.name}
        className="cv-card flex flex-col items-center gap-1.5 text-center"
        style={{ outline: 'none', background: 'transparent' }}
      >
        <div className="relative grid place-items-center" style={{ width: s.img, height: s.img }}>
          {src ? (
            <img
              src={src}
              alt={item.name}
              loading="lazy"
              className={animClass}
              style={{
                width: s.img,
                height: s.img,
                objectFit: 'contain',
                filter: isOwned ? undefined : 'grayscale(100%)',
                opacity: isOwned ? 1 : 0.35,
                transition: 'filter 200ms ease, opacity 200ms ease',
              }}
            />
          ) : (
            <span
              className={animClass}
              style={{
                fontSize: s.img * 0.7,
                opacity: isOwned ? 1 : 0.35,
                filter: isOwned ? undefined : 'grayscale(100%)',
              }}
            >
              {item.emoji}
            </span>
          )}

          {!isOwned && (
            <span
              aria-hidden
              className="absolute grid place-items-center rounded-full"
              style={{
                width: size === 'sm' ? 24 : size === 'md' ? 30 : 36,
                height: size === 'sm' ? 24 : size === 'md' ? 30 : 36,
                background: 'rgba(61, 43, 31, 0.65)',
                color: '#FEFCF8',
                fontSize: size === 'sm' ? 12 : 14,
                backdropFilter: 'blur(4px)',
              }}
            >
              🔒
            </span>
          )}

          {isOwned && owned && owned.quantity > 1 && (
            <span
              aria-label={`${owned.quantity} unidades`}
              className="absolute grid place-items-center rounded-full font-display"
              style={{
                top: 0,
                right: 0,
                minWidth: size === 'sm' ? 20 : 24,
                height: size === 'sm' ? 20 : 24,
                padding: '0 6px',
                background: cfg.color,
                color: '#FEFCF8',
                fontSize: size === 'sm' ? 11 : 12,
                fontWeight: 700,
                border: '2px solid #FEFCF8',
                zIndex: 2,
              }}
            >
              {owned.quantity}
            </span>
          )}
        </div>

        <span
          className="inline-block rounded-full px-2 py-0.5"
          style={{
            fontSize: size === 'sm' ? 9 : 10,
            background: isOwned ? cfg.bg : 'rgba(61, 43, 31, 0.06)',
            color: isOwned ? cfg.color : '#3D2B1F',
            opacity: isOwned ? 1 : 0.6,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {cfg.label}
        </span>
      </button>
    </>
  );
}
