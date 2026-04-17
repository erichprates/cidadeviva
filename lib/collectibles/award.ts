import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import {
  AwardContext,
  AwardKind,
  AwardResult,
  CollectibleItem,
  DUPLICATE_BONUS_SEEDS,
  EventType,
  MARCO_INTERVAL_SCANS,
  Rarity,
} from './types';

// Decide se um item específico deve ser avaliado para o evento atual.
// Itens 'desafio' e 'marco' são tratados em fluxos próprios.
function isEligible(item: CollectibleItem, event: EventType): boolean {
  if (item.trigger_type === 'desafio') return false;
  if (item.trigger_type === 'marco') return false;
  if (item.trigger_type === 'sequencia') return event === 'scan';
  if (item.trigger_type === 'surpresa') {
    // Lendários surpresa antigos foram convertidos pra weekly/purchase_above.
    // Surpresas válidas precisam ter chance > 0; sem chance, não disparam.
    const cond = item.trigger_condition as { chance?: number } | null;
    return event === 'scan' && Number(cond?.chance ?? 0) > 0;
  }
  if (item.trigger_type === 'conquista') {
    const cond = item.trigger_condition as { type?: string } | null;
    switch (cond?.type) {
      case 'scan_count':
        return event === 'scan';
      case 'seeds_earned':
        return event === 'scan' || event === 'purchase';
      case 'level':
        return event === 'scan' || event === 'purchase';
      case 'projects_count':
        return event === 'plant';
      case 'all_projects':
        return event === 'plant';
      case 'purchase':
        return event === 'purchase';
      case 'purchase_above':
        return event === 'purchase';
      default:
        return false;
    }
  }
  return false;
}

function checkConquista(item: CollectibleItem, ctx: AwardContext): boolean {
  const cond = item.trigger_condition as { type?: string; value?: unknown } | null;
  if (!cond?.type) return false;

  const v = cond.value;
  switch (cond.type) {
    case 'scan_count':
      return (ctx.scan_count ?? 0) >= Number(v);
    case 'seeds_earned':
      return (ctx.seeds_earned ?? 0) >= Number(v);
    case 'projects_count':
      return (ctx.projects_count ?? 0) >= Number(v);
    case 'all_projects':
      return !!ctx.all_active_projects_supported;
    case 'purchase':
      return (ctx.purchase_count ?? 0) >= Number(v);
    case 'purchase_above':
      return (ctx.purchase_amount ?? 0) >= Number(v);
    case 'level':
      return matchesLevel(ctx.level, String(v));
    default:
      return false;
  }
}

const LEVEL_ORDER = ['Broto', 'Muda', 'Árvore', 'Floresta'];

function matchesLevel(current: string | undefined, target: string): boolean {
  if (!current) return false;
  return LEVEL_ORDER.indexOf(current) >= LEVEL_ORDER.indexOf(target);
}

function checkSurpresa(item: CollectibleItem): boolean {
  const cond = item.trigger_condition as { chance?: number } | null;
  const chance = Number(cond?.chance ?? 0);
  if (chance <= 0) return false;
  return Math.random() < chance;
}

function checkSequencia(item: CollectibleItem, ctx: AwardContext): boolean {
  const cond = item.trigger_condition as { days?: number } | null;
  const need = Number(cond?.days ?? 0);
  if (need <= 0) return false;
  return (ctx.streak_days ?? 0) >= need;
}

function deriveKind(item: CollectibleItem, isNew: boolean, viaMarco: boolean): AwardKind {
  if (!isNew) return 'duplicata';
  if (item.rarity === 'lendario') return 'lendario';
  if (viaMarco) return 'marco';
  if (item.trigger_type === 'sequencia') return 'sequencia';
  if (item.trigger_type === 'desafio') return 'desafio';
  return 'conquista';
}

export async function computeStreakDays(
  service: SupabaseClient,
  consumerId: string,
): Promise<number> {
  const { data } = await service
    .from('receipts')
    .select('created_at, status')
    .eq('consumer_id', consumerId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(120);

  const days = new Set<string>();
  for (const r of data ?? []) {
    const d = new Date(r.created_at as string);
    days.add(d.toISOString().slice(0, 10));
  }
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 120; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
    } else if (i === 0) {
      // hoje sem scan: começa a contar a partir de ontem
    } else {
      break;
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function tierForScans(totalScans: number): Rarity {
  if (totalScans <= 20) return 'comum';
  if (totalScans <= 50) return 'incomum';
  return 'raro';
}

async function grantNew(
  service: SupabaseClient,
  consumerId: string,
  item: CollectibleItem,
  viaMarco: boolean,
): Promise<AwardResult | null> {
  const { error } = await service.from('user_collectibles').insert({
    consumer_id: consumerId,
    item_id: item.id,
    quantity: 1,
    obtained_count: 1,
    seeds_bonus_earned: 0,
  });
  if (error) return null;
  return { item, new: true, kind: deriveKind(item, true, viaMarco) };
}

async function grantDuplicate(
  service: SupabaseClient,
  ownedRow: { id: string; obtained_count?: number | null; seeds_bonus_earned?: number | null; quantity?: number | null },
  item: CollectibleItem,
): Promise<AwardResult | null> {
  const newCount = Number(ownedRow.obtained_count ?? 1) + 1;
  const newBonus = Number(ownedRow.seeds_bonus_earned ?? 0) + DUPLICATE_BONUS_SEEDS;
  const newQty = Number(ownedRow.quantity ?? 1) + 1;
  const { error } = await service
    .from('user_collectibles')
    .update({ obtained_count: newCount, seeds_bonus_earned: newBonus, quantity: newQty })
    .eq('id', ownedRow.id);
  if (error) return null;
  return { item, new: false, bonus: DUPLICATE_BONUS_SEEDS, kind: 'duplicata' };
}

async function creditBonusSeeds(service: SupabaseClient, consumerId: string, amount: number) {
  if (amount <= 0) return;
  const { data: wallet } = await service
    .from('credit_wallets')
    .select('id, total_seeds_earned')
    .eq('consumer_id', consumerId)
    .maybeSingle();

  if (wallet) {
    await service
      .from('credit_wallets')
      .update({
        total_seeds_earned: Number(wallet.total_seeds_earned ?? 0) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);
  } else {
    await service.from('credit_wallets').insert({
      consumer_id: consumerId,
      total_earned: 0,
      total_allocated: 0,
      total_seeds_earned: amount,
      seeds_allocated: 0,
    });
  }
}

async function awardMarcoForScan(
  service: SupabaseClient,
  consumerId: string,
  totalScans: number,
): Promise<AwardResult[]> {
  if (totalScans <= 0 || totalScans % MARCO_INTERVAL_SCANS !== 0) return [];

  const tier = tierForScans(totalScans);

  const { data: items } = await service
    .from('collectible_items')
    .select('*')
    .eq('trigger_type', 'marco');

  const pool = (items as CollectibleItem[] | null ?? []).filter((it) => {
    const cond = it.trigger_condition as { tier?: string } | null;
    return cond?.tier === tier;
  });

  if (pool.length === 0) {
    // Nenhum marco cadastrado para esse tier — credita bônus silencioso.
    await creditBonusSeeds(service, consumerId, DUPLICATE_BONUS_SEEDS);
    return [];
  }

  const { data: owned } = await service
    .from('user_collectibles')
    .select('id, item_id, obtained_count, seeds_bonus_earned, quantity')
    .eq('consumer_id', consumerId)
    .in('item_id', pool.map((p) => p.id));

  const ownedMap = new Map((owned ?? []).map((o) => [o.item_id as string, o]));
  const available = pool.filter((p) => !ownedMap.has(p.id));

  if (available.length > 0) {
    const chosen = available[Math.floor(Math.random() * available.length)];
    const result = await grantNew(service, consumerId, chosen, true);
    return result ? [result] : [];
  }

  // Já tem todos do tier — duplicata em item aleatório do pool.
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const ownedRow = ownedMap.get(chosen.id)!;
  const result = await grantDuplicate(service, ownedRow, chosen);
  if (!result) return [];
  await creditBonusSeeds(service, consumerId, DUPLICATE_BONUS_SEEDS);
  return [result]; // kind='duplicata' — toast mostra "+5 Seeds de bônus"
}

export async function awardCollectibles(
  consumerId: string,
  eventType: EventType,
  context: AwardContext,
): Promise<AwardResult[]> {
  const service = createServiceClient();

  const { data: items } = await service.from('collectible_items').select('*');
  if (!items?.length) return [];

  const eligible = (items as CollectibleItem[]).filter((it) => isEligible(it, eventType));

  const { data: owned } = await service
    .from('user_collectibles')
    .select('id, item_id, obtained_count, seeds_bonus_earned, quantity')
    .eq('consumer_id', consumerId);

  const ownedMap = new Map(
    (owned ?? []).map((u) => [u.item_id as string, u]),
  );

  const results: AwardResult[] = [];
  let totalBonusSeeds = 0;

  for (const item of eligible) {
    let earned = false;
    if (item.trigger_type === 'conquista') earned = checkConquista(item, context);
    else if (item.trigger_type === 'surpresa') earned = checkSurpresa(item);
    else if (item.trigger_type === 'sequencia') earned = checkSequencia(item, context);

    if (!earned) continue;

    const existing = ownedMap.get(item.id);
    if (!existing) {
      const r = await grantNew(service, consumerId, item, false);
      if (r) results.push(r);
    } else {
      const r = await grantDuplicate(service, existing, item);
      if (r) {
        totalBonusSeeds += DUPLICATE_BONUS_SEEDS;
        results.push(r);
      }
    }
  }

  if (totalBonusSeeds > 0) {
    await creditBonusSeeds(service, consumerId, totalBonusSeeds);
  }

  // Marco a cada N scans (independente das conquistas acima)
  if (eventType === 'scan') {
    const marco = await awardMarcoForScan(service, consumerId, context.scan_count ?? 0);
    results.push(...marco);
  }

  return results;
}

export async function buildAwardContext(
  consumerId: string,
  service?: SupabaseClient,
): Promise<AwardContext> {
  const sb = service ?? createServiceClient();

  const [{ count: scanCount }, { data: wallet }, { data: allocs }, { count: purchaseCount }] = await Promise.all([
    sb.from('receipts').select('*', { count: 'exact', head: true }).eq('consumer_id', consumerId).eq('status', 'approved'),
    sb.from('credit_wallets').select('total_seeds_earned').eq('consumer_id', consumerId).maybeSingle(),
    sb.from('allocations').select('project_id').eq('consumer_id', consumerId),
    sb.from('seed_purchases').select('*', { count: 'exact', head: true }).eq('consumer_id', consumerId).eq('payment_status', 'paid'),
  ]);

  const seeds = Number(wallet?.total_seeds_earned ?? 0);
  const userProjectIds = new Set((allocs ?? []).map((a) => a.project_id as string));
  const streak = await computeStreakDays(sb, consumerId);

  // Pra trigger 'all_projects': apoiou todos os projetos ativos?
  const { data: activeProjects } = await sb.from('projects').select('id').eq('status', 'active');
  const activeIds = (activeProjects ?? []).map((p) => p.id as string);
  const allActiveSupported =
    activeIds.length > 0 && activeIds.every((id) => userProjectIds.has(id));

  return {
    scan_count: scanCount ?? 0,
    seeds_earned: seeds,
    level: levelFromSeeds(seeds),
    projects_count: userProjectIds.size,
    purchase_count: purchaseCount ?? 0,
    streak_days: streak,
    all_active_projects_supported: allActiveSupported,
  };
}

function levelFromSeeds(total: number): string {
  if (total >= 2000) return 'Floresta';
  if (total >= 500) return 'Árvore';
  if (total >= 100) return 'Muda';
  return 'Broto';
}
