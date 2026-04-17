import { createClient } from '@/lib/supabase/server';
import { AchievementBadge } from '@/components/consumer/AchievementBadge';
import type { Achievement } from '@/lib/supabase/types';

export default async function AchievementsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: all }, { data: mine }] = await Promise.all([
    supabase.from('achievements').select('*').order('condition_value'),
    supabase.from('user_achievements').select('achievement_id').eq('consumer_id', user.id),
  ]);

  const unlocked = new Set((mine ?? []).map((u) => u.achievement_id));

  return (
    <div>
      <div className="mb-5 pt-1">
        <p className="text-sm text-cv-earth/70">Pequenos passos que transformam a cidade.</p>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {(all as Achievement[] | null)?.map((a) => (
          <AchievementBadge key={a.id} achievement={a} unlocked={unlocked.has(a.id)} />
        ))}
      </div>
    </div>
  );
}
