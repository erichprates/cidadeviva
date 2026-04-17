import { createClient, createServiceClient } from '@/lib/supabase/server';
import { RankingTabs, PeriodFilter, type RankingTab, type RankingPeriod } from '@/components/consumer/RankingTabs';
import { getUserLevel } from '@/lib/credits/calculator';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';
import { FICTITIOUS_SEEDS, FICTITIOUS_COLLECTION, FICTITIOUS_THRESHOLD } from '@/lib/ranking/fictitious';

export const dynamic = 'force-dynamic';

interface SeedsRow {
  id: string;
  name: string;
  seeds: number;
  level_emoji: string;
  level_name: string;
  fictitious?: boolean;
}

interface CollectionRow {
  id: string;
  name: string;
  score: number;
  unique_items: number;
  legendary_count: number;
  legendary_emojis: string[];
  fictitious?: boolean;
}

function getPeriodStart(period: RankingPeriod): Date | null {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - (day - 1));
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return null;
}

async function loadSeedsRanking(period: RankingPeriod): Promise<SeedsRow[]> {
  const service = createServiceClient();
  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'consumer');
  const profMap = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));

  const totals = new Map<string, number>();
  if (period === 'all') {
    const { data: wallets } = await service
      .from('credit_wallets')
      .select('consumer_id, seeds_allocated');
    for (const w of wallets ?? []) {
      totals.set(w.consumer_id as string, Number(w.seeds_allocated ?? 0));
    }
  } else {
    const start = getPeriodStart(period)!;
    const { data: allocs } = await service
      .from('allocations')
      .select('consumer_id, seeds_amount, created_at')
      .gte('created_at', start.toISOString());
    for (const a of allocs ?? []) {
      const id = a.consumer_id as string;
      totals.set(id, (totals.get(id) ?? 0) + Number(a.seeds_amount ?? 0));
    }
  }

  // Para o nível, precisamos de total_seeds_earned por consumidor.
  const { data: walletsAll } = await service
    .from('credit_wallets')
    .select('consumer_id, total_seeds_earned');
  const earnedMap = new Map(
    (walletsAll ?? []).map((w) => [w.consumer_id as string, Number(w.total_seeds_earned ?? 0)]),
  );

  const rows: SeedsRow[] = [];
  for (const [id, seeds] of totals) {
    const name = profMap.get(id);
    if (!name) continue;
    const lvl = getUserLevel(earnedMap.get(id) ?? 0);
    rows.push({ id, name, seeds, level_emoji: lvl.emoji, level_name: lvl.level });
  }
  // Só completa com fictícios se houver poucos participantes reais no período/tab atual.
  if (rows.length < FICTITIOUS_THRESHOLD) {
    rows.push(...FICTITIOUS_SEEDS);
  }
  rows.sort((a, b) => b.seeds - a.seeds);
  return rows;
}

async function loadCollectionRanking(): Promise<CollectionRow[]> {
  const service = createServiceClient();
  const [{ data: profiles }, { data: items }, { data: owned }] = await Promise.all([
    service.from('profiles').select('id, full_name, role').eq('role', 'consumer'),
    service.from('collectible_items').select('id, slug, emoji, rarity, rarity_score'),
    service.from('user_collectibles').select('consumer_id, item_id'),
  ]);

  const profMap = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));
  const itemMap = new Map((items ?? []).map((i) => [i.id as string, i]));

  const agg = new Map<string, { score: number; uniq: number; legendary: number; legendaryEmojis: string[] }>();
  for (const o of owned ?? []) {
    const consumerId = o.consumer_id as string;
    const item = itemMap.get(o.item_id as string);
    if (!item) continue;
    const cur = agg.get(consumerId) ?? { score: 0, uniq: 0, legendary: 0, legendaryEmojis: [] };
    cur.score += Number(item.rarity_score ?? 0);
    cur.uniq += 1;
    if (item.rarity === 'lendario') {
      cur.legendary += 1;
      cur.legendaryEmojis.push(item.emoji as string);
    }
    agg.set(consumerId, cur);
  }

  const rows: CollectionRow[] = [];
  for (const [id, v] of agg) {
    const name = profMap.get(id);
    if (!name) continue;
    rows.push({
      id,
      name,
      score: v.score,
      unique_items: v.uniq,
      legendary_count: v.legendary,
      legendary_emojis: v.legendaryEmojis,
    });
  }
  if (rows.length < FICTITIOUS_THRESHOLD) {
    rows.push(...FICTITIOUS_COLLECTION);
  }
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

const PODIUM_BG = ['rgba(232, 160, 32, 0.18)', 'rgba(61, 43, 31, 0.10)', 'rgba(176, 124, 80, 0.18)'];
const MEDALS = ['🥇', '🥈', '🥉'];

function firstName(full: string) {
  return full.split(' ')[0];
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: { tab?: string; period?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const tab: RankingTab = searchParams?.tab === 'colecao' ? 'colecao' : 'seeds';
  const period: RankingPeriod =
    searchParams?.period === 'week'
      ? 'week'
      : searchParams?.period === 'month'
      ? 'month'
      : 'all';

  if (tab === 'seeds') {
    const rows = await loadSeedsRanking(period);
    const meIdx = rows.findIndex((r) => r.id === user.id);
    const top = rows.slice(0, 20);
    const inTop = meIdx >= 0 && meIdx < 20;
    const me = meIdx >= 0 ? rows[meIdx] : null;

    return (
      <div className="space-y-3 pt-1 pb-32">
        <div>
          <h1 className="font-display text-cv-earth" style={{ fontSize: 24, fontWeight: 700 }}>
            Ranking da Cidade 🏆
          </h1>
          <p className="text-sm text-cv-earth/65 mt-0.5">Quem mais transformou a cidade com Seeds</p>
        </div>
        <RankingTabs active="seeds" />
        <PeriodFilter active={period} />

        {top.length === 0 && (
          <div className="rounded-2xl bg-cv-white p-6 text-center text-cv-earth/60 text-sm">
            Ainda não há plantios neste período.
          </div>
        )}

        {/* Top 3 */}
        <div className="space-y-2">
          {top.slice(0, 3).map((r, i) => (
            <div
              key={r.id}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: PODIUM_BG[i], border: '1px solid rgba(61,43,31,0.06)' }}
            >
              <div className="text-2xl">{MEDALS[i]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg truncate text-cv-earth">
                  {firstName(r.name)}{r.fictitious && <span className="text-cv-earth/45">*</span>}
                </div>
                <div className="text-xs text-cv-earth/60">{r.level_emoji} {r.level_name}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg text-cv-green">{formatSeeds(r.seeds)}</div>
                <div className="text-[10px] text-cv-earth/60 inline-flex items-center gap-1"><SeedIcon size={10} /> plantadas</div>
              </div>
            </div>
          ))}
        </div>

        {/* Restantes */}
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 divide-y divide-cv-earth/5">
          {top.slice(3).map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 text-sm text-cv-earth/60 font-medium">#{i + 4}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">
                  {firstName(r.name)}{r.fictitious && <span className="text-cv-earth/45">*</span>}
                </div>
                <div className="text-[10px] text-cv-earth/55">{r.level_emoji} {r.level_name}</div>
              </div>
              <div className="text-sm font-medium text-cv-green inline-flex items-center gap-1">{formatSeeds(r.seeds)} <SeedIcon size={12} /></div>
            </div>
          ))}
        </div>

        {top.some((r) => r.fictitious) && (
          <div className="text-[11px] text-cv-earth/55 text-center pt-1">
            * Alguns participantes são demonstrativos enquanto a comunidade cresce 🌱
          </div>
        )}

        {!inTop && me && (
          <div className="rounded-2xl bg-cv-earth text-cv-white p-3 flex items-center gap-3">
            <div className="text-xs opacity-80 w-12">#{meIdx + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{firstName(me.name)} (você)</div>
              <div className="text-[10px] opacity-70">{me.level_emoji} {me.level_name}</div>
            </div>
            <div className="text-sm font-medium text-cv-lime inline-flex items-center gap-1">{formatSeeds(me.seeds)} <SeedIcon size={12} /></div>
          </div>
        )}

        {/* Footer fixo com posição */}
        <div
          className="fixed left-0 right-0 z-30 px-4"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto max-w-xl">
            <div
              className="rounded-2xl p-3 text-sm flex items-center justify-between"
              style={{
                background: 'rgba(27, 122, 74, 0.95)',
                color: '#FEFCF8',
                boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span>
                {me
                  ? <>Você está em <strong>#{meIdx + 1}</strong> entre os Maiores Impactadores</>
                  : 'Plante para entrar no ranking'}
              </span>
              {me && (
                <span className="opacity-95 shrink-0 inline-flex items-center gap-1">
                  {formatSeeds(me.seeds)} <SeedIcon size={12} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tab: Coleção
  const rows = await loadCollectionRanking();
  const meIdx = rows.findIndex((r) => r.id === user.id);
  const top = rows.slice(0, 20);
  const inTop = meIdx >= 0 && meIdx < 20;
  const me = meIdx >= 0 ? rows[meIdx] : null;

  return (
    <div className="space-y-3 pt-1 pb-32">
      <div>
        <h1 className="font-display text-cv-earth" style={{ fontSize: 24, fontWeight: 700 }}>
          Ranking da Cidade 🏆
        </h1>
        <p className="text-sm text-cv-earth/65 mt-0.5">Quem tem os itens mais raros do Cidade Viva</p>
      </div>
      <RankingTabs active="colecao" />

      {top.length === 0 && (
        <div className="rounded-2xl bg-cv-white p-6 text-center text-cv-earth/60 text-sm">
          Ainda não há colecionadores. Comece a escanear!
        </div>
      )}

      <div className="space-y-2">
        {top.slice(0, 3).map((r, i) => (
          <div
            key={r.id}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: PODIUM_BG[i], border: '1px solid rgba(61,43,31,0.06)' }}
          >
            <div className="text-2xl">{MEDALS[i]}</div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg truncate text-cv-earth">
                {firstName(r.name)}{r.fictitious && <span className="text-cv-earth/45">*</span>}
              </div>
              <div className="text-xs text-cv-earth/60">
                {r.unique_items} item{r.unique_items === 1 ? '' : 's'} · {r.legendary_count} lendário{r.legendary_count === 1 ? '' : 's'}
              </div>
              {r.legendary_emojis.length > 0 && (
                <div className="text-base mt-1">{r.legendary_emojis.join(' ')}</div>
              )}
            </div>
            <div className="text-right">
              <div className="font-display text-lg text-cv-gold">{r.score}</div>
              <div className="text-[10px] text-cv-earth/60">pontos</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-cv-white border border-cv-earth/5 divide-y divide-cv-earth/5">
        {top.slice(3).map((r, i) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-7 text-sm text-cv-earth/60 font-medium">#{i + 4}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">
                {firstName(r.name)}{r.fictitious && <span className="text-cv-earth/45">*</span>}
              </div>
              <div className="text-[10px] text-cv-earth/55">
                {r.unique_items} itens · {r.legendary_count} lendários {r.legendary_emojis.slice(0, 3).join('')}
              </div>
            </div>
            <div className="text-sm font-medium" style={{ color: '#a06a00' }}>{r.score} pts</div>
          </div>
        ))}
      </div>

      {top.some((r) => r.fictitious) && (
        <div className="text-[11px] text-cv-earth/55 text-center pt-1">
          * Alguns participantes são demonstrativos enquanto a comunidade cresce 🌱
        </div>
      )}

      {!inTop && me && (
        <div className="rounded-2xl bg-cv-earth text-cv-white p-3 flex items-center gap-3">
          <div className="text-xs opacity-80 w-12">#{meIdx + 1}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{firstName(me.name)} (você)</div>
            <div className="text-[10px] opacity-70">{me.unique_items} itens · {me.legendary_count} lendários</div>
          </div>
          <div className="text-sm font-medium" style={{ color: '#FFD56B' }}>{me.score} pts</div>
        </div>
      )}

      <div
        className="fixed left-0 right-0 z-30 px-4"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-xl">
          <div
            className="rounded-2xl p-3 text-sm flex items-center justify-between"
            style={{
              background: 'rgba(232, 160, 32, 0.95)',
              color: '#3D2B1F',
              boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span>
              {me
                ? <>Você está em <strong>#{meIdx + 1}</strong> entre os Colecionadores</>
                : 'Sem itens ainda'}
            </span>
            {me && <span className="shrink-0">{me.score} pts</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
