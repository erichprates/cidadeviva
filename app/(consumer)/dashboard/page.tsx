import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { CreditWallet } from '@/components/consumer/CreditWallet';
import { WhatsappBanner } from '@/components/consumer/WhatsappBanner';
import { RecentReceiptsList, type ReceiptRow } from '@/components/consumer/RecentReceiptsList';
import { Card } from '@/components/ui/Card';
import { getCategory } from '@/lib/categories';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { imageForSlug, rarityConfig } from '@/lib/collectibles/images';
import { achievementImage } from '@/lib/achievements/images';
import { seedsFromAmount, getUserLevel } from '@/lib/credits/calculator';
import { formatBRL, formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';
import { computeStreakDays } from '@/lib/collectibles/award';
import { getWeeklyChallenge } from '@/lib/collectibles/weekly-challenge';
import type { Achievement } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface AllocWithProject {
  id: string;
  seeds_amount: number | null;
  amount: number;
  projects?: {
    id: string;
    title: string;
    current_amount: number;
    goal_amount: number;
    current_seeds: number | null;
    goal_seeds: number | null;
    impact_unit: string | null;
    impact_per_seed: number | null;
    beneficiaries_count: number | null;
  } | null;
}

function progressForAchievement(ach: Achievement, ctx: {
  approvedCount: number;
  totalSeedsEarned: number;
  projectsSaude: number;
  streakDays: number;
}): { current: number; target: number; pct: number } {
  const target = Number(ach.condition_value);
  let current = 0;
  switch (ach.condition_type) {
    case 'receipt_count':
      current = ctx.approvedCount;
      break;
    case 'total_amount':
      current = ctx.totalSeedsEarned;
      break;
    case 'projects_supported':
      current = ctx.projectsSaude;
      break;
    case 'streak_days':
      current = ctx.streakDays;
      break;
  }
  return {
    current,
    target,
    pct: Math.min(100, Math.round((current / Math.max(1, target)) * 100)),
  };
}

function labelForCondition(type: Achievement['condition_type']): string {
  switch (type) {
    case 'receipt_count': return 'notas escaneadas';
    case 'total_amount': return 'Seeds ganhos';
    case 'projects_supported': return 'projetos de saúde apoiados';
    case 'streak_days': return 'dias consecutivos';
    default: return 'progresso';
  }
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();

  const [
    { data: profile },
    { data: wallet },
    { count: approvedCount },
    { data: receipts },
    { data: allocations },
    { data: userAchievements },
    { data: achievementsList },
    { data: lastCollectible },
    { data: allocSaude },
    { data: projectsActive },
    streakDays,
    weekly,
    { data: allWallets },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle(),
    supabase.from('credit_wallets').select('*').eq('consumer_id', user.id).maybeSingle(),
    supabase.from('receipts').select('*', { count: 'exact', head: true }).eq('consumer_id', user.id).eq('status', 'approved'),
    supabase.from('receipts').select('id, extracted_merchant_name, extracted_amount, extracted_date, seeds_generated, status, rejection_reason, created_at').eq('consumer_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase
      .from('allocations')
      .select('id, seeds_amount, amount, projects(id, title, current_amount, goal_amount, current_seeds, goal_seeds, impact_unit, impact_per_seed, beneficiaries_count)')
      .eq('consumer_id', user.id),
    supabase.from('user_achievements').select('achievement_id').eq('consumer_id', user.id),
    service.from('achievements').select('*').order('condition_value'),
    service
      .from('user_collectibles')
      .select('first_obtained_at, collectible_items(slug, name, emoji, rarity)')
      .eq('consumer_id', user.id)
      .order('first_obtained_at', { ascending: false })
      .limit(1),
    service
      .from('allocations')
      .select('id, projects!inner(category)')
      .eq('consumer_id', user.id)
      .eq('projects.category', 'saude'),
    supabase
      .from('projects')
      .select('id, title, category, cover_image_url, current_amount, goal_amount, current_seeds, goal_seeds')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
    computeStreakDays(service, user.id),
    getWeeklyChallenge(user.id, service),
    service.from('credit_wallets').select('consumer_id, seeds_allocated'),
  ]);

  const fullName = (profile as { full_name?: string } | null)?.full_name ?? user.email?.split('@')[0] ?? 'Plantador';
  const firstName = fullName.split(' ')[0];
  const hasPhone = !!(profile as { phone?: string | null } | null)?.phone;

  const memberSinceLabel = (() => {
    if (!user.created_at) return '—';
    const d = new Date(user.created_at);
    if (Number.isNaN(d.getTime())) return '—';
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d);
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${d.getFullYear()}`;
  })();

  const totalSeedsEarned = Number(wallet?.total_seeds_earned ?? 0);
  const seedsAllocated = Number(wallet?.seeds_allocated ?? 0);
  const seedsBalance = totalSeedsEarned - seedsAllocated;
  const level = getUserLevel(totalSeedsEarned);

  const allocs = (allocations ?? []) as unknown as AllocWithProject[];
  const projectsIds = new Set(allocs.map((a) => a.projects?.id).filter(Boolean) as string[]);
  const projectsSupported = projectsIds.size;

  // Beneficiados: soma dos beneficiaries_count dos projetos que o usuário apoiou (únicos).
  const beneficiariesByProject = new Map<string, number>();
  for (const a of allocs) {
    const pid = a.projects?.id;
    if (!pid) continue;
    if (!beneficiariesByProject.has(pid)) {
      beneficiariesByProject.set(pid, Number(a.projects?.beneficiaries_count ?? 0));
    }
  }
  const beneficiariesSupported = Array.from(beneficiariesByProject.values()).reduce((s, n) => s + n, 0);

  const displayBeneficiaries = beneficiariesSupported;
  const displayProjects = projectsSupported;

  // Impacto real por unidade (grouped by impact_unit)
  const impactByUnit = new Map<string, { emoji: string; amount: number }>();
  const UNIT_EMOJI: Record<string, string> = {
    'medicamentos distribuídos': '💊',
    'crianças impactadas': '📚',
    'cestas distribuídas': '🥗',
    'cestas contribuídas': '🥗',
    'beneficiados': '👥',
  };
  for (const a of allocs) {
    const proj = a.projects;
    if (!proj) continue;
    const unit = proj.impact_unit ?? 'beneficiados';
    const perSeed = Number(proj.impact_per_seed ?? 0);
    if (perSeed <= 0) continue;
    const seeds = Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount)));
    const contribution = seeds * perSeed;
    const slot = impactByUnit.get(unit) ?? { emoji: UNIT_EMOJI[unit] ?? '✨', amount: 0 };
    slot.amount += contribution;
    impactByUnit.set(unit, slot);
  }

  const unlockedIds = new Set((userAchievements ?? []).map((u) => u.achievement_id as string));
  const locked = (achievementsList as Achievement[] | null ?? []).filter((a) => !unlockedIds.has(a.id));
  const progressCtx = {
    approvedCount: approvedCount ?? 0,
    totalSeedsEarned,
    projectsSaude: allocSaude?.length ?? 0,
    streakDays,
  };
  const nextAchievement = locked
    .map((a) => ({ a, ...progressForAchievement(a, progressCtx) }))
    .filter((x) => x.pct < 100)
    .sort((a, b) => b.pct - a.pct)[0] ?? null;

  const lastItemRow = (lastCollectible ?? [])[0] as unknown as {
    first_obtained_at: string;
    collectible_items?:
      | { slug: string; name: string; emoji: string; rarity: string }
      | Array<{ slug: string; name: string; emoji: string; rarity: string }>
      | null;
  } | undefined;
  const lastItemMeta = Array.isArray(lastItemRow?.collectible_items)
    ? lastItemRow?.collectible_items[0] ?? null
    : lastItemRow?.collectible_items ?? null;
  const lastItem = lastItemRow && lastItemMeta
    ? { first_obtained_at: lastItemRow.first_obtained_at, collectible_items: lastItemMeta }
    : null;

  // Posição no ranking (seeds plantadas)
  const sortedWallets = [...(allWallets ?? [])]
    .map((w) => ({ id: w.consumer_id as string, seeds: Number(w.seeds_allocated ?? 0) }))
    .sort((a, b) => b.seeds - a.seeds);
  const rankIdx = sortedWallets.findIndex((w) => w.id === user.id);
  const rankPosition = rankIdx === -1 ? null : rankIdx + 1;

  const isBrandNew = totalSeedsEarned === 0;

  const receiptRows: ReceiptRow[] = (receipts ?? []).map((r) => ({
    id: r.id as string,
    merchant_name: r.extracted_merchant_name as string | null,
    amount: r.extracted_amount as number | null,
    seeds_generated: r.seeds_generated as number | null,
    status: r.status as ReceiptRow['status'],
    rejection_reason: r.rejection_reason as string | null,
    created_at: r.created_at as string,
    extracted_date: r.extracted_date as string | null,
  }));


  return (
    <div className="space-y-6">
      {/* HEADER PERSONALIZADO */}
      <div>
        <h1 className="font-display text-cv-earth" style={{ fontSize: 24, fontWeight: 700 }}>
          Olá, {firstName}! 👋
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm text-cv-earth/65">
            Membro desde {memberSinceLabel}
          </span>
          {streakDays > 1 && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: 'rgba(232, 160, 32, 0.18)', color: '#a06a00' }}
            >
              🔥 {streakDays} dias seguidos
            </span>
          )}
        </div>
      </div>

      <WhatsappBanner userId={user.id} hasPhone={hasPhone} />

      {isBrandNew ? (
        <>
          <section
            className="rounded-3xl p-7 text-center"
            style={{ background: 'linear-gradient(180deg, rgba(141,198,63,0.18), rgba(27,122,74,0.10))', border: '1px solid rgba(27,122,74,0.18)' }}
          >
            <style>{`@keyframes cv-p { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`}</style>
            <div style={{ animation: 'cv-p 2.4s ease-in-out infinite', display: 'inline-block' }}>
              <SeedIcon size={72} />
            </div>
            <h2 className="font-display text-cv-earth mt-4" style={{ fontSize: 22, fontWeight: 700 }}>
              Você ainda não tem Seeds
            </h2>
            <p className="mt-2 text-sm text-cv-earth/75">
              Escaneie seu primeiro comprovante e comece a transformar sua cidade!
            </p>
            <Link
              href="/scan"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-6 py-3 text-sm font-semibold active:scale-95 transition"
            >
              Escanear agora 📷
            </Link>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg text-cv-earth">Veja onde suas Seeds podem ir</h2>
              <Link href="/projects" className="text-sm text-cv-green font-medium">Ver todos →</Link>
            </div>
            <div className="space-y-3">
              {(projectsActive ?? []).map((p) => {
                const cat = getCategory(p.category as string);
                const cur = Number(p.current_seeds ?? 0) || seedsFromAmount(Number(p.current_amount ?? 0));
                const goal = Number(p.goal_seeds ?? 0) || seedsFromAmount(Number(p.goal_amount ?? 0));
                const pct = Math.min(100, Math.round((cur / Math.max(1, goal)) * 100));
                return (
                  <Link
                    key={p.id as string}
                    href={`/projects/${p.id}`}
                    className="block rounded-2xl bg-cv-white border border-cv-earth/5 overflow-hidden active:scale-[0.99] transition"
                  >
                    <ProjectCover coverUrl={p.cover_image_url as string | null} category={p.category as string} height={80} />
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-display text-cv-earth truncate" style={{ fontSize: 14, fontWeight: 700 }}>
                          {p.title as string}
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0" style={{ background: cat.bg, color: cat.fg }}>
                          {cat.emoji} {cat.label}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-cv-sand overflow-hidden">
                        <div className="h-full bg-cv-lime" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-cv-earth/60">{pct}% da meta</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <>
          {/* CARTEIRA */}
          <CreditWallet totalSeedsEarned={totalSeedsEarned} seedsBalance={seedsBalance} />
          <div className="grid grid-cols-2 gap-3" style={{ paddingTop: 18 }}>
            <style>{`
              @keyframes cv-coin-wobble {
                0%, 100% { transform: translateY(0) rotate(-4deg); }
                50%      { transform: translateY(-4px) rotate(4deg); }
              }
              .cv-coin-anim { animation: cv-coin-wobble 2.4s ease-in-out infinite; transform-origin: center; }
            `}</style>

            {/* PLANTAR */}
            <Link
              href="/projects"
              aria-label="Plantar Seeds em um projeto"
              className="relative inline-flex items-center justify-center rounded-full bg-cv-green active:scale-[0.98] transition"
              style={{
                height: 48,
                color: '#FEFCF8',
                fontFamily: 'var(--font-outfit), sans-serif',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.08em',
              }}
            >
              <span>PLANTAR</span>
              <img
                src="/assets/plantar.png"
                alt=""
                aria-hidden
                style={{
                  position: 'absolute',
                  width: 60,
                  height: 60,
                  bottom: 0,
                  right: -6,
                  objectFit: 'contain',
                  objectPosition: 'bottom',
                  pointerEvents: 'none',
                }}
              />
            </Link>

            {/* COMPRAR + SEEDS */}
            <Link
              href="/seeds"
              aria-label="Comprar mais Seeds"
              className="relative inline-flex items-center justify-center rounded-full active:scale-[0.98] transition"
              style={{
                height: 48,
                background: 'transparent',
                border: '1.5px solid rgba(61, 43, 31, 0.18)',
                color: '#3D2B1F',
                fontFamily: 'var(--font-outfit), sans-serif',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.08em',
              }}
            >
              <span>COMPRAR + SEEDS</span>
              <img
                src="/assets/moeda.png"
                alt=""
                aria-hidden
                className="cv-coin-anim"
                style={{
                  position: 'absolute',
                  width: 48,
                  height: 48,
                  top: -22,
                  right: 0,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            </Link>
          </div>

          {/* IMPACTO REAL */}
          <section>
            <h2 className="font-display text-xl text-cv-earth mb-3">Seu impacto até agora ✨</h2>
            {impactByUnit.size === 0 ? (
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: '#F5F0E8', border: '1px solid rgba(141, 198, 63, 0.6)' }}
              >
                <p className="text-sm text-cv-earth/80">
                  Plante seus primeiros Seeds e veja seu impacto aqui.
                </p>
                <Link
                  href="/projects"
                  className="mt-3 inline-flex items-center rounded-full bg-cv-green text-cv-white px-5 py-2 text-sm font-semibold active:scale-95"
                >
                  Ver projetos →
                </Link>
              </div>
            ) : (
              <div
                className="relative rounded-2xl p-5"
                style={{
                  background: '#F5F0E8',
                  border: '1px solid rgba(141, 198, 63, 0.6)',
                }}
              >
                <style>{`
                  @keyframes cv-kid-enter-a {
                    0%   { opacity: 0; transform: translate(60px, -22px) rotate(-14deg) scale(0.7); }
                    60%  { opacity: 1; transform: translate(-4px, 2px) rotate(4deg) scale(1.04); }
                    100% { opacity: 1; transform: translate(0, 0) rotate(0) scale(1); }
                  }
                  @keyframes cv-kid-enter-b {
                    0%   { opacity: 0; transform: translate(80px, 28px) rotate(16deg) scale(0.7); }
                    60%  { opacity: 1; transform: translate(-3px, -2px) rotate(-3deg) scale(1.04); }
                    100% { opacity: 1; transform: translate(0, 0) rotate(0) scale(1); }
                  }
                  @keyframes cv-kid-float-a {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50%      { transform: translateY(-3px) rotate(-1.5deg); }
                  }
                  @keyframes cv-kid-float-b {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50%      { transform: translateY(-3px) rotate(1.5deg); }
                  }
                  .cv-kid-a { animation: cv-kid-enter-a 700ms cubic-bezier(0.22, 1.2, 0.4, 1) both, cv-kid-float-a 3.8s ease-in-out 900ms infinite; }
                  .cv-kid-b { animation: cv-kid-enter-b 700ms cubic-bezier(0.22, 1.2, 0.4, 1) 160ms both, cv-kid-float-b 4.2s ease-in-out 1100ms infinite; }
                `}</style>

                {/* Menina + menino 3D — canto superior direito, dentro do card */}
                <div
                  aria-hidden
                  className="absolute pointer-events-none"
                  style={{ top: -42, right: 60 }}
                >
                  <img
                    src="/assets/menina.png"
                    alt=""
                    className="cv-kid-a"
                    style={{
                      width: 92,
                      height: 92,
                      objectFit: 'contain',
                      position: 'relative',
                      zIndex: 2,
                    }}
                  />
                  <img
                    src="/assets/menino.png"
                    alt=""
                    className="cv-kid-b"
                    style={{
                      width: 92,
                      height: 92,
                      objectFit: 'contain',
                      position: 'absolute',
                      top: 38,
                      left: 52,
                      zIndex: 1,
                    }}
                  />
                </div>

                {/* Beneficiados */}
                <div style={{ maxWidth: 'calc(100% - 130px)' }}>
                  <div className="text-cv-earth font-display" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15 }}>
                    <strong className="text-cv-green">≈ {formatSeeds(displayBeneficiaries)}</strong>{' '}
                    <span style={{ fontSize: 22, fontWeight: 600 }}>beneficiados</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-cv-earth/10 text-cv-earth/85" style={{ fontSize: 17 }}>
                  Você apoiou <strong className="text-cv-earth font-display" style={{ fontSize: 22, fontWeight: 700 }}>{displayProjects}</strong> projeto{displayProjects === 1 ? '' : 's'} da comunidade.
                </div>
              </div>
            )}
          </section>

          {/* STATS 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* NOTAS ESCANEADAS */}
            <div
              className="relative rounded-2xl bg-cv-white border border-cv-earth/5 px-4"
              style={{ height: 104, paddingTop: 14 }}
            >
              <div className="text-xs text-cv-earth/60">Notas escaneadas</div>
              <div className="font-display mt-2" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
                {approvedCount ?? 0}
              </div>
              <img
                src="/assets/notas_escaneada.png"
                alt=""
                aria-hidden
                style={{
                  position: 'absolute',
                  width: 72,
                  height: 72,
                  top: -12,
                  right: -6,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* SEEDS GANHOS */}
            <div
              className="relative rounded-2xl bg-cv-white border border-cv-earth/5 px-4"
              style={{ height: 104, paddingTop: 14 }}
            >
              <div className="text-xs text-cv-earth/60">Seeds ganhos</div>
              <div
                className="font-display mt-2 text-cv-green inline-flex items-center gap-1.5"
                style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}
              >
                <SeedIcon size={18} />
                {formatSeeds(totalSeedsEarned)}
              </div>
              <img
                src="/assets/seeds_ganhos.png"
                alt=""
                aria-hidden
                style={{
                  position: 'absolute',
                  width: 72,
                  height: 72,
                  top: -10,
                  right: -6,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* PROJETOS APOIADOS */}
            <div
              className="relative rounded-2xl bg-cv-white border border-cv-earth/5 px-4"
              style={{ height: 104, paddingTop: 14 }}
            >
              <div className="text-xs text-cv-earth/60">Projetos apoiados</div>
              <div className="font-display mt-2" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
                {projectsSupported}
              </div>
              <img
                src="/assets/projetos_apoiados.png"
                alt=""
                aria-hidden
                style={{
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  bottom: 0,
                  right: -8,
                  objectFit: 'contain',
                  objectPosition: 'bottom',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* POSIÇÃO NO RANKING */}
            <div
              className="relative rounded-2xl bg-cv-white border border-cv-earth/5 px-4"
              style={{ height: 104, paddingTop: 14 }}
            >
              <div className="text-xs text-cv-earth/60">Posição no ranking</div>
              <div className="font-display mt-2" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                {rankPosition ? (
                  <>
                    #{rankPosition}{' '}
                    <span style={{ fontSize: 14, color: 'rgba(61,43,31,0.65)', fontWeight: 500 }}>
                      Impactador
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </div>
              <img
                src="/assets/ranking.png"
                alt=""
                aria-hidden
                style={{
                  position: 'absolute',
                  width: 68,
                  height: 68,
                  top: 25,
                  right: -4,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          {/* DESAFIO DA SEMANA */}
          <section>
            <h2 className="font-display text-xl text-cv-earth mb-3">🎯 Desafio da semana</h2>
            <div
              className="rounded-2xl p-5"
              style={{ background: '#FEFCF8', border: '2px solid rgba(232, 160, 32, 0.45)' }}
            >
              {weekly.completed ? (
                <>
                  <div className="flex items-center gap-3">
                    <img
                      src="/assets/desafio_concluido.png"
                      alt=""
                      aria-hidden
                      style={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }}
                    />
                    <div>
                      <div className="font-display text-cv-earth" style={{ fontSize: 17, fontWeight: 700 }}>
                        Desafio concluído!
                      </div>
                      <div className="text-sm text-cv-earth/65">Prêmio resgatado.</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-display text-cv-earth" style={{ fontSize: 16, fontWeight: 700 }}>
                        {weekly.title}
                      </div>
                      <div className="text-sm text-cv-earth/70 mt-1">{weekly.description}</div>
                    </div>
                    <div style={{ fontSize: 28 }}>{weekly.item_emoji}</div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1.5 text-cv-earth/70">
                      <span>{weekly.current} / {weekly.target}</span>
                      <span>
                        Termina em {Math.max(0, Math.ceil((new Date(weekly.ends_at).getTime() - Date.now()) / 86400000))} dia(s)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-cv-sand overflow-hidden">
                      <div className="h-full bg-cv-gold" style={{ width: `${Math.min(100, Math.round((weekly.current / weekly.target) * 100))}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-cv-earth/65">
                    Prêmio: {weekly.item_emoji} {weekly.item_name} ({weekly.rarity})
                  </div>
                </>
              )}
            </div>
          </section>

          {/* PRÓXIMA CONQUISTA */}
          {nextAchievement && (() => {
            const achImg = achievementImage(nextAchievement.a.slug);
            return (
              <section>
                <h2 className="font-display text-xl text-cv-earth mb-3">🏆 Próxima conquista</h2>
                <div className="rounded-2xl bg-cv-white p-4 border border-cv-earth/5">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0" style={{ width: 48, height: 48 }}>
                      {achImg ? (
                        <img
                          src={achImg}
                          alt=""
                          aria-hidden
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: 36, lineHeight: 1 }}>{nextAchievement.a.icon}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-cv-earth truncate">{nextAchievement.a.title}</div>
                      <div className="text-xs text-cv-earth/60 truncate">{nextAchievement.a.description}</div>
                    </div>
                    <div className="text-sm font-semibold text-cv-green shrink-0">{nextAchievement.pct}%</div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-cv-sand overflow-hidden">
                    <div className="h-full bg-cv-lime transition-all" style={{ width: `${nextAchievement.pct}%` }} />
                  </div>
                  <div className="mt-1.5 text-xs text-cv-earth/60">
                    {formatSeeds(nextAchievement.current)} de {formatSeeds(nextAchievement.target)} {labelForCondition(nextAchievement.a.condition_type)}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ÚLTIMO ITEM GANHO */}
          {lastItem?.collectible_items && (() => {
            const meta = lastItem.collectible_items;
            const cfg = rarityConfig(meta.rarity);
            const img = imageForSlug(meta.slug);
            return (
              <section>
                <div
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(232, 160, 32, 0.12)', border: '1px solid rgba(232, 160, 32, 0.35)' }}
                >
                  <div className="text-xs text-cv-earth/60 uppercase tracking-wide">✨ Último item ganho</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="shrink-0 grid place-items-center" style={{ width: 64, height: 64 }}>
                      {img ? (
                        <img
                          src={img}
                          alt={meta.name}
                          style={{ width: 60, height: 60, objectFit: 'contain', display: 'block' }}
                        />
                      ) : (
                        <span style={{ fontSize: 36, lineHeight: 1 }}>{meta.emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-cv-earth truncate" style={{ fontSize: 16, fontWeight: 700 }}>
                        {meta.name}
                      </div>
                      <span
                        className="inline-block mt-1 rounded-full px-2 py-0.5"
                        style={{
                          background: cfg.bg,
                          color: cfg.color,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <Link href="/perfil" className="text-sm font-medium text-cv-green whitespace-nowrap">
                      Ver coleção →
                    </Link>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ÚLTIMOS COMPROVANTES */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl">Últimos comprovantes</h2>
              <Link href="/scan" className="text-sm text-cv-green font-medium">+ Novo</Link>
            </div>
            <RecentReceiptsList items={receiptRows} />
          </section>
        </>
      )}
    </div>
  );
}
