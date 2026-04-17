import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { MessageComposer } from '@/components/ngo/MessageComposer';
import { getUserLevel } from '@/lib/credits/calculator';

export const dynamic = 'force-dynamic';

export default async function NovaMensagemPage() {
  const service = createServiceClient();

  const [{ data: profiles }, { data: projects }, { data: allocs }, { data: receipts }] = await Promise.all([
    service.from('profiles').select('id').eq('role', 'consumer'),
    service.from('projects').select('id, title').eq('status', 'active'),
    service.from('allocations').select('project_id, consumer_id'),
    service.from('receipts').select('consumer_id, created_at').eq('status', 'approved'),
  ]);

  const totalConsumers = profiles?.length ?? 0;

  // Consumidores únicos por projeto
  const projectCounts = new Map<string, Set<string>>();
  for (const a of allocs ?? []) {
    const set = projectCounts.get(a.project_id as string) ?? new Set<string>();
    set.add(a.consumer_id as string);
    projectCounts.set(a.project_id as string, set);
  }
  const projectOpts = (projects ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    count: projectCounts.get(p.id as string)?.size ?? 0,
  }));

  // Inativos: sem scan aprovado nos últimos 30 dias
  const cutoff = Date.now() - 30 * 86400000;
  const recentScanners = new Set<string>();
  for (const r of receipts ?? []) {
    if (new Date(r.created_at as string).getTime() >= cutoff) {
      recentScanners.add(r.consumer_id as string);
    }
  }
  const inactivesCount = (profiles ?? []).filter((p) => !recentScanners.has(p.id as string)).length;

  // Soma seeds ganhas por consumidor → nível
  const { data: wallets } = await service
    .from('credit_wallets')
    .select('consumer_id, total_seeds_earned');
  const byLevel: Record<string, number> = { Broto: 0, Muda: 0, Árvore: 0, Floresta: 0 };
  const walletByConsumer = new Map((wallets ?? []).map((w) => [w.consumer_id as string, Number(w.total_seeds_earned ?? 0)]));
  for (const p of profiles ?? []) {
    const seeds = walletByConsumer.get(p.id as string) ?? 0;
    const level = getUserLevel(seeds).level;
    byLevel[level] = (byLevel[level] ?? 0) + 1;
  }

  return (
    <div className="space-y-5">
      <Link href="/ong/comunicacao" className="inline-flex items-center text-sm text-cv-earth/70 hover:text-cv-earth">
        ← Voltar para Comunicação
      </Link>
      <div>
        <h1 className="font-display text-3xl">Nova mensagem</h1>
        <p className="text-sm text-cv-earth/65 mt-1">
          Disparo simulado — ainda não envia de verdade. Os logs ficam salvos no histórico.
        </p>
      </div>
      <MessageComposer
        projects={projectOpts}
        totalConsumers={totalConsumers}
        inactivesCount={inactivesCount}
        byLevel={byLevel}
      />
    </div>
  );
}
