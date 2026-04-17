'use client';

import { achievementDifficulty, achievementImage } from '@/lib/achievements/images';
import { formatSeeds } from '@/lib/format';
import { timeAgoPt } from '@/lib/avatars';

export interface AchievementItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
}

interface Props {
  achievement: AchievementItem;
  unlocked: boolean;
  unlockedAt?: string | null;
  progressCurrent?: number;
  showProgress?: boolean;
  onClick?: () => void;
}

function progressLabel(type: string, current: number, target: number): string {
  switch (type) {
    case 'receipt_count':
      return `${formatSeeds(current)} de ${formatSeeds(target)} comprovantes`;
    case 'streak_days':
      return `${current} de ${target} dias seguidos`;
    case 'total_amount':
      return `${formatSeeds(current)} de ${formatSeeds(target)} Seeds`;
    case 'projects_supported':
      return `${current} de ${target} projetos de saúde`;
    case 'all_projects':
      return `${current} de ${target} projetos apoiados`;
    default:
      return `${current} / ${target}`;
  }
}

export function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
  progressCurrent,
  showProgress = true,
  onClick,
}: Props) {
  const diff = achievementDifficulty(achievement.slug);
  const img = achievementImage(achievement.slug);
  const target = Number(achievement.condition_value ?? 0);
  const current = Math.min(Number(progressCurrent ?? 0), target);
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const isEpic = diff.level >= 6;
  const isHigh = diff.level >= 4;

  const animClass = unlocked && isEpic ? 'cv-ach-epic-anim' : unlocked && isHigh ? 'cv-ach-high-anim' : '';

  return (
    <>
      <style jsx>{`
        @keyframes cv-ach-epic-float {
          0%, 100% {
            transform: translateY(0) rotate(-1deg);
            filter: drop-shadow(0 4px 10px rgba(192, 72, 40, 0.3));
          }
          50% {
            transform: translateY(-5px) rotate(1deg);
            filter: drop-shadow(0 10px 18px rgba(232, 160, 32, 0.55));
          }
        }
        @keyframes cv-ach-high-pulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 3px 6px rgba(139, 105, 20, 0.28));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 6px 14px rgba(232, 160, 32, 0.5));
          }
        }
        .cv-ach-card { transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1); }
        .cv-ach-card:active { transform: scale(0.96); }
        .cv-ach-epic-anim { animation: cv-ach-epic-float 3.2s ease-in-out infinite; transform-origin: center; }
        .cv-ach-high-anim { animation: cv-ach-high-pulse 2.4s ease-in-out infinite; transform-origin: center; }
      `}</style>

      <button
        type="button"
        onClick={onClick}
        aria-label={achievement.title}
        className="cv-ach-card text-center flex flex-col items-center gap-2"
        style={{ outline: 'none', background: 'transparent' }}
      >
        <div className="relative grid place-items-center" style={{ width: 112, height: 112 }}>
          {img ? (
            <img
              src={img}
              alt={achievement.title}
              loading="lazy"
              className={animClass}
              style={{
                width: 112,
                height: 112,
                objectFit: 'contain',
                filter: unlocked ? undefined : 'grayscale(100%)',
                opacity: unlocked ? 1 : 0.35,
                transition: 'filter 200ms ease, opacity 200ms ease',
              }}
            />
          ) : (
            <span
              className={animClass}
              style={{
                fontSize: 78,
                opacity: unlocked ? 1 : 0.35,
                filter: unlocked ? undefined : 'grayscale(100%)',
              }}
            >
              {achievement.icon}
            </span>
          )}
          {!unlocked && (
            <span
              aria-hidden
              className="absolute grid place-items-center rounded-full"
              style={{
                width: 34,
                height: 34,
                background: 'rgba(61,43,31,0.7)',
                color: '#FEFCF8',
                fontSize: 15,
                backdropFilter: 'blur(4px)',
              }}
            >
              🔒
            </span>
          )}
        </div>

        <div className="w-full">
          <div
            className="font-display"
            style={{
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.2,
              color: unlocked ? '#3D2B1F' : 'rgba(61,43,31,0.55)',
            }}
          >
            {achievement.title}
          </div>
          <span
            className="inline-block mt-1 rounded-full px-2 py-0.5"
            style={{
              fontSize: 9,
              background: unlocked ? diff.color : 'rgba(61,43,31,0.15)',
              color: unlocked ? '#FEFCF8' : 'rgba(61,43,31,0.65)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {diff.label}
          </span>
          {unlocked && unlockedAt && (
            <div className="mt-1 text-[10px] text-cv-earth/55">{timeAgoPt(unlockedAt)}</div>
          )}
          {!unlocked && showProgress && target > 0 && (
            <div className="mt-2 px-2">
              <div className="h-1.5 rounded-full bg-cv-sand overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, background: diff.color, opacity: 0.8 }}
                />
              </div>
              <div className="mt-1 text-[10px] text-cv-earth/55">
                {progressLabel(achievement.condition_type, current, target)}
              </div>
            </div>
          )}
        </div>
      </button>
    </>
  );
}
