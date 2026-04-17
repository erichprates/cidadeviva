import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { ImpactChart, type WeeklySeeds } from '@/components/ngo/ImpactChart';
import { ProjectsChart, type ProjectRow } from '@/components/ngo/ProjectsChart';
import { getCategory } from '@/lib/categories';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { colorForName, firstName, initials, timeAgoPt } from '@/lib/avatars';
import { seedsFromAmount, getUserLevel } from '@/lib/credits/calculator';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';
import type { Project } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface AllocRow {
  consumer_id: string;
  seeds_amount: number | null;
  amount: number;
  created_at: string;
  project_id: string;
}

interface ProjectUpdateRow {
  id: string;
  title: string;
  content: string;
  created_at: string;
  projects?: { id: string; title: string; category: string; ngo_admin_id: string } | null;
}

const MEDAL = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

export default async function NgoDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const [
    { data: projectsData },
    { count: pendingCount },
    { data: updates },
  ] = await Promise.all([
    service
      .from('projects')
      .select('id, title, description, category, neighborhood, cover_image_url, current_amount, goal_amount, current_seeds, goal_seeds, beneficiaries_count, impact_unit, impact_per_seed, status, created_at, ngo_admin_id')
      .eq('ngo_admin_id', user.id)
      .order('created_at', { ascending: false }),
    service
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'suspicious']),
    service
      .from('project_updates')
      .select('id, title, content, created_at, projects!inner(id, title, category, ngo_admin_id)')
      .eq('projects.ngo_admin_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const projects = (projectsData as Project[] | null) ?? [];
  const projectIds = projects.map((p) => p.id);
  const activeProjects = projects.filter((p) => p.status === 'active');

  const { data: allocRaw } = projectIds.length
    ? await service
        .from('allocations')
        .select('consumer_id, seeds_amount, amount, created_at, project_id')
        .in('project_id', projectIds)
    : { data: [] };
  const allocations = (allocRaw ?? []) as AllocRow[];

  // --- TOTAIS ---
  const totalSeedsPlanted = allocations.reduce(
    (s, a) => s + Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount))),
    0,
  );
  const totalBeneficiaries = activeProjects.reduce((s, p) => s + Number(p.beneficiaries_count ?? 0), 0);

  // Seeds do mês vs mês passado (pra growth)
  const seedsThisMonth = allocations
    .filter((a) => new Date(a.created_at) >= monthStart)
    .reduce((s, a) => s + Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount))), 0);
  const seedsLastMonth = allocations
    .filter((a) => {
      const d = new Date(a.created_at);
      return d >= lastMonthStart && d < monthStart;
    })
    .reduce((s, a) => s + Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount))), 0);

  const growthPct =
    seedsLastMonth > 0
      ? Math.round(((seedsThisMonth - seedsLastMonth) / seedsLastMonth) * 100)
      : seedsThisMonth > 0
      ? 100
      : 0;
  const growthSign = growthPct >= 0 ? '▲' : '▼';
  const growthColor = growthPct >= 0 ? '#1B7A4A' : '#b91c1c';

  // --- CONSUMIDORES ---
  const firstPlantByConsumer = new Map<string, Date>();
  for (const a of allocations) {
    const d = new Date(a.created_at);
    const prev = firstPlantByConsumer.get(a.consumer_id);
    if (!prev || d < prev) firstPlantByConsumer.set(a.consumer_id, d);
  }
  const uniquePlanters = firstPlantByConsumer.size;
  let newThisMonth = 0;
  for (const d of firstPlantByConsumer.values()) {
    if (d >= monthStart) newThisMonth += 1;
  }

  // --- SEEDS POR PROJETO ---
  const projectSeedsMap = new Map<string, number>();
  for (const a of allocations) {
    const seeds = Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount)));
    projectSeedsMap.set(a.project_id, (projectSeedsMap.get(a.project_id) ?? 0) + seeds);
  }
  const projectChartData: ProjectRow[] = projects
    .map((p) => ({ name: p.title, category: p.category, seeds: projectSeedsMap.get(p.id) ?? 0 }))
    .filter((p) => p.seeds > 0)
    .sort((a, b) => b.seeds - a.seeds);

  // --- EVOLUÇÃO SEMANAL (últimas 8 semanas) ---
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekly: WeeklySeeds[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(todayUtc);
    end.setUTCDate(end.getUTCDate() - i * 7);
    end.setUTCHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);
    let bucket = 0;
    for (const a of allocations) {
      const d = new Date(a.created_at);
      if (d >= start && d <= end) {
        bucket += Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount)));
      }
    }
    weekly.push({ week: `S${8 - i}`, seeds: Math.round(bucket) });
  }

  // --- TOP 5 PLANTADORES ---
  const seedsByConsumer = new Map<string, number>();
  for (const a of allocations) {
    const s = Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount)));
    seedsByConsumer.set(a.consumer_id, (seedsByConsumer.get(a.consumer_id) ?? 0) + s);
  }
  const topIds = Array.from(seedsByConsumer.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topConsumerIds = topIds.map(([id]) => id);
  const [{ data: topProfiles }, { data: topWallets }] = topConsumerIds.length
    ? await Promise.all([
        service.from('profiles').select('id, full_name').in('id', topConsumerIds),
        service.from('credit_wallets').select('consumer_id, total_seeds_earned').in('consumer_id', topConsumerIds),
      ])
    : [{ data: [] as Array<{ id: string; full_name: string }> }, { data: [] as Array<{ consumer_id: string; total_seeds_earned: number }> }];
  const nameMap = new Map((topProfiles ?? []).map((p) => [p.id, p.full_name as string]));
  const walletMap = new Map((topWallets ?? []).map((w) => [w.consumer_id as string, Number(w.total_seeds_earned ?? 0)]));

  const topPlanters = topIds.map(([id, seeds]) => {
    const fullName = nameMap.get(id) ?? 'Plantador';
    const level = getUserLevel(walletMap.get(id) ?? 0);
    return { id, fullName, seeds, level };
  });
  const topBestSeeds = topPlanters[0]?.seeds ?? 0;

  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const lastUpdatesRows = (updates as unknown as ProjectUpdateRow[] | null) ?? [];

  return (
    <div className="space-y-7">
      {/* HEADER */}
      <div>
        <h1 className="font-display text-cv-earth inline-flex items-center gap-2" style={{ fontSize: 28, fontWeight: 700 }}>
          Impacto da Cidade Social <SeedIcon size={26} />
        </h1>
        <p className="text-sm text-cv-earth/65 mt-1">
          Visão geral do ecossistema · {monthLabel}
        </p>
      </div>

      {/* STATS 2x2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="!p-5">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Seeds plantados</div>
          <div className="font-display text-cv-lime mt-1" style={{ fontSize: 32, fontWeight: 800, color: '#6B9E1F' }}>
            {formatSeeds(totalSeedsPlanted)}
          </div>
          {seedsThisMonth + seedsLastMonth > 0 && (
            <div className="mt-1 text-xs" style={{ color: growthColor }}>
              {growthSign} {Math.abs(growthPct)}% vs mês anterior
            </div>
          )}
        </Card>
        <Card className="!p-5">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Famílias impactadas</div>
          <div className="font-display text-cv-green mt-1" style={{ fontSize: 32, fontWeight: 800 }}>
            {formatSeeds(totalBeneficiaries)}
          </div>
          <div className="mt-1 text-xs text-cv-earth/65">
            em {activeProjects.length} projeto{activeProjects.length === 1 ? '' : 's'} ativo{activeProjects.length === 1 ? '' : 's'}
          </div>
        </Card>
        <Card className="!p-5">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Plantadores únicos</div>
          <div className="font-display text-cv-earth mt-1" style={{ fontSize: 32, fontWeight: 800 }}>
            {formatSeeds(uniquePlanters)}
          </div>
          <div className="mt-1 text-xs text-cv-earth/65">
            {newThisMonth > 0 ? `+${newThisMonth} novo${newThisMonth === 1 ? '' : 's'} esse mês` : 'Sem novos esse mês'}
          </div>
        </Card>
        <Card className="!p-5">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Fila de revisão</div>
          {(pendingCount ?? 0) > 0 ? (
            <>
              <div className="font-display mt-1" style={{ fontSize: 32, fontWeight: 800, color: '#a06a00' }}>
                {pendingCount}
              </div>
              <div className="mt-1 text-xs text-cv-earth/65">
                comprovante{(pendingCount ?? 0) === 1 ? '' : 's'} aguardando
              </div>
              <Link
                href="/ong/reviews"
                className="mt-2 inline-flex text-xs font-semibold"
                style={{ color: '#a06a00' }}
              >
                Revisar agora →
              </Link>
            </>
          ) : (
            <>
              <div className="font-display text-cv-green mt-1" style={{ fontSize: 24, fontWeight: 800 }}>
                Tudo em dia ✓
              </div>
              <div className="mt-1 text-xs text-cv-earth/65">Nenhum comprovante pendente.</div>
            </>
          )}
        </Card>
      </div>

      {/* CHART EVOLUÇÃO */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Evolução semanal de Seeds</h2>
          <span className="text-xs text-cv-earth/55">Últimas 8 semanas</span>
        </div>
        <div className="mt-4">
          <ImpactChart data={weekly} />
        </div>
      </Card>

      {/* PROJETOS EM DESTAQUE */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl text-cv-earth">Seus projetos 🌳</h2>
          <Link href="/ong/projects" className="text-sm text-cv-green font-medium">Ver todos →</Link>
        </div>
        {activeProjects.length === 0 ? (
          <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-6 text-center">
            <div><SeedIcon size={36} /></div>
            <p className="mt-2 text-sm text-cv-earth/70">
              Crie seu primeiro projeto para ver o impacto aqui.
            </p>
            <Link
              href="/ong/projects/new"
              className="mt-4 inline-flex rounded-full bg-cv-green text-cv-white px-5 py-2 text-sm font-semibold"
            >
              Novo projeto +
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeProjects.slice(0, 3).map((p) => {
              const cat = getCategory(p.category);
              const goal = Number(p.goal_seeds ?? 0) || seedsFromAmount(Number(p.goal_amount));
              const cur = Number(p.current_seeds ?? 0) || seedsFromAmount(Number(p.current_amount));
              const pct = Math.min(100, Math.round((cur / Math.max(1, goal)) * 100));
              const impactPerSeed = Number(p.impact_per_seed ?? 0);
              const impactNow = Math.floor(cur * impactPerSeed);
              const impactUnit = p.impact_unit ?? 'beneficiados';
              const reached = pct >= 100;
              return (
                <Link
                  key={p.id}
                  href={`/ong/projects/${p.id}/edit`}
                  className="block rounded-2xl bg-cv-white border border-cv-earth/5 overflow-hidden active:scale-[0.99] transition"
                >
                  <ProjectCover coverUrl={p.cover_image_url} category={p.category} height={40}>
                    <span
                      className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: 'rgba(254,252,248,0.22)', color: '#FEFCF8', backdropFilter: 'blur(4px)' }}
                    >
                      {cat.emoji} {cat.label}
                    </span>
                    {reached && (
                      <span
                        className="absolute top-1.5 right-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: 'rgba(254,252,248,0.95)', color: '#1B7A4A' }}
                      >
                        Meta atingida! 🎉
                      </span>
                    )}
                  </ProjectCover>
                  <div className="p-3">
                    <div className="font-display text-cv-earth truncate" style={{ fontSize: 14, fontWeight: 700 }}>
                      {p.title}
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-cv-sand overflow-hidden">
                      <div className="h-full bg-cv-lime transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-cv-earth/60 inline-flex items-center gap-1">
                      <strong className="text-cv-green">{formatSeeds(cur)}</strong> / {formatSeeds(goal)} <SeedIcon size={11} /> · {pct}%
                    </div>
                    {impactPerSeed > 0 && impactNow > 0 && (
                      <div className="mt-1 text-[11px] text-cv-earth/55">
                        ≈ {formatSeeds(impactNow)} {impactUnit}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CHART SEEDS POR PROJETO */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Seeds por projeto</h2>
          <span className="text-xs text-cv-earth/55">Acumulado</span>
        </div>
        <div className="mt-4">
          <ProjectsChart data={projectChartData} />
        </div>
      </Card>

      {/* TOP PLANTADORES */}
      <section>
        <h2 className="font-display text-xl mb-3 text-cv-earth">Maiores plantadores 🏆</h2>
        {topPlanters.length === 0 ? (
          <Card>
            <div className="text-sm text-cv-earth/60 text-center">
              Assim que alguém plantar nos seus projetos, os maiores apoiadores aparecem aqui.
            </div>
          </Card>
        ) : (
          <div className="bg-cv-white rounded-2xl border border-cv-earth/5 divide-y divide-cv-earth/5">
            {topPlanters.map((pl, i) => {
              const c = colorForName(pl.fullName);
              const barPct = topBestSeeds > 0 ? (pl.seeds / topBestSeeds) * 100 : 0;
              return (
                <div key={pl.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-6 text-lg text-center">{MEDAL[i]}</div>
                  <div
                    className="grid place-items-center rounded-full shrink-0"
                    style={{ width: 36, height: 36, background: c.bg, color: c.fg, fontSize: 13, fontWeight: 700 }}
                  >
                    {initials(pl.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-cv-earth font-medium truncate">
                      {firstName(pl.fullName)} <span className="text-cv-earth/55 font-normal">{pl.level.emoji}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-cv-sand overflow-hidden">
                      <div
                        className="h-full bg-cv-lime transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-cv-green whitespace-nowrap inline-flex items-center gap-1">
                    {formatSeeds(pl.seeds)} <SeedIcon size={12} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* AÇÕES RÁPIDAS */}
      <section>
        <h2 className="font-display text-xl mb-3 text-cv-earth">Ações rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/ong/projects/new"
            className="rounded-2xl p-4 bg-cv-green text-cv-white active:scale-[0.99] transition"
          >
            <div className="text-2xl">➕</div>
            <div className="mt-2 font-display text-base" style={{ fontWeight: 700 }}>Novo projeto</div>
            <div className="text-xs opacity-90 mt-0.5">Publique um novo projeto social.</div>
          </Link>
          <Link
            href="/ong/comunicacao/nova"
            className="rounded-2xl p-4 bg-cv-white border border-cv-earth/5 active:scale-[0.99] transition"
          >
            <div className="text-2xl">📢</div>
            <div className="mt-2 font-display text-base text-cv-earth" style={{ fontWeight: 700 }}>Nova mensagem</div>
            <div className="text-xs text-cv-earth/65 mt-0.5">Avise seus apoiadores.</div>
          </Link>
          <Link
            href="/ong/reviews"
            className="rounded-2xl p-4 bg-cv-white border border-cv-earth/5 active:scale-[0.99] transition relative"
          >
            <div className="text-2xl">🔍</div>
            <div className="mt-2 font-display text-base text-cv-earth inline-flex items-center gap-1.5" style={{ fontWeight: 700 }}>
              Revisar comprovantes
              {pendingCount ? (
                <span className="inline-flex items-center rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-[10px] font-semibold">
                  {pendingCount}
                </span>
              ) : null}
            </div>
            <div className="text-xs text-cv-earth/65 mt-0.5">Fila de aprovação.</div>
          </Link>
          <Link
            href="/ong/merchants-onboarding"
            className="rounded-2xl p-4 bg-cv-white border border-cv-earth/5 active:scale-[0.99] transition"
          >
            <div className="text-2xl">🏪</div>
            <div className="mt-2 font-display text-base text-cv-earth" style={{ fontWeight: 700 }}>Onboarding lojistas</div>
            <div className="text-xs text-cv-earth/65 mt-0.5">Cadastre novos parceiros.</div>
          </Link>
        </div>
      </section>

      {/* ÚLTIMAS ATUALIZAÇÕES */}
      <section>
        <h2 className="font-display text-xl mb-3 text-cv-earth">Últimas novidades publicadas</h2>
        {lastUpdatesRows.length === 0 ? (
          <Card>
            <div className="text-sm text-cv-earth/60 text-center">
              Publique atualizações em seus projetos para mantê-los vivos para os apoiadores.
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {lastUpdatesRows.map((u) => {
              const proj = u.projects;
              const cat = getCategory(proj?.category);
              return (
                <Link
                  key={u.id}
                  href={proj ? `/ong/projects/${proj.id}/updates` : '/ong/projects'}
                  className="block rounded-2xl bg-cv-white border border-cv-earth/5 p-4 active:scale-[0.99] transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {proj && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                          style={{ background: cat.bg, color: cat.fg }}
                        >
                          {cat.emoji} {cat.label}
                        </span>
                      )}
                      <span className="text-xs text-cv-earth/55 truncate">{proj?.title ?? 'Projeto'}</span>
                    </div>
                    <span className="text-[11px] text-cv-earth/55 shrink-0">{timeAgoPt(u.created_at)}</span>
                  </div>
                  <div className="mt-2 font-display text-cv-earth" style={{ fontSize: 15, fontWeight: 700 }}>
                    {u.title}
                  </div>
                  <div className="text-xs text-cv-earth/65 mt-1 line-clamp-2">{u.content}</div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
