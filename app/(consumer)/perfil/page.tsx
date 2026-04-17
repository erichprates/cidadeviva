import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { CollectionDisplay, type CollectionItem } from '@/components/consumer/CollectionDisplay';
import { AchievementDisplay, type AchievementRow } from '@/components/consumer/AchievementDisplay';
import { MyDataForm } from '@/components/consumer/MyDataForm';
import { computeStreakDays } from '@/lib/collectibles/award';
import { getWeeklyChallenge } from '@/lib/collectibles/weekly-challenge';
import { getUserLevel } from '@/lib/credits/calculator';
import type { Achievement } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const RARITY_TEXT: Record<string, string> = {
  comum: 'comum',
  incomum: 'incomum',
  raro: 'raro',
  lendario: 'lendário',
};

export default async function PerfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();

  const [
    { data: profile },
    { data: wallet },
    { count: scanCount },
    { data: allocs },
    { data: items },
    { data: ownedRows },
    { data: achievementsList },
    { data: unlockedAch },
    streakDays,
    weekly,
    { data: saudeAllocs },
    { data: activeProjectsList },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url, created_at, phone, whatsapp_optin').eq('id', user.id).maybeSingle(),
    supabase.from('credit_wallets').select('total_seeds_earned, seeds_allocated, total_allocated').eq('consumer_id', user.id).maybeSingle(),
    supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('consumer_id', user.id).eq('status', 'approved'),
    supabase.from('allocations').select('project_id').eq('consumer_id', user.id),
    service.from('collectible_items').select('*').order('rarity_score', { ascending: true }),
    supabase.from('user_collectibles').select('item_id, quantity, first_obtained_at').eq('consumer_id', user.id),
    supabase.from('achievements').select('*').order('condition_value'),
    supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('consumer_id', user.id),
    computeStreakDays(service, user.id),
    getWeeklyChallenge(user.id, service),
    service
      .from('allocations')
      .select('id, projects!inner(category)')
      .eq('consumer_id', user.id)
      .eq('projects.category', 'saude'),
    service.from('projects').select('id').eq('status', 'active'),
  ]);

  const fullName: string = (profile?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Comunidade';
  const avatarUrl = (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null;
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join('') || '?';

  const totalSeedsEarned = Number(wallet?.total_seeds_earned ?? 0);
  const level = getUserLevel(totalSeedsEarned);

  const ownedMap = new Map(
    (ownedRows ?? []).map((r) => [r.item_id as string, r]),
  );

  const collectionItems: CollectionItem[] = (items ?? []).map((it) => {
    const owned = ownedMap.get(it.id);
    return {
      id: it.id,
      slug: it.slug,
      name: it.name,
      emoji: it.emoji,
      description: it.description,
      rarity: it.rarity,
      trigger_type: it.trigger_type,
      trigger_condition: (it.trigger_condition as Record<string, unknown> | null) ?? null,
      obtained: !!owned,
      quantity: Number(owned?.quantity ?? 0),
      first_obtained_at: (owned?.first_obtained_at as string | undefined) ?? null,
    };
  });

  const unlockedSet = new Set((unlockedAch ?? []).map((u) => u.achievement_id as string));
  const unlockedDateMap = new Map(
    (unlockedAch ?? []).map((u) => [u.achievement_id as string, u.unlocked_at as string]),
  );

  // Progresso atual de cada conquista.
  const supportedIds = new Set((allocs ?? []).map((a) => a.project_id as string));
  const activeIds = new Set((activeProjectsList ?? []).map((p) => p.id as string));
  const supportedActiveCount = Array.from(activeIds).filter((id) => supportedIds.has(id)).length;
  const saudeSupportsCount = saudeAllocs?.length ?? 0;

  function progressFor(type: string): number {
    switch (type) {
      case 'receipt_count':
        return scanCount ?? 0;
      case 'streak_days':
        return streakDays;
      case 'total_amount':
        return totalSeedsEarned;
      case 'projects_supported':
        return saudeSupportsCount;
      case 'all_projects':
        return supportedActiveCount;
      default:
        return 0;
    }
  }

  const achievementRows: AchievementRow[] = ((achievementsList as Achievement[] | null) ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    description: a.description,
    icon: a.icon,
    condition_type: a.condition_type,
    // Pra "all_projects" o target na UI é o número de projetos ativos (não o 1 do DB)
    condition_value: a.condition_type === 'all_projects' ? activeIds.size : Number(a.condition_value),
    unlocked: unlockedSet.has(a.id),
    unlocked_at: unlockedDateMap.get(a.id) ?? null,
    progress_current:
      a.condition_type === 'all_projects' ? supportedActiveCount : progressFor(a.condition_type),
  }));

  return (
    <div className="space-y-6 pt-1">
      {/* HEADER */}
      <Card className="!p-5">
        <div className="flex items-center gap-4">
          <div
            className="rounded-full overflow-hidden shrink-0"
            style={{ width: 64, height: 64 }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div
                className="w-full h-full grid place-items-center"
                style={{
                  background: 'rgba(141, 198, 63, 0.25)',
                  color: '#1B7A4A',
                  fontFamily: 'var(--font-outfit), sans-serif',
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display truncate" style={{ fontSize: 24, color: '#3D2B1F', lineHeight: 1.1 }}>
              {fullName}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'rgba(141, 198, 63, 0.18)', color: '#1B7A4A' }}
              >
                {level.emoji} {level.level}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: 'rgba(232, 160, 32, 0.18)', color: '#a06a00' }}
              >
                🔥 {streakDays} dia{streakDays === 1 ? '' : 's'} seguidos
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* DESAFIO DA SEMANA */}
      <section>
        <h2 className="font-display text-xl mb-3 text-cv-earth">Desafio da semana</h2>
        <div
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, rgba(27,122,74,0.95), rgba(141,198,63,0.95))', color: '#FEFCF8' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs opacity-90 uppercase tracking-wide">Esta semana</div>
              <div className="font-display text-xl mt-1">{weekly.title}</div>
              <div className="text-sm opacity-90 mt-1">{weekly.description}</div>
            </div>
            <div className="text-3xl">{weekly.item_emoji}</div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span>{weekly.current} / {weekly.target}</span>
              <span>
                Termina em {Math.max(0, Math.ceil((new Date(weekly.ends_at).getTime() - Date.now()) / 86400000))} dia(s)
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${Math.round((weekly.current / weekly.target) * 100)}%`, background: '#FEFCF8' }}
              />
            </div>
          </div>
          <div className="mt-3 text-xs opacity-90">
            Prêmio: {weekly.item_emoji} {weekly.item_name} ({RARITY_TEXT[weekly.rarity]})
          </div>
        </div>
      </section>

      {/* COLEÇÃO */}
      <section>
        <CollectionDisplay items={collectionItems} />
        <div
          className="mt-4 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3"
          style={{ background: 'rgba(141, 198, 63, 0.18)', color: '#1B7A4A' }}
        >
          <span>
            🎁 Próximo item garantido em{' '}
            <strong>{(scanCount ?? 0) % 5 === 0 ? 5 : 5 - ((scanCount ?? 0) % 5)} scans</strong>
          </span>
          <span className="text-xs opacity-80">a cada 5 scans</span>
        </div>
      </section>

      {/* CONQUISTAS */}
      <section>
        <AchievementDisplay achievements={achievementRows} />
      </section>

      <section>
        <h2 className="font-display text-xl mb-3 text-cv-earth">Meus dados</h2>
        <MyDataForm
          userId={user.id}
          initialFullName={fullName}
          initialAvatarUrl={avatarUrl}
          initialPhone={(profile as { phone?: string | null })?.phone ?? null}
          initialOptin={(profile as { whatsapp_optin?: boolean })?.whatsapp_optin ?? true}
        />
      </section>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Sair da conta</div>
            <div className="text-xs text-cv-earth/60">Encerrar a sessão neste aparelho</div>
          </div>
          <LogoutButton className="rounded-full border border-cv-earth/15 px-4 py-2" />
        </div>
      </Card>
    </div>
  );
}
