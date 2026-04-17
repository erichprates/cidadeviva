import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { DUPLICATE_BONUS_SEEDS, type AwardKind, type AwardResult, type CollectibleItem } from './types';

export interface WeeklyChallenge {
  title: string;
  description: string;
  target: number;
  current: number;
  item_slug: string;
  item_name: string;
  item_emoji: string;
  rarity: 'incomum' | 'raro' | 'lendario';
  ends_at: string;
  starts_at: string;
  completed: boolean;
}

function getISOWeekRange(now: Date = new Date()): { start: Date; end: Date; week: number } {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7; // 1=seg ... 7=dom
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day - 1));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 7);
  sunday.setUTCHours(0, 0, 0, 0);
  const yearStart = new Date(Date.UTC(monday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((monday.getTime() - yearStart.getTime()) / 86400000 + yearStart.getUTCDay() + 1) / 7);
  return { start: monday, end: sunday, week };
}

function pickChallenge(week: number) {
  // Alterna entre o lendário Globo e o raro Cesta de Frutas.
  if (week % 2 === 0) {
    return {
      type: 'weekly_scans' as const,
      target: 5,
      title: '5 scans em 7 dias',
      description: 'Escaneie 5 comprovantes essa semana e ganhe o Globo do Impacto.',
      item_slug: 'globo',
      item_name: 'Globo do Impacto',
      item_emoji: '🌍',
      rarity: 'lendario' as const,
    };
  }
  return {
    type: 'weekly_plants' as const,
    target: 2,
    title: 'Plante em 2 projetos',
    description: 'Faça pelo menos um plantio em 2 projetos diferentes essa semana.',
    item_slug: 'cesta_frutas',
    item_name: 'Cesta de Frutas',
    item_emoji: '🧺',
    rarity: 'raro' as const,
  };
}

export async function getWeeklyChallenge(
  consumerId: string,
  service?: SupabaseClient,
): Promise<WeeklyChallenge> {
  const sb = service ?? createServiceClient();
  const { start, end, week } = getISOWeekRange();
  const challenge = pickChallenge(week);

  let current = 0;

  if (challenge.type === 'weekly_scans') {
    const { count } = await sb
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('consumer_id', consumerId)
      .eq('status', 'approved')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());
    current = count ?? 0;
  } else {
    const { data: allocs } = await sb
      .from('allocations')
      .select('project_id')
      .eq('consumer_id', consumerId)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString());
    current = new Set((allocs ?? []).map((a) => a.project_id as string)).size;
  }

  return {
    title: challenge.title,
    description: challenge.description,
    target: challenge.target,
    current: Math.min(current, challenge.target),
    item_slug: challenge.item_slug,
    item_name: challenge.item_name,
    item_emoji: challenge.item_emoji,
    rarity: challenge.rarity,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    completed: current >= challenge.target,
  };
}

export async function checkWeeklyChallenge(
  consumerId: string,
): Promise<{ completed: boolean; awarded?: AwardResult | null }> {
  const service = createServiceClient();
  const challenge = await getWeeklyChallenge(consumerId, service);

  if (!challenge.completed) return { completed: false };

  const { data: itemRow } = await service
    .from('collectible_items')
    .select('*')
    .eq('slug', challenge.item_slug)
    .maybeSingle();

  if (!itemRow) return { completed: true, awarded: null };
  const item = itemRow as CollectibleItem;
  const baseKind: AwardKind = item.rarity === 'lendario' ? 'lendario' : 'desafio';

  const { data: existing } = await service
    .from('user_collectibles')
    .select('id, obtained_count, seeds_bonus_earned, quantity, first_obtained_at')
    .eq('consumer_id', consumerId)
    .eq('item_id', item.id)
    .maybeSingle();

  // Premia uma vez por janela: se já obteve nessa semana, não repete.
  if (existing && new Date(existing.first_obtained_at as string) >= new Date(challenge.starts_at)) {
    return { completed: true, awarded: null };
  }

  if (!existing) {
    await service.from('user_collectibles').insert({
      consumer_id: consumerId,
      item_id: item.id,
      quantity: 1,
      obtained_count: 1,
      seeds_bonus_earned: 0,
    });
    return { completed: true, awarded: { item, new: true, kind: baseKind } };
  }

  const newCount = Number(existing.obtained_count ?? 1) + 1;
  const newBonus = Number(existing.seeds_bonus_earned ?? 0) + DUPLICATE_BONUS_SEEDS;
  const newQty = Number(existing.quantity ?? 1) + 1;
  await service
    .from('user_collectibles')
    .update({ obtained_count: newCount, seeds_bonus_earned: newBonus, quantity: newQty })
    .eq('id', existing.id);

  const { data: wallet } = await service
    .from('credit_wallets')
    .select('id, total_seeds_earned')
    .eq('consumer_id', consumerId)
    .maybeSingle();

  if (wallet) {
    await service
      .from('credit_wallets')
      .update({
        total_seeds_earned: Number(wallet.total_seeds_earned ?? 0) + DUPLICATE_BONUS_SEEDS,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);
  }

  return { completed: true, awarded: { item, new: false, bonus: DUPLICATE_BONUS_SEEDS, kind: 'duplicata' } };
}
