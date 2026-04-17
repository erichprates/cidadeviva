'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Lottie from 'lottie-react';
import { dispatchCollectibleAwards, type CollectibleAward } from './CollectibleToast';
import { dispatchAchievementUnlocks, type AchievementUnlock } from './AchievementToast';
import { formatBRL, formatSeeds } from '@/lib/format';
import { SeedIcon } from '../ui/SeedIcon';

type PackageType = 'broto' | 'muda' | 'arvore' | 'livre';

interface Props {
  seedsBalance: number;
}

interface Pkg {
  type: PackageType;
  name: string;
  emoji: string;
  seeds: number;
  pricePaid: number;
  priceFull: number;
  discount: number;
  popular?: boolean;
}

const PACKAGES: Pkg[] = [
  { type: 'broto', name: 'Broto', emoji: '🌱', seeds: 100, pricePaid: 10, priceFull: 10, discount: 0 },
  { type: 'muda', name: 'Muda', emoji: '🌿', seeds: 300, pricePaid: 27, priceFull: 30, discount: 10, popular: true },
  { type: 'arvore', name: 'Árvore', emoji: '🌳', seeds: 700, pricePaid: 56, priceFull: 70, discount: 20 },
];

function calcFreeMode(price: number): { seeds: number; discount: number; rate: number; message: string } {
  if (price >= 100) {
    return { seeds: Math.floor(price * 12), discount: 20, rate: 12, message: 'Você é uma Floresta de impacto! 🌲' };
  }
  if (price >= 50) {
    return { seeds: Math.floor(price * 11), discount: 10, rate: 11, message: 'Nível Árvore chegando! 🌳' };
  }
  if (price >= 20) {
    return { seeds: Math.floor(price * 10.5), discount: 5, rate: 10.5, message: 'Você está acelerando o impacto! 🌿' };
  }
  return { seeds: Math.floor(price * 10), discount: 0, rate: 10, message: 'Cada seed faz diferença 🌱' };
}

// QR code decorativo — gera padrão pseudo-aleatório determinístico com 3 cantos
function useQrPattern(seed: string) {
  return useMemo(() => {
    const size = 21;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const cells: boolean[] = [];
    for (let i = 0; i < size * size; i++) {
      h = (h * 1664525 + 1013904223) >>> 0;
      cells.push((h & 1) === 1);
    }
    // Força 3 cantos como "finder patterns" (7x7 com borda preta e miolo preto 3x3)
    const setCell = (r: number, c: number, v: boolean) => {
      cells[r * size + c] = v;
    };
    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setCell(r0 + r, c0 + c, isBorder || isInner);
        }
      }
      // apaga separator
      for (let k = 0; k < 8; k++) {
        if (r0 + 7 < size && c0 + k < size) setCell(r0 + 7, c0 + k, false);
        if (c0 + 7 < size && r0 + k < size) setCell(r0 + k, c0 + 7, false);
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);
    return { size, cells };
  }, [seed]);
}

function QrDecorative({ pixCode }: { pixCode: string }) {
  const { size, cells } = useQrPattern(pixCode);
  return (
    <div
      className="bg-white p-3 rounded-xl border border-cv-earth/10"
      style={{ width: 200, height: 200 }}
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`,
          gap: 0,
        }}
      >
        {cells.map((on, i) => (
          <div key={i} style={{ background: on ? '#0B0B0B' : '#FFFFFF' }} />
        ))}
      </div>
    </div>
  );
}


function formatTimer(ms: number) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface ActivePurchase {
  purchase_id: string;
  pix_code: string;
  seeds_amount: number;
  price_paid: number;
  expires_at: string;
}

export function SeedsPurchase({ seedsBalance }: Props) {
  const router = useRouter();
  const [freeValue, setFreeValue] = useState(20);
  const free = calcFreeMode(freeValue);

  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState<ActivePurchase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [copied, setCopied] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [celebrate, setCelebrate] = useState<{ seeds: number } | null>(null);
  const [coinAnim, setCoinAnim] = useState<unknown | null>(null);

  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!celebrate) return;
    fetch('/animations/coin.json')
      .then((r) => r.json())
      .then(setCoinAnim)
      .catch(() => setCoinAnim(null));
    const t = setTimeout(() => {
      setCelebrate(null);
      router.refresh();
    }, 3500);
    return () => clearTimeout(t);
  }, [celebrate, router]);

  const createPurchase = async (pkg: PackageType, seeds: number, pricePaid: number) => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/seeds/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_type: pkg, seeds_amount: seeds, price_paid: pricePaid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Falha ao criar compra.');
        return;
      }
      setActive(data as ActivePurchase);
      setNow(Date.now());
    } finally {
      setCreating(false);
    }
  };

  const remainingMs = active ? new Date(active.expires_at).getTime() - now : 0;

  const copy = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.pix_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const confirmPayment = async () => {
    if (!active || confirming) return;
    setConfirming(true);
    try {
      const res = await fetch('/api/seeds/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_id: active.purchase_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Falha ao confirmar pagamento.');
        return;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const seeds = Number(data.seeds_added ?? active.seeds_amount);
      setActive(null);
      setCelebrate({ seeds });
      const awards = (data.collectibles ?? []) as CollectibleAward[];
      const achievements = (data.achievements ?? []) as AchievementUnlock[];
      if (awards.length) setTimeout(() => dispatchCollectibleAwards(awards), 1500);
      if (achievements.length) setTimeout(() => dispatchAchievementUnlocks(achievements), 2500);
    } finally {
      setConfirming(false);
    }
  };

  const cancel = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActive(null);
    setError(null);
  };

  return (
    <div className="space-y-6 pt-1">
      <div>
        <h1 className="font-display text-cv-earth inline-flex items-center gap-2" style={{ fontSize: '28px' }}>
          Comprar Seeds <SeedIcon size={26} />
        </h1>
        <p className="mt-1 text-sm text-cv-earth/70">
          Plante mais, impacte mais. Quanto mais Seeds, maior o desconto.
        </p>
      </div>

      <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-cv-earth/60">Seeds disponíveis</div>
          <div className="font-display text-2xl mt-0.5 inline-flex items-center gap-1.5" style={{ color: '#E8A020' }}>
            <SeedIcon size={22} /> {formatSeeds(seedsBalance)}
          </div>
        </div>
        <div className="text-xs text-cv-earth/50 max-w-[45%] text-right">
          Use para plantar em projetos ou compre mais para impactar mais.
        </div>
      </div>

      <section>
        <div className="grid grid-cols-3 gap-3">
          {PACKAGES.map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => createPurchase(p.type, p.seeds, p.pricePaid)}
              disabled={creating}
              className="relative text-left rounded-2xl bg-cv-white p-3 transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
              style={{
                border: p.popular ? '2px solid #1B7A4A' : '1px solid rgba(61, 43, 31, 0.08)',
                boxShadow: p.popular ? '0 4px 14px rgba(27, 122, 74, 0.18)' : 'none',
              }}
            >
              {p.popular && (
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: '#1B7A4A', color: '#FEFCF8' }}
                >
                  Mais Popular
                </div>
              )}
              {p.discount > 0 && (
                <div
                  className="absolute top-2 right-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: '#8DC63F', color: '#3D2B1F' }}
                >
                  -{p.discount}%
                </div>
              )}
              <div className="text-2xl">{p.emoji}</div>
              <div className="mt-1 font-display text-sm text-cv-earth">{p.name}</div>
              <div className="mt-1 font-display text-xl inline-flex items-center gap-1" style={{ color: '#1B7A4A' }}>
                {p.seeds}
                <SeedIcon size={14} />
              </div>
              {p.discount > 0 && (
                <div className="mt-1 text-[11px] text-cv-earth/40 line-through">
                  {formatBRL(p.priceFull)}
                </div>
              )}
              <div className="mt-0.5 font-bold text-cv-earth text-sm">
                {formatBRL(p.pricePaid)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-cv-white border border-cv-earth/5 p-5">
        <h2 className="font-display text-lg text-cv-earth">Ou escolha seu valor 🎯</h2>
        <div className="mt-4 text-center">
          <div className="font-display text-4xl text-cv-earth">{formatBRL(freeValue)}</div>
          <div className="mt-1 text-sm inline-flex items-center gap-1" style={{ color: '#1B7A4A' }}>
            você ganha <strong>{free.seeds}</strong> <SeedIcon size={14} /> Seeds
            {free.discount > 0 && (
              <span className="ml-1 text-xs text-cv-earth/60">({free.discount}% de bônus)</span>
            )}
          </div>
        </div>

        <input
          type="range"
          min={5}
          max={200}
          step={1}
          value={freeValue}
          onChange={(e) => setFreeValue(Number(e.target.value))}
          className="mt-4 w-full accent-cv-green"
          style={{ accentColor: '#1B7A4A' }}
        />
        <div className="mt-1 flex justify-between text-[11px] text-cv-earth/50">
          <span>R$ 5</span>
          <span>R$ 200</span>
        </div>

        <div className="mt-3 text-center text-sm text-cv-earth/70">{free.message}</div>

        <button
          type="button"
          onClick={() => createPurchase('livre', free.seeds, freeValue)}
          disabled={creating}
          className="mt-4 w-full rounded-full py-3 font-semibold text-cv-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#1B7A4A' }}
        >
          Comprar {free.seeds} Seeds por {formatBRL(freeValue)}
        </button>
      </section>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {active && (
        <PixModal
          active={active}
          remainingMs={remainingMs}
          onCopy={copy}
          copied={copied}
          onConfirm={confirmPayment}
          confirming={confirming}
          onCancel={cancel}
        />
      )}

      {celebrate && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-6"
          style={{ background: 'rgba(27, 122, 74, 0.92)' }}
        >
          <div className="text-center text-cv-white">
            <div style={{ width: 240, height: 240 }} className="mx-auto">
              {coinAnim ? (
                <Lottie animationData={coinAnim} loop={false} autoplay />
              ) : (
                <div className="w-full h-full grid place-items-center text-7xl animate-bounce-soft">🪙</div>
              )}
            </div>
            <h2 className="font-display text-4xl mt-2">+{celebrate.seeds} Seeds adicionados!</h2>
            <p className="mt-2 text-cv-white/85">Prontos para plantar em um projeto.</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface PixModalProps {
  active: ActivePurchase;
  remainingMs: number;
  onCopy: () => void;
  copied: boolean;
  onConfirm: () => void;
  confirming: boolean;
  onCancel: () => void;
}

function PixModal({ active, remainingMs, onCopy, copied, onConfirm, confirming, onCancel }: PixModalProps) {
  const expired = remainingMs <= 0;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
    >
      <div
        className="bg-cv-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
        style={{ maxHeight: '92dvh', overflowY: 'auto' }}
      >
        <div className="text-center">
          <h2 className="font-display text-2xl text-cv-earth">Pague via PIX</h2>
          <p className="mt-1 text-sm text-cv-earth/70">
            <strong>{active.seeds_amount}</strong> Seeds por <strong>{formatBRL(active.price_paid)}</strong>
          </p>
        </div>

        <div className="mt-5 grid place-items-center">
          <QrDecorative pixCode={active.pix_code} />
        </div>

        <div className="mt-5">
          <div className="text-xs text-cv-earth/60 mb-1">Código PIX (copia e cola)</div>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 rounded-xl border border-cv-earth/10 bg-cv-sand px-3 py-2 text-xs text-cv-earth font-mono break-all">
              {active.pix_code}
            </div>
            <button
              type="button"
              onClick={onCopy}
              className="rounded-xl px-3 text-sm font-medium transition-all duration-200 active:scale-95"
              style={{ background: '#8DC63F', color: '#3D2B1F' }}
            >
              {copied ? '✓' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-sm">
          {expired ? (
            <span className="text-red-600 font-medium">PIX expirado</span>
          ) : (
            <span className="text-cv-earth/70">
              Expira em <strong className="text-cv-earth">{formatTimer(remainingMs)}</strong>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming || expired}
          className="mt-5 w-full rounded-full py-3 font-semibold text-cv-white transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#1B7A4A' }}
        >
          {confirming ? 'Confirmando...' : 'Simular pagamento ✓'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="mt-2 w-full text-sm text-cv-earth/60 hover:text-cv-earth py-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
