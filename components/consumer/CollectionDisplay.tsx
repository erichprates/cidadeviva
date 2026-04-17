'use client';

import { useEffect, useState } from 'react';
import { CollectibleCard } from './CollectibleCard';
import { markCollectiblesSeen } from './BottomNav';
import { imageForSlug, rarityConfig, RARITY_ORDER_DESC, type RarityKey } from '@/lib/collectibles/images';
import { formatDate, formatSeeds } from '@/lib/format';

export interface CollectionItem {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  rarity: string;
  trigger_type: 'conquista' | 'surpresa' | 'desafio' | 'sequencia' | 'marco' | string;
  trigger_condition: Record<string, unknown> | null;
  obtained: boolean;
  quantity: number;
  first_obtained_at: string | null;
}

function describeHowToGet(item: CollectionItem): string {
  const cond = item.trigger_condition as { type?: string; value?: unknown; days?: number; chance?: number } | null;
  if (item.trigger_type === 'surpresa') {
    return 'Item surpresa — continue usando o app para ter chance de ganhá-lo.';
  }
  if (item.trigger_type === 'desafio') {
    return 'Complete o desafio semanal atual para ganhar.';
  }
  if (item.trigger_type === 'sequencia') {
    const d = Number(cond?.days ?? 0);
    return `Escaneie ${d} dia${d === 1 ? '' : 's'} consecutivo${d === 1 ? '' : 's'} para desbloquear.`;
  }
  if (item.trigger_type === 'marco') {
    return 'Ganho automaticamente a cada 5 scans aprovados.';
  }
  if (item.trigger_type === 'conquista') {
    switch (cond?.type) {
      case 'scan_count':
        return `Escaneie ${formatSeeds(Number(cond.value))} comprovantes para desbloquear.`;
      case 'seeds_earned':
        return `Acumule ${formatSeeds(Number(cond.value))} Seeds ganhos pra desbloquear.`;
      case 'projects_count':
        return `Apoie ${cond.value} projetos diferentes.`;
      case 'all_projects':
        return 'Apoie todos os projetos ativos ao mesmo tempo.';
      case 'level':
        return `Atinja o nível ${cond.value}.`;
      case 'purchase':
        return 'Compre Seeds pela primeira vez.';
      case 'purchase_above':
        return `Compre Seeds acima de R$${Number(cond.value).toFixed(0).replace('.', ',')} em uma única compra.`;
    }
  }
  return 'Continue escaneando para descobrir!';
}

interface Props {
  items: CollectionItem[];
}

export function CollectionDisplay({ items }: Props) {
  const [active, setActive] = useState<CollectionItem | null>(null);

  useEffect(() => {
    markCollectiblesSeen();
  }, []);

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

  const ownedCount = items.filter((i) => i.obtained).length;
  const legendaryOwned = items.filter((i) => i.obtained && i.rarity === 'lendario').length;
  const total = items.length;
  const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  // Agrupa por raridade. Dentro de cada seção, obtidos primeiro.
  const byRarity = new Map<RarityKey, CollectionItem[]>();
  for (const r of RARITY_ORDER_DESC) byRarity.set(r, []);
  for (const it of items) {
    const key = (it.rarity as RarityKey) in RARITY_CONFIG_EMPTY ? (it.rarity as RarityKey) : 'comum';
    (byRarity.get(key as RarityKey) ?? []).push(it);
  }
  // Ordena dentro da seção: obtidos primeiro, depois alphabetico por nome.
  for (const list of byRarity.values()) {
    list.sort((a, b) => (a.obtained === b.obtained ? a.name.localeCompare(b.name, 'pt-BR') : a.obtained ? -1 : 1));
  }

  return (
    <div>
      {/* HEADER */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-display text-xl text-cv-earth" style={{ fontWeight: 700 }}>Minha Coleção ✨</h2>
          <div className="text-xs text-cv-earth/60">
            <strong className="text-cv-earth">{ownedCount}</strong> de {total} itens
            {legendaryOwned > 0 && (
              <> · <strong style={{ color: '#C04828' }}>{legendaryOwned}</strong> lendário{legendaryOwned === 1 ? '' : 's'}</>
            )}
          </div>
        </div>
        <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(61,43,31,0.08)' }}>
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #8DC63F, #E8A020, #C04828)' }}
          />
        </div>
        <div className="mt-1 text-[11px] text-cv-earth/55 text-right">{pct}% da coleção</div>
      </div>

      {/* SEÇÕES POR RARIDADE */}
      <div className="space-y-6">
        {RARITY_ORDER_DESC.map((key) => {
          const list = byRarity.get(key) ?? [];
          if (list.length === 0) return null;
          const cfg = rarityConfig(key);
          const unlocked = list.filter((i) => i.obtained).length;
          return (
            <section key={key}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.label}
                </span>
                <span className="text-xs text-cv-earth/55">
                  {unlocked}/{list.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {list.map((it) => (
                  <CollectibleCard
                    key={it.id}
                    item={{ slug: it.slug, name: it.name, emoji: it.emoji, rarity: it.rarity }}
                    owned={it.obtained ? { quantity: it.quantity, first_obtained_at: it.first_obtained_at } : null}
                    size="md"
                    onClick={() => setActive(it)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* MODAL DE DETALHE */}
      {active && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center p-0 sm:p-4"
          style={{ background: 'rgba(61, 43, 31, 0.55)' }}
          onClick={() => setActive(null)}
        >
          <style jsx>{`
            @keyframes cv-modal-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes cv-modal-in { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .cv-detail { animation: cv-modal-up 300ms cubic-bezier(0.22, 1, 0.36, 1); }
            @media (min-width: 640px) { .cv-detail { animation: cv-modal-in 260ms cubic-bezier(0.22, 1, 0.36, 1); } }
          `}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            className="cv-detail w-full sm:max-w-sm bg-cv-white p-6 sm:p-7 text-center"
            style={{
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderBottomLeftRadius: 24,
              borderBottomRightRadius: 24,
              maxHeight: '88dvh',
              overflowY: 'auto',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
            }}
          >
            <div className="flex sm:hidden justify-center" aria-hidden>
              <div style={{ width: 40, height: 4, background: 'rgba(61,43,31,0.2)', borderRadius: 999, margin: '0 auto 12px' }} />
            </div>

            {(() => {
              const cfg = rarityConfig(active.rarity);
              const src = imageForSlug(active.slug);
              return (
                <>
                  <div
                    className="mx-auto grid place-items-center rounded-full"
                    style={{
                      width: 160,
                      height: 160,
                      background: active.obtained ? cfg.bg : 'rgba(61,43,31,0.04)',
                    }}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={active.name}
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: 'contain',
                          filter: active.obtained ? 'none' : 'grayscale(100%)',
                          opacity: active.obtained ? 1 : 0.35,
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 88 }}>{active.emoji}</span>
                    )}
                  </div>

                  <div
                    className="inline-block mt-4 rounded-full px-3 py-1"
                    style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    {cfg.label}
                  </div>
                  <h3 className="font-display text-cv-earth mt-2" style={{ fontSize: 22, fontWeight: 700 }}>
                    {active.obtained ? active.name : 'Item bloqueado 🔒'}
                  </h3>

                  {active.obtained ? (
                    <>
                      <p className="mt-3 text-sm text-cv-earth/80">{active.description}</p>
                      {active.first_obtained_at && (
                        <div className="mt-4 text-xs text-cv-earth/60">
                          Obtido em {formatDate(active.first_obtained_at)}
                        </div>
                      )}
                      {active.quantity > 1 && (
                        <div className="mt-1 text-xs text-cv-earth/60">
                          Você tem <strong>{active.quantity}</strong> unidades
                        </div>
                      )}
                      <div
                        className="mt-4 rounded-xl px-3 py-2 text-left text-xs"
                        style={{ background: 'rgba(61,43,31,0.04)' }}
                      >
                        <span className="text-cv-earth/55">Como obter mais: </span>
                        <span className="text-cv-earth/85">{describeHowToGet(active)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-sm text-cv-earth/80">
                        <span className="block">{describeHowToGet(active)}</span>
                      </p>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setActive(null)}
                    className="mt-6 w-full rounded-full bg-cv-green text-cv-white px-5 py-3 text-sm font-semibold active:scale-[0.98]"
                  >
                    Fechar
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

const RARITY_CONFIG_EMPTY: Record<RarityKey, true> = {
  comum: true,
  incomum: true,
  raro: true,
  epico: true,
  lendario: true,
};
