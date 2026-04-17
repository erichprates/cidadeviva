import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ProjectCard, type PlanterMini } from '@/components/consumer/ProjectCard';
import type { Project } from '@/lib/supabase/types';
import { MIN_SEEDS_TO_PLANT } from '@/lib/credits/calculator';
import { formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: projects }, { data: wallet }, { data: allocs }] = await Promise.all([
    supabase.from('projects').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('credit_wallets').select('total_seeds_earned, seeds_allocated').eq('consumer_id', user.id).maybeSingle(),
    supabase
      .from('allocations')
      .select('project_id, consumer_id, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(400),
  ]);

  const totalSeeds = Number(wallet?.total_seeds_earned ?? 0);
  const seedsAllocated = Number(wallet?.seeds_allocated ?? 0);
  const seedsBalance = totalSeeds - seedsAllocated;
  const canPlant = seedsBalance >= MIN_SEEDS_TO_PLANT;
  const seedsToReachMin = Math.max(0, MIN_SEEDS_TO_PLANT - seedsBalance);
  const minProgress = Math.min(100, Math.round((seedsBalance / MIN_SEEDS_TO_PLANT) * 100));

  // Agrupa plantadores únicos por projeto, ordenados pelo plantio mais recente.
  const plantersByProject = new Map<string, { list: PlanterMini[]; total: number }>();
  for (const a of allocs ?? []) {
    const projectId = a.project_id as string;
    const consumerId = a.consumer_id as string;
    const fullName = ((a as { profiles?: { full_name?: string } | null }).profiles?.full_name ?? 'Plantador');
    const slot = plantersByProject.get(projectId) ?? { list: [], total: 0 };
    if (!slot.list.find((p) => p.consumer_id === consumerId)) {
      slot.list.push({ consumer_id: consumerId, name: fullName });
      slot.total += 1;
    }
    plantersByProject.set(projectId, slot);
  }

  return (
    <div>
      <div className="mb-5 pt-1">
        <p className="text-sm text-cv-earth/70">
          Saldo: <strong className="text-cv-green inline-flex items-center gap-1">{seedsBalance} <SeedIcon size={14} /> Seeds</strong>
        </p>
      </div>

      {!canPlant && (
        <div
          className="mb-6 rounded-2xl p-5"
          style={{ background: 'rgba(141, 198, 63, 0.18)', border: '1px solid rgba(27, 122, 74, 0.30)' }}
        >
          <div className="font-display text-cv-earth inline-flex items-center gap-1.5" style={{ fontSize: 16, fontWeight: 700 }}>
            Faltam {formatSeeds(seedsToReachMin)} Seeds para poder plantar <SeedIcon size={16} />
          </div>
          <div className="mt-3 h-2 rounded-full bg-cv-white overflow-hidden">
            <div className="h-full bg-cv-lime transition-all" style={{ width: `${minProgress}%`, transitionDuration: '600ms' }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-cv-earth/70">
            <span>{formatSeeds(seedsBalance)} / {MIN_SEEDS_TO_PLANT} Seeds</span>
            <span>{minProgress}%</span>
          </div>
          <div className="mt-3 text-sm text-cv-earth/80">
            Escaneie mais comprovantes para chegar lá!
          </div>
          <Link
            href="/scan"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-5 py-2.5 text-sm font-semibold active:scale-95 transition"
          >
            Escanear agora 📷
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(projects as Project[] | null)?.map((p) => {
          const planters = plantersByProject.get(p.id);
          return (
            <ProjectCard
              key={p.id}
              project={p}
              seedsBalance={seedsBalance}
              planters={planters?.list ?? []}
              totalPlanters={planters?.total ?? 0}
            />
          );
        })}
        {!projects?.length && <div className="text-cv-earth/60">Nenhum projeto ativo no momento.</div>}
      </div>
    </div>
  );
}
