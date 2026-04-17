import { createServiceClient } from '@/lib/supabase/server';
import { OnboardingList } from '@/components/ngo/OnboardingList';

export default async function OnboardingPage() {
  const service = createServiceClient();
  const { data: receipts } = await service
    .from('receipts')
    .select('extracted_cnpj, extracted_merchant_name, rejection_reason')
    .eq('status', 'rejected')
    .ilike('rejection_reason', '%estabelecimento%');

  const grouped = new Map<string, { cnpj: string | null; merchant_name: string | null; count: number }>();
  for (const r of receipts ?? []) {
    const key = r.extracted_cnpj ?? r.extracted_merchant_name ?? 'unknown';
    const existing = grouped.get(key);
    if (existing) existing.count++;
    else grouped.set(key, { cnpj: r.extracted_cnpj, merchant_name: r.extracted_merchant_name, count: 1 });
  }

  const rows = Array.from(grouped.entries())
    .filter(([k]) => k !== 'unknown')
    .map(([id, v]) => ({ id, ...v }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Onboarding de lojistas</h1>
        <p className="text-cv-earth/70 text-sm">
          Estabelecimentos que apareceram em comprovantes rejeitados — oportunidade de trazê-los pra rede.
        </p>
      </div>
      <OnboardingList rows={rows} />
    </div>
  );
}
