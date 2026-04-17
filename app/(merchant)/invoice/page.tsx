import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PrintButton } from '@/components/ui/PrintButton';
import { PixPaymentBlock } from '@/components/merchant/PixPaymentBlock';
import { EsgEvolutionChart, type EsgPoint } from '@/components/merchant/EsgEvolutionChart';
import { SocialArtGenerator } from '@/components/merchant/SocialArtGenerator';
import type { Invoice } from '@/lib/supabase/types';
import { seedsFromAmount } from '@/lib/credits/calculator';
import { getCategory } from '@/lib/categories';
import { formatBRL, formatDate, formatSeeds } from '@/lib/format';
import { SeedIcon } from '@/components/ui/SeedIcon';

export const dynamic = 'force-dynamic';

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(d: Date): string {
  return `${MONTH_SHORT[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
}

function firstOfMonthUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

export default async function MerchantInvoicePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: merchants } = await service.from('merchants').select('*').eq('profile_id', user.id).limit(1);
  const merchant = merchants?.[0];
  if (!merchant) return <Card><div className="text-cv-earth/70">Cadastro não encontrado.</div></Card>;

  const now = new Date();
  const monthStart = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth());
  const monthEnd = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const sixMonthsAgo = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth() - 5);

  const [{ data: currentReceipts }, { data: sixMonthReceipts }, { data: invoices }] = await Promise.all([
    service
      .from('receipts')
      .select('consumer_id, extracted_amount, seeds_generated, status')
      .eq('merchant_id', merchant.id)
      .eq('status', 'approved')
      .gte('created_at', monthStart.toISOString())
      .lt('created_at', monthEnd.toISOString()),
    service
      .from('receipts')
      .select('consumer_id, extracted_amount, seeds_generated, status, created_at')
      .eq('merchant_id', merchant.id)
      .eq('status', 'approved')
      .gte('created_at', sixMonthsAgo.toISOString()),
    service
      .from('invoices')
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('period_end', { ascending: false }),
  ]);

  const volumeMonth = (currentReceipts ?? []).reduce((s, r) => s + Number(r.extracted_amount ?? 0), 0);
  const invoiceAmount = Number((volumeMonth * (Number(merchant.cashback_rate) / 100)).toFixed(2));
  const uniqueConsumers = new Set((currentReceipts ?? []).map((r) => r.consumer_id as string)).size;

  const consumerIdsMonth = Array.from(new Set((currentReceipts ?? []).map((r) => r.consumer_id as string)));
  const { data: allocations } = consumerIdsMonth.length
    ? await service
        .from('allocations')
        .select('seeds_amount, amount, projects(id, title, category, impact_unit, impact_per_seed, beneficiaries_count)')
        .in('consumer_id', consumerIdsMonth)
        .gte('created_at', monthStart.toISOString())
    : { data: [] };

  interface ProjectAgg {
    id: string;
    title: string;
    category: string;
    impact_unit: string | null;
    impact_per_seed: number | null;
    seeds: number;
    beneficiaries: number;
  }
  const projectMap = new Map<string, ProjectAgg>();
  for (const a of allocations ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proj = (a as any).projects as {
      id: string;
      title: string;
      category: string;
      impact_unit: string | null;
      impact_per_seed: number | null;
      beneficiaries_count: number;
    } | null;
    if (!proj) continue;
    const seeds = Number((a as { seeds_amount?: number | null }).seeds_amount ?? 0) || seedsFromAmount(Number((a as { amount?: number | null }).amount ?? 0));
    const existing = projectMap.get(proj.id);
    if (existing) {
      existing.seeds += seeds;
    } else {
      projectMap.set(proj.id, {
        id: proj.id,
        title: proj.title,
        category: proj.category,
        impact_unit: proj.impact_unit,
        impact_per_seed: proj.impact_per_seed,
        seeds,
        beneficiaries: Number(proj.beneficiaries_count ?? 0),
      });
    }
  }
  const projectTotals = Array.from(projectMap.values()).sort((a, b) => b.seeds - a.seeds);
  const maxSeeds = projectTotals.reduce((m, p) => (p.seeds > m ? p.seeds : m), 0);
  const totalBeneficiaries = projectTotals.reduce((s, p) => s + p.beneficiaries, 0);

  const dueDate = new Date(monthEnd.getTime() - 1);
  const daysToDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
  const isDueSoon = daysToDue >= 0 && daysToDue <= 5;

  const statusBadge = (() => {
    if (daysToDue < 0) return { bg: 'rgba(220, 38, 38, 0.12)', fg: '#b91c1c', label: 'Vencida' };
    return { bg: 'rgba(232, 160, 32, 0.18)', fg: '#a06a00', label: 'Em aberto' };
  })();

  const evolution: EsgPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const s = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth() - i);
    const e = firstOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1);
    let vol = 0;
    let sd = 0;
    const consumersInMonth = new Set<string>();
    for (const r of sixMonthReceipts ?? []) {
      const created = new Date(r.created_at as string);
      if (created >= s && created < e) {
        vol += Number(r.extracted_amount ?? 0);
        sd += Number(r.seeds_generated ?? 0);
        consumersInMonth.add(r.consumer_id as string);
      }
    }
    evolution.push({
      label: monthLabel(s),
      volume: Number(vol.toFixed(2)),
      seeds: Math.round(sd),
      families: consumersInMonth.size,
    });
  }

  const current: Invoice = {
    id: 'current',
    merchant_id: merchant.id,
    period_start: monthStart.toISOString().slice(0, 10),
    period_end: new Date(monthEnd.getTime() - 1).toISOString().slice(0, 10),
    total_scanned_amount: volumeMonth,
    cashback_rate: Number(merchant.cashback_rate),
    invoice_amount: invoiceAmount,
    status: daysToDue < 0 ? 'overdue' : 'pending',
    paid_at: null,
    created_at: new Date().toISOString(),
  };

  const periodLabelCurrent = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Fatura</h1>
          <p className="text-sm text-cv-earth/65 mt-0.5">
            {formatDate(current.period_start)} – {formatDate(current.period_end)}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print flex-wrap">
          <span
            className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: statusBadge.bg, color: statusBadge.fg }}
          >
            {statusBadge.label}
          </span>
          <SocialArtGenerator
            data={{
              merchantName: merchant.business_name as string,
              city: (merchant.city as string) ?? 'São José dos Campos',
              month: periodLabelCurrent,
              familiesImpacted: totalBeneficiaries,
              projectsCount: projectTotals.length,
              totalSeeds: projectTotals.reduce((s, p) => s + p.seeds, 0),
            }}
          />
          <PrintButton>Exportar PDF</PrintButton>
          <PrintButton>Exportar ESG</PrintButton>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h2 className="font-display text-xl">Cálculo da fatura</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-cv-earth/70">Volume total rastreado</span>
              <span className="font-medium">{formatBRL(volumeMonth)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cv-earth/70">Taxa contratada</span>
              <span className="font-medium">{Number(merchant.cashback_rate).toFixed(1)}%</span>
            </div>
            <div className="border-t border-cv-earth/10 pt-3 flex justify-between items-baseline">
              <span className="text-cv-earth">Total a pagar</span>
              <span className="font-display text-cv-gold" style={{ fontSize: 30, fontWeight: 800 }}>
                {formatBRL(invoiceAmount)}
              </span>
            </div>
          </div>
          <div className="mt-4 text-xs text-cv-earth/65 flex items-center justify-between gap-3">
            <span>
              Vencimento:{' '}
              <strong className={isDueSoon ? 'text-cv-gold' : 'text-cv-earth'}>
                {formatDate(current.period_end)}
              </strong>
            </span>
            {isDueSoon && <span className="text-cv-gold font-medium">Em {daysToDue} dia(s)</span>}
          </div>
        </Card>

        <PixPaymentBlock
          amount={invoiceAmount}
          pixKey="cidade.social@cidadeviva.app"
          recipient="Cidade Social"
        />
      </div>

      <Card>
        <h2 className="font-display text-xl">Histórico</h2>
        {invoices && invoices.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-left text-cv-earth/65">
                <tr className="border-b border-cv-earth/5">
                  <th className="py-2 pr-3">Período</th>
                  <th className="py-2 pr-3">Volume</th>
                  <th className="py-2 pr-3">Fatura</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {(invoices as Invoice[]).map((inv) => (
                  <tr key={inv.id} className="border-b border-cv-earth/5 last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                    </td>
                    <td className="py-2 pr-3">{formatBRL(Number(inv.total_scanned_amount ?? 0))}</td>
                    <td className="py-2 pr-3">{formatBRL(Number(inv.invoice_amount ?? 0))}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={inv.status === 'paid' ? 'green' : inv.status === 'overdue' ? 'red' : 'amber'}>
                        {inv.status === 'paid' ? 'Paga' : inv.status === 'overdue' ? 'Atrasada' : 'Em aberto'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-cv-earth/70">
                      {inv.paid_at ? formatDate(inv.paid_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-cv-earth/65">Primeira fatura do estabelecimento.</p>
        )}
      </Card>

      <section className="rounded-3xl p-6 md:p-8" style={{ background: '#3D2B1F', color: '#FEFCF8' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-80">Relatório ESG</div>
            <h2 className="font-display mt-1" style={{ fontSize: 22, fontWeight: 700 }}>
              {periodLabelCurrent}
            </h2>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ background: 'rgba(141, 198, 63, 0.25)', color: '#B9DE73' }}
          >
            ✓ Verificado por Cidade Social
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div>
            <div className="text-xs opacity-75">Consumidores únicos</div>
            <div className="font-display mt-1" style={{ fontSize: 32, fontWeight: 700 }}>{uniqueConsumers}</div>
          </div>
          <div>
            <div className="text-xs opacity-75">Projetos beneficiados</div>
            <div className="font-display mt-1" style={{ fontSize: 32, fontWeight: 700 }}>{projectTotals.length}</div>
          </div>
          <div>
            <div className="text-xs opacity-75">Famílias impactadas</div>
            <div className="font-display mt-1" style={{ fontSize: 32, fontWeight: 700 }}>{totalBeneficiaries}</div>
          </div>
        </div>

        {projectTotals.length > 0 ? (
          <div className="mt-8">
            <div className="text-xs uppercase tracking-wide opacity-80 mb-3">Projetos financiados pelos seus clientes</div>
            <div className="space-y-4">
              {projectTotals.map((p) => {
                const cat = getCategory(p.category);
                const pct = maxSeeds > 0 ? (p.seeds / maxSeeds) * 100 : 0;
                const reaisEquivalent = Number((p.seeds * 0.10).toFixed(2));
                const impact = p.impact_per_seed ? Math.floor(p.seeds * Number(p.impact_per_seed)) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                        <span className="truncate" style={{ fontWeight: 600 }}>{p.title}</span>
                      </div>
                      <span className="whitespace-nowrap opacity-90 text-xs inline-flex items-center gap-1">
                        <strong className="inline-flex items-center gap-1">{formatSeeds(p.seeds)} <SeedIcon size={11} /></strong> · {formatBRL(reaisEquivalent)}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(254,252,248,0.08)', height: 8 }}
                    >
                      <div
                        style={{
                          background: '#8DC63F',
                          height: '100%',
                          width: `max(8px, ${pct}%)`,
                          transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      />
                    </div>
                    {impact > 0 && p.impact_unit && (
                      <div className="mt-1 text-[11px] opacity-80">
                        ≈ <strong>{formatSeeds(impact)}</strong> {p.impact_unit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-sm opacity-80">
            Seus clientes ainda não plantaram as Seeds desse período.
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-cv-white/10 text-xs opacity-75">
          Este relatório pode ser usado para fins de comunicação ESG e responsabilidade social.
        </div>
      </section>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Evolução de impacto</h2>
          <span className="text-xs text-cv-earth/55">Últimos 6 meses</span>
        </div>
        <div className="mt-4">
          <EsgEvolutionChart data={evolution} />
        </div>
      </Card>
    </div>
  );
}
