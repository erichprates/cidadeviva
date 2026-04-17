import { createServiceClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { formatBRL, formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';

export default async function AdminDashboardPage() {
  const service = createServiceClient();
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();

  const [
    { count: merchantsActive },
    { count: consumers },
    { data: monthReceipts },
  ] = await Promise.all([
    service.from('merchants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    service.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'consumer'),
    service.from('receipts').select('extracted_amount, seeds_generated, created_at, status').gte('created_at', sinceIso).eq('status', 'approved'),
  ]);

  const seedsMonth = (monthReceipts ?? []).reduce((s, r) => s + Number(r.seeds_generated ?? 0), 0);
  const volumeMonth = (monthReceipts ?? []).reduce((s, r) => s + Number(r.extracted_amount ?? 0), 0);

  // Crescimento semanal simples (4 últimas semanas)
  const weeks: { label: string; value: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - (i + 1) * 7);
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const count = (monthReceipts ?? []).filter((r) => {
      const d = new Date(r.created_at);
      return d >= start && d < end;
    }).length;
    weeks.push({ label: `S-${i}`, value: count });
  }
  const maxWeek = Math.max(1, ...weeks.map((w) => w.value));

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">Painel geral</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs text-cv-earth/60">Lojistas ativos</div>
          <div className="font-display text-4xl mt-1">{merchantsActive ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs text-cv-earth/60">Consumidores</div>
          <div className="font-display text-4xl mt-1">{consumers ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs text-cv-earth/60">Seeds no mês</div>
          <div className="font-display text-4xl mt-1 text-cv-green inline-flex items-center gap-2">{formatSeeds(seedsMonth)} <SeedIcon size={32} /></div>
        </Card>
        <Card>
          <div className="text-xs text-cv-earth/60">Volume rastreado</div>
          <div className="font-display text-4xl mt-1">{formatBRL(volumeMonth)}</div>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-xl">Comprovantes aprovados — últimas 4 semanas</h2>
        <div className="mt-5 flex items-end gap-3 h-40">
          {weeks.map((w) => (
            <div key={w.label} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-cv-sand rounded-lg overflow-hidden flex items-end" style={{ height: '100%' }}>
                <div
                  className="w-full bg-cv-lime transition-all"
                  style={{ height: `${(w.value / maxWeek) * 100}%` }}
                />
              </div>
              <div className="text-xs text-cv-earth/60">{w.label}</div>
              <div className="text-sm font-medium">{w.value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
