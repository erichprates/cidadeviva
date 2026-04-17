import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NgoProjectsList, type NgoProjectRow } from '@/components/ngo/NgoProjectsList';
import { seedsFromAmount } from '@/lib/credits/calculator';
import type { Project } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function NgoProjectsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: projects } = await service
    .from('projects')
    .select('*')
    .eq('ngo_admin_id', user.id)
    .order('created_at', { ascending: false });

  const ids = (projects ?? []).map((p) => p.id as string);
  const { data: allocations } = ids.length
    ? await service
        .from('allocations')
        .select('project_id, consumer_id, seeds_amount, amount')
        .in('project_id', ids)
    : { data: [] };

  const stats = new Map<string, { uniq: Set<string>; seeds: number }>();
  for (const a of allocations ?? []) {
    const pid = a.project_id as string;
    const slot = stats.get(pid) ?? { uniq: new Set<string>(), seeds: 0 };
    slot.uniq.add(a.consumer_id as string);
    slot.seeds += Number((a as { seeds_amount?: number | null }).seeds_amount ?? seedsFromAmount(Number(a.amount)));
    stats.set(pid, slot);
  }

  const rows: NgoProjectRow[] = (projects ?? []).map((p) => {
    const s = stats.get(p.id as string);
    return {
      ...(p as Project),
      unique_planters: s?.uniq.size ?? 0,
      total_planted_seeds: s?.seeds ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Projetos</h1>
          <p className="text-sm text-cv-earth/65 mt-1">Gerencie seus projetos e suas atualizações.</p>
        </div>
        <Link
          href="/ong/projects/new"
          className="inline-flex items-center rounded-full bg-cv-green text-cv-white px-5 py-2.5 text-sm font-semibold hover:bg-cv-green/90 active:scale-95 transition"
        >
          Novo projeto +
        </Link>
      </div>

      <NgoProjectsList projects={rows} />
    </div>
  );
}
