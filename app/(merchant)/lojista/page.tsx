import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { VolumeChart, type WeeklyVolume } from '@/components/merchant/VolumeChart';
import { SeedsChart, type ProjectSeeds } from '@/components/merchant/SeedsChart';
import { TrendLine, type DailyPoint } from '@/components/merchant/TrendLine';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const CHART_COLORS = ['#E8A020', '#1B7A4A', '#8DC63F', '#FF7A45', '#2463AF', '#7A4FCF'];

function startOfDayUTC(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function MerchantDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: merchants } = await service
    .from('merchants')
    .select('*')
    .eq('profile_id', user.id)
    .limit(1);

  const merchant = merchants?.[0] ?? null;

  if (!merchant) {
    return (
      <Card>
        <h1 className="font-display text-2xl">Cadastro em análise</h1>
        <p className="mt-2 text-cv-earth/70">Seu estabelecimento ainda não está ativo. Nossa equipe entra em contato em breve.</p>
      </Card>
    );
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(now.getUTCDate() - 29);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const [{ data: monthReceipts }, { data: lastMonthReceipts }] = await Promise.all([
    service
      .from('receipts')
      .select('consumer_id, extracted_amount, status, created_at')
      .eq('merchant_id', merchant.id)
      .gte('created_at', monthStart.toISOString()),
    service
      .from('receipts')
      .select('consumer_id, extracted_amount, status, created_at')
      .eq('merchant_id', merchant.id)
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ]);

  const approved = (monthReceipts ?? []).filter((r) => r.status === 'approved');
  const volume = approved.reduce((s, r) => s + Number(r.extracted_amount ?? 0), 0);
  const uniqueConsumers = new Set(approved.map((r) => r.consumer_id as string)).size;
  const estimatedInvoice = volume * (Number(merchant.cashback_rate) / 100);

  // --- VOLUME CHART: últimas 4 semanas (janelas de 7 dias) ---
  const weeklyBuckets: WeeklyVolume[] = [];
  for (let i = 3; i >= 0; i--) {
    const end = startOfDayUTC(now);
    end.setUTCDate(end.getUTCDate() - i * 7);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    weeklyBuckets.push({
      semana: `S${4 - i}`,
      volume: 0,
      comprovantes: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(({ startIso: start.toISOString(), endIso: end.toISOString() }) as any),
    });
  }
  for (const r of lastMonthReceipts ?? []) {
    if (r.status !== 'approved') continue;
    const created = new Date(r.created_at as string);
    for (const b of weeklyBuckets as (WeeklyVolume & { startIso: string; endIso: string })[]) {
      const s = new Date(b.startIso);
      const e = new Date(b.endIso);
      e.setUTCHours(23, 59, 59, 999);
      if (created >= s && created <= e) {
        b.volume += Number(r.extracted_amount ?? 0);
        b.comprovantes += 1;
        break;
      }
    }
  }
  const weeklyData: WeeklyVolume[] = weeklyBuckets.map((b) => ({
    semana: b.semana,
    volume: Number(b.volume.toFixed(2)),
    comprovantes: b.comprovantes,
  }));

  // --- TREND LINE: últimos 30 dias ---
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setUTCDate(d.getUTCDate() + i);
    dailyMap.set(isoDate(d), 0);
  }
  for (const r of lastMonthReceipts ?? []) {
    if (r.status !== 'approved') continue;
    const key = isoDate(new Date(r.created_at as string));
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(r.extracted_amount ?? 0));
    }
  }
  const dailyData: DailyPoint[] = Array.from(dailyMap.entries()).map(([date, volume]) => ({
    date,
    volume: Number(volume.toFixed(2)),
  }));

  // --- SEEDS CHART: Seeds dos consumidores deste lojista plantadas por projeto ---
  const consumerIds = Array.from(new Set(approved.map((r) => r.consumer_id as string)));
  let projectSeeds: ProjectSeeds[] = [];
  if (consumerIds.length > 0) {
    const { data: allocs } = await service
      .from('allocations')
      .select('seeds_amount, amount, projects(id, title)')
      .in('consumer_id', consumerIds);

    const byProject = new Map<string, { name: string; value: number }>();
    for (const a of allocs ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proj = (a as any).projects as { id: string; title: string } | null;
      if (!proj) continue;
      const seeds = Number((a as { seeds_amount?: number | null }).seeds_amount ?? 0);
      const slot = byProject.get(proj.id) ?? { name: proj.title, value: 0 };
      slot.value += seeds;
      byProject.set(proj.id, slot);
    }
    projectSeeds = Array.from(byProject.values())
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((p, i) => ({ name: p.name, value: p.value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">{merchant.business_name}</h1>
        <p className="text-cv-earth/70 text-sm">{merchant.neighborhood} · {merchant.city}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs text-cv-earth/60">Comprovantes do mês</div>
          <div className="font-display text-3xl mt-1">{monthReceipts?.length ?? 0}</div>
        </Card>
        <Card>
          <div className="text-xs text-cv-earth/60">Consumidores únicos</div>
          <div className="font-display text-3xl mt-1">{uniqueConsumers}</div>
        </Card>
        <Card className="md:col-span-1">
          <div className="text-xs text-cv-earth/60">Volume rastreado</div>
          <div className="font-display text-3xl mt-1">{formatBRL(volume)}</div>
          <div className="mt-2 -mx-2">
            <TrendLine data={dailyData} />
          </div>
          <div className="mt-1 text-[11px] text-cv-earth/55">Últimos 30 dias</div>
        </Card>
        <Card>
          <div className="text-xs text-cv-earth/60">Fatura estimada</div>
          <div className="font-display text-3xl mt-1 text-cv-gold">{formatBRL(estimatedInvoice)}</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Evolução mensal</h2>
            <span className="text-xs text-cv-earth/55">4 semanas</span>
          </div>
          <p className="text-xs text-cv-earth/60 mt-1">Volume aprovado por semana.</p>
          <div className="mt-4">
            <VolumeChart data={weeklyData} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Impacto ESG</h2>
            <span className="text-xs text-cv-earth/55">Seeds por projeto</span>
          </div>
          <p className="text-xs text-cv-earth/60 mt-1">Onde seus clientes plantaram as Seeds deste mês.</p>
          <div className="mt-4">
            <SeedsChart data={projectSeeds} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-xl">Sua taxa Cidade Viva</h2>
        <p className="mt-2 text-cv-earth/70 text-sm">
          Você contribui com <strong>{Number(merchant.cashback_rate).toFixed(1)}%</strong> de cada compra escaneada.
          Esse valor vira Seeds de impacto na comunidade.
        </p>
      </Card>
    </div>
  );
}
