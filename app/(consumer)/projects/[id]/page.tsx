import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { FadeIn } from '@/components/ui/FadeIn';
import { PlantButton } from '@/components/consumer/PlantButton';
import { getCategory } from '@/lib/categories';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { colorForName, firstName, initials, timeAgoPt } from '@/lib/avatars';
import { seedsFromAmount } from '@/lib/credits/calculator';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';
import type { Project, ProjectUpdate } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

interface AllocRow {
  id: string;
  consumer_id: string;
  amount: number;
  seeds_amount: number | null;
  created_at: string;
  profiles?: { full_name?: string } | null;
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: project } = await supabase.from('projects').select('*').eq('id', params.id).maybeSingle();
  if (!project) notFound();
  const p = project as Project;

  const [{ data: allocations }, { data: updates }] = await Promise.all([
    supabase
      .from('allocations')
      .select('id, consumer_id, amount, seeds_amount, created_at, profiles(full_name)')
      .eq('project_id', p.id)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('project_updates')
      .select('*')
      .eq('project_id', p.id)
      .order('created_at', { ascending: false }),
  ]);

  const allocs = (allocations ?? []) as unknown as AllocRow[];

  // Agrega plantadores únicos com soma de Seeds
  const planterMap = new Map<string, { name: string; seeds: number; firstAt: string }>();
  for (const a of allocs) {
    const id = a.consumer_id;
    const name = a.profiles?.full_name ?? 'Plantador';
    const cur = planterMap.get(id) ?? { name, seeds: 0, firstAt: a.created_at };
    cur.seeds += Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount)));
    cur.firstAt = a.created_at; // já está em desc, ok
    planterMap.set(id, cur);
  }
  const planters = Array.from(planterMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .slice(0, 10);

  const myAllocs = allocs.filter((a) => a.consumer_id === user.id);
  const mySeeds = myAllocs.reduce((acc, a) => acc + Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount))), 0);
  const isPlanter = mySeeds > 0;

  const { data: wallet } = await supabase
    .from('credit_wallets')
    .select('total_seeds_earned, seeds_allocated')
    .eq('consumer_id', user.id)
    .maybeSingle();
  const seedsBalance = Number(wallet?.total_seeds_earned ?? 0) - Number(wallet?.seeds_allocated ?? 0);

  const goalSeeds = Number(p.goal_seeds ?? 0) || seedsFromAmount(Number(p.goal_amount));
  const currentSeeds = Number(p.current_seeds ?? 0) || seedsFromAmount(Number(p.current_amount));
  const pct = Math.min(100, Math.round((currentSeeds / Math.max(1, goalSeeds)) * 100));
  const cat = getCategory(p.category);
  const impactPerSeed = Number(p.impact_per_seed ?? 0);
  const impactNow = Math.floor(currentSeeds * impactPerSeed);
  const impactUnit = p.impact_unit ?? 'beneficiados';
  const myImpact = Math.floor(mySeeds * impactPerSeed);

  const creatorName = p.created_by_name ?? 'Cidade Social';
  const creatorColor = colorForName(creatorName);

  return (
    <FadeIn>
      <div className="space-y-5 pb-2 -mt-4 -mx-4">
        {/* HEADER */}
        <ProjectCover
          coverUrl={p.cover_image_url}
          category={p.category}
          height={220}
        >
          <Link
            href="/projects"
            aria-label="Voltar"
            className="absolute grid place-items-center rounded-full"
            style={{
              top: 12,
              left: 12,
              width: 38,
              height: 38,
              background: 'rgba(254,252,248,0.92)',
              color: '#3D2B1F',
              fontSize: 18,
              fontWeight: 600,
              backdropFilter: 'blur(6px)',
              zIndex: 2,
            }}
          >
            ←
          </Link>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
            style={{ zIndex: 1 }}
          >
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold mb-3"
              style={{ background: 'rgba(254,252,248,0.22)', color: '#FEFCF8', backdropFilter: 'blur(4px)' }}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </span>
            <h1
              className="font-display text-cv-white"
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                textShadow: '0 2px 10px rgba(0,0,0,0.25)',
                maxWidth: '90%',
              }}
            >
              {p.title}
            </h1>
            {p.neighborhood && (
              <div className="mt-2 text-cv-white/90 text-xs">📍 {p.neighborhood}</div>
            )}
          </div>
        </ProjectCover>

        <div className="px-4 space-y-5">
          {/* PROGRESSO */}
          <Card className="!p-5">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-cv-earth" style={{ fontSize: 18 }}>Progresso</div>
              <div className="text-sm font-semibold text-cv-green">{pct}%</div>
            </div>
            <div className="mt-3 h-3 rounded-full bg-cv-sand overflow-hidden">
              <div
                className="h-full bg-cv-lime"
                style={{ width: `${pct}%`, transition: 'width 800ms cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </div>
            <div className="mt-2 text-sm text-cv-earth/75">
              <strong className="text-cv-green">{formatSeeds(currentSeeds)}</strong> Seeds plantadas de{' '}
              <strong>{formatSeeds(goalSeeds)}</strong> Seeds meta
            </div>

            {impactPerSeed > 0 && (
              <div
                className="mt-4 rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(141, 198, 63, 0.18)' }}
              >
                Isso representa <strong className="text-cv-green">≈ {formatSeeds(impactNow)}</strong>{' '}
                <span className="text-cv-earth/80">{impactUnit}</span>
              </div>
            )}

            {p.beneficiaries_count > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-cv-earth/75">
                <span>👥</span>
                <span>
                  <strong>{formatSeeds(p.beneficiaries_count)}</strong> beneficiados estimados
                </span>
              </div>
            )}

            <div className="mt-5">
              <PlantButton
                projectId={p.id}
                projectTitle={p.title}
                seedsBalance={seedsBalance}
              />
            </div>
          </Card>

          {/* HISTÓRIA */}
          {p.story && (
            <section>
              <h2 className="font-display text-xl mb-3 text-cv-earth">A história</h2>
              <Card className="!p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="grid place-items-center rounded-full"
                    style={{
                      width: 44,
                      height: 44,
                      background: creatorColor.bg,
                      color: creatorColor.fg,
                      fontWeight: 700,
                    }}
                  >
                    {initials(creatorName)}
                  </div>
                  <div>
                    <div className="text-xs text-cv-earth/60">Criado por</div>
                    <div className="font-medium text-cv-earth">{creatorName}</div>
                  </div>
                </div>
                <p className="mt-4 text-cv-earth/85 font-sans" style={{ fontSize: 15, lineHeight: 1.55 }}>
                  {p.story}
                </p>
                {p.neighborhood && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-cv-earth/65">
                    <span>📍</span>
                    <span>{p.neighborhood}</span>
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* MINHA CONTRIBUIÇÃO */}
          {isPlanter && (
            <section>
              <h2 className="font-display text-xl mb-3 text-cv-earth">Minha contribuição</h2>
              <div
                className="rounded-2xl p-5"
                style={{ background: 'rgba(141, 198, 63, 0.18)', border: '1px solid rgba(27, 122, 74, 0.3)' }}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-sm text-cv-earth/75">Você plantou aqui</div>
                  <div className="font-display text-cv-green inline-flex items-center gap-1.5" style={{ fontSize: 24 }}>
                    {formatSeeds(mySeeds)} <SeedIcon size={20} />
                  </div>
                </div>
                {impactPerSeed > 0 && myImpact > 0 && (
                  <div className="mt-2 text-sm text-cv-earth/80">
                    Suas Seeds contribuíram com <strong>≈ {formatSeeds(myImpact)}</strong> {impactUnit}
                  </div>
                )}
                <div className="mt-4 space-y-1.5">
                  <div className="text-xs text-cv-earth/60">Histórico</div>
                  {myAllocs.map((a) => {
                    const seeds = Number(a.seeds_amount ?? seedsFromAmount(Number(a.amount)));
                    return (
                      <div key={a.id} className="flex justify-between text-sm">
                        <span className="text-cv-earth/75">{timeAgoPt(a.created_at)}</span>
                        <span className="font-medium text-cv-green inline-flex items-center gap-1">{formatSeeds(seeds)} <SeedIcon size={12} /></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* PLANTADORES */}
          <section>
            <h2 className="font-display text-xl mb-3 text-cv-earth inline-flex items-center gap-2">Plantadores <SeedIcon size={18} /></h2>
            {planters.length === 0 ? (
              <Card>
                <div className="text-sm text-cv-earth/60 text-center">
                  Seja a primeira pessoa a plantar aqui!
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {planters.map((pl) => {
                  const c = colorForName(pl.name);
                  const isMe = pl.id === user.id;
                  return (
                    <div
                      key={pl.id}
                      className="rounded-xl p-3 flex items-center gap-3"
                      style={{
                        background: isMe ? 'rgba(141, 198, 63, 0.18)' : '#FEFCF8',
                        border: isMe ? '1px solid rgba(27, 122, 74, 0.3)' : '1px solid rgba(61, 43, 31, 0.06)',
                      }}
                    >
                      <div
                        className="grid place-items-center rounded-full shrink-0"
                        style={{ width: 32, height: 32, background: c.bg, color: c.fg, fontSize: 12, fontWeight: 700 }}
                      >
                        {initials(pl.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-cv-earth truncate">
                          {firstName(pl.name)}
                          {isMe && <span className="text-cv-green text-xs ml-1.5">(você)</span>}
                        </div>
                        <div className="text-[11px] text-cv-earth/55">{timeAgoPt(pl.firstAt)}</div>
                      </div>
                      <div className="text-sm font-medium text-cv-green shrink-0 inline-flex items-center gap-1">
                        {formatSeeds(pl.seeds)} <SeedIcon size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ATUALIZAÇÕES */}
          <section>
            <h2 className="font-display text-xl mb-3 text-cv-earth">Novidades do projeto 📢</h2>
            {(updates as ProjectUpdate[] | null)?.length ? (
              <div className="space-y-3">
                {(updates as ProjectUpdate[]).map((u) => (
                  <Card key={u.id} className="!p-4">
                    <div className="text-[11px] text-cv-earth/55 uppercase tracking-wide">
                      {timeAgoPt(u.created_at)}
                    </div>
                    <div className="font-display text-lg mt-1 text-cv-earth">{u.title}</div>
                    {u.image_url && (
                      <img
                        src={u.image_url}
                        alt=""
                        className="mt-3 rounded-xl w-full"
                        style={{ maxHeight: 240, objectFit: 'cover' }}
                      />
                    )}
                    <p className="mt-2 text-sm text-cv-earth/80 font-sans whitespace-pre-line">
                      {u.content}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <div className="text-sm text-cv-earth/60 text-center">
                  Nenhuma atualização ainda — acompanhe em breve!
                </div>
              </Card>
            )}
          </section>
        </div>
      </div>
    </FadeIn>
  );
}
