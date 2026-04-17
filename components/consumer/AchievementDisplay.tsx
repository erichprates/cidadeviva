'use client';

import { useEffect, useState } from 'react';
import { AchievementCard, type AchievementItem } from './AchievementCard';
import { achievementCondition, achievementDifficulty, achievementHint, achievementImage } from '@/lib/achievements/images';
import { formatDate } from '@/lib/format';

export interface AchievementRow extends AchievementItem {
  unlocked: boolean;
  unlocked_at: string | null;
  progress_current: number;
}

interface Props {
  achievements: AchievementRow[];
}

function progressLine(type: string, current: number, target: number): string {
  switch (type) {
    case 'receipt_count':
      return `${current} de ${target} comprovantes`;
    case 'streak_days':
      return `${current} de ${target} dias seguidos`;
    case 'total_amount':
      return `${current.toLocaleString('pt-BR')} de ${target.toLocaleString('pt-BR')} Seeds`;
    case 'projects_supported':
      return `${current} de ${target} projetos de saúde`;
    case 'all_projects':
      return `${current} de ${target} projetos ativos`;
    default:
      return `${current} / ${target}`;
  }
}

export function AchievementDisplay({ achievements }: Props) {
  const [active, setActive] = useState<AchievementRow | null>(null);

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

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const total = achievements.length;
  const pct = total > 0 ? Math.round((unlockedCount / total) * 100) : 0;

  // Ordena por dificuldade crescente (iniciante → lendária), independente de estar desbloqueada.
  const sorted = [...achievements].sort((a, b) => {
    const la = achievementDifficulty(a.slug).level;
    const lb = achievementDifficulty(b.slug).level;
    if (la !== lb) return la - lb;
    return a.title.localeCompare(b.title, 'pt-BR');
  });

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-display text-xl text-cv-earth" style={{ fontWeight: 700 }}>Conquistas 🏆</h2>
          <div className="text-xs text-cv-earth/60">
            <strong className="text-cv-earth">{unlockedCount}</strong> de {total} desbloqueadas
          </div>
        </div>
        <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(61,43,31,0.08)' }}>
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1B7A4A, #185FA5, #8B6914, #C04828)' }}
          />
        </div>
        <div className="mt-1 text-[11px] text-cv-earth/55 text-right">{pct}% concluído</div>
      </div>

      {achievements.length === 0 ? (
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-8 text-center">
          <div className="text-3xl">🏆</div>
          <p className="mt-2 text-sm text-cv-earth/65">
            Nenhuma conquista cadastrada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sorted.map((a) => (
            <AchievementCard
              key={a.id}
              achievement={a}
              unlocked={a.unlocked}
              unlockedAt={a.unlocked_at}
              progressCurrent={a.progress_current}
              onClick={() => setActive(a)}
            />
          ))}
        </div>
      )}

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
            @keyframes cv-pulse-soft {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.06); }
            }
            .cv-ach-detail { animation: cv-modal-up 300ms cubic-bezier(0.22, 1, 0.36, 1); }
            @media (min-width: 640px) { .cv-ach-detail { animation: cv-modal-in 260ms cubic-bezier(0.22, 1, 0.36, 1); } }
            .cv-pulse { animation: cv-pulse-soft 2.2s ease-in-out infinite; display: inline-block; }
          `}</style>

          <div
            onClick={(e) => e.stopPropagation()}
            className="cv-ach-detail w-full sm:max-w-sm bg-cv-white p-6 sm:p-7 text-center"
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
            {(() => {
              const diff = achievementDifficulty(active.slug);
              const img = achievementImage(active.slug);
              const target = Number(active.condition_value ?? 0);
              const current = Math.min(active.progress_current, target);
              const pctInner = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              return (
                <>
                  <div className="flex sm:hidden justify-center" aria-hidden>
                    <div style={{ width: 40, height: 4, background: 'rgba(61,43,31,0.2)', borderRadius: 999, margin: '0 auto 12px' }} />
                  </div>

                  <div
                    className={active.unlocked ? 'cv-pulse' : ''}
                    style={{
                      margin: '0 auto',
                      width: 160,
                      height: 160,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      background: active.unlocked ? diff.bg : 'rgba(61,43,31,0.04)',
                    }}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={active.title}
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: 'contain',
                          filter: active.unlocked ? 'none' : 'grayscale(100%)',
                          opacity: active.unlocked ? 1 : 0.35,
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 88 }}>{active.icon}</span>
                    )}
                  </div>

                  <div
                    className="inline-block mt-4 rounded-full px-3 py-1"
                    style={{ background: diff.color, color: '#FEFCF8', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {diff.label}
                  </div>

                  <h3 className="font-display text-cv-earth mt-2" style={{ fontSize: 22, fontWeight: 700 }}>
                    {active.title}
                  </h3>

                  {active.unlocked ? (
                    <>
                      <p className="mt-3 text-sm text-cv-earth/80">{active.description}</p>
                      {active.unlocked_at && (
                        <div className="mt-4 text-sm text-cv-green">
                          🎉 Desbloqueada em {formatDate(active.unlocked_at)}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mt-3 text-xs text-cv-earth/65 uppercase tracking-wide">🔒 Ainda não desbloqueada</div>
                      <p className="mt-2 text-sm text-cv-earth/80">
                        {achievementCondition(active.condition_type, target)}
                      </p>
                      {target > 0 && active.condition_type !== 'all_projects' && (
                        <div className="mt-4">
                          <div className="h-2 rounded-full bg-cv-sand overflow-hidden">
                            <div className="h-full transition-all" style={{ width: `${pctInner}%`, background: diff.color }} />
                          </div>
                          <div className="mt-1 text-xs text-cv-earth/60 text-left">
                            {progressLine(active.condition_type, current, target)}
                          </div>
                        </div>
                      )}
                      <div
                        className="mt-4 rounded-xl px-3 py-2 text-xs"
                        style={{ background: diff.bg, color: diff.color }}
                      >
                        💡 {achievementHint(active.slug)}
                      </div>
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
