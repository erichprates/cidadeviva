import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { computeStreakDays } from '@/lib/collectibles/award';

export interface UnlockedAchievement {
  slug: string;
  title: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
}

export interface CheckResult {
  unlocked: UnlockedAchievement[];
}

export async function checkAchievements(
  consumerId: string,
  client?: SupabaseClient,
): Promise<CheckResult> {
  const service = client ?? createServiceClient();

  const [
    { data: achievements },
    { data: unlocked },
    { count: receiptCount },
    { data: wallet },
    { data: allocSaude },
    { data: allAllocs },
    { data: activeProjects },
  ] = await Promise.all([
    service.from('achievements').select('*'),
    service.from('user_achievements').select('achievement_id').eq('consumer_id', consumerId),
    service
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('consumer_id', consumerId)
      .eq('status', 'approved'),
    service
      .from('credit_wallets')
      .select('total_earned, total_seeds_earned')
      .eq('consumer_id', consumerId)
      .maybeSingle(),
    service
      .from('allocations')
      .select('id, projects!inner(category)')
      .eq('consumer_id', consumerId)
      .eq('projects.category', 'saude'),
    service.from('allocations').select('project_id').eq('consumer_id', consumerId),
    service.from('projects').select('id').eq('status', 'active'),
  ]);

  const alreadyUnlocked = new Set((unlocked ?? []).map((u) => u.achievement_id as string));
  const totalSeedsEarned = Number(wallet?.total_seeds_earned ?? 0);
  const saudeSupports = allocSaude?.length ?? 0;
  const approved = receiptCount ?? 0;

  const supportedProjectIds = new Set((allAllocs ?? []).map((a) => a.project_id as string));
  const activeProjectIds = (activeProjects ?? []).map((p) => p.id as string);
  const allActiveSupported =
    activeProjectIds.length > 0 && activeProjectIds.every((id) => supportedProjectIds.has(id));

  const needsStreak = (achievements ?? []).some(
    (a) => a.condition_type === 'streak_days' && !alreadyUnlocked.has(a.id as string),
  );
  const streakDays = needsStreak ? await computeStreakDays(service, consumerId) : 0;

  const newly: UnlockedAchievement[] = [];
  for (const ach of achievements ?? []) {
    if (alreadyUnlocked.has(ach.id as string)) continue;
    let meets = false;
    switch (ach.condition_type) {
      case 'receipt_count':
        meets = approved >= Number(ach.condition_value);
        break;
      case 'total_amount':
        // condition_value está em Seeds ganhos (total_seeds_earned)
        meets = totalSeedsEarned >= Number(ach.condition_value);
        break;
      case 'projects_supported':
        meets = saudeSupports >= Number(ach.condition_value);
        break;
      case 'streak_days':
        meets = streakDays >= Number(ach.condition_value);
        break;
      case 'all_projects':
        meets = allActiveSupported;
        break;
    }
    if (meets) {
      const { error } = await service.from('user_achievements').insert({
        consumer_id: consumerId,
        achievement_id: ach.id,
      });
      if (!error) {
        newly.push({
          slug: ach.slug as string,
          title: ach.title as string,
          description: ach.description as string,
          icon: ach.icon as string,
          condition_type: ach.condition_type as string,
          condition_value: Number(ach.condition_value),
        });
      }
    }
  }

  return { unlocked: newly };
}
