import type { Achievement } from '@/lib/supabase/types';

export function AchievementBadge({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  return (
    <div
      className={`rounded-2xl p-5 border transition ${
        unlocked
          ? 'bg-cv-white border-cv-gold/40 shadow-sm'
          : 'bg-cv-sand border-cv-earth/10 opacity-60'
      }`}
    >
      <div className="text-3xl">{achievement.icon}</div>
      <h4 className="mt-2 font-display text-lg">{achievement.title}</h4>
      <p className="mt-1 text-sm text-cv-earth/70">{achievement.description}</p>
      {unlocked ? (
        <div className="mt-3 text-xs text-cv-gold font-medium">✓ Conquistada</div>
      ) : (
        <div className="mt-3 text-xs text-cv-earth/50">Bloqueada</div>
      )}
    </div>
  );
}
