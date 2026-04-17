import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ExtratoTable, type ExtratoRow } from '@/components/merchant/ExtratoTable';

export const dynamic = 'force-dynamic';

type MatchType = ExtratoRow['match_type'];

function matchTypeLabel(raw: string | null | undefined): MatchType {
  switch (raw) {
    case 'exact':
      return 'Exato';
    case 'fuzzy':
      return 'Aproximado';
    case 'name':
      return 'Por nome';
    default:
      return 'Sem match';
  }
}

export default async function ExtratoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: merchants } = await service
    .from('merchants')
    .select('id, business_name, cashback_rate')
    .eq('profile_id', user.id)
    .limit(1);
  const merchant = merchants?.[0];
  if (!merchant) return <div>Cadastro de lojista não encontrado.</div>;

  const { data: receipts } = await service
    .from('receipts')
    .select('id, created_at, consumer_id, extracted_amount, extracted_date, extracted_cnpj, seeds_generated, status, image_url, confidence_score, vision_raw')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false });

  const receiptIds = (receipts ?? []).map((r) => r.id as string);
  const [{ data: profiles }, { data: contestations }] = await Promise.all([
    (() => {
      const consumerIds = Array.from(new Set((receipts ?? []).map((r) => r.consumer_id as string)));
      if (consumerIds.length === 0) return Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> });
      return service.from('profiles').select('id, full_name').in('id', consumerIds);
    })(),
    receiptIds.length
      ? service.from('contestations').select('receipt_id, status').in('receipt_id', receiptIds).neq('status', 'resolved')
      : Promise.resolve({ data: [] as Array<{ receipt_id: string; status: string }> }),
  ]);
  const nameMap = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string).split(' ')[0]]));
  const contestedSet = new Set((contestations ?? []).map((c) => c.receipt_id as string));

  // Signed URLs pra cada imagem (bucket privado). Best-effort: ignora falhas.
  const signedMap = new Map<string, string>();
  for (const r of receipts ?? []) {
    const path = r.image_url as string | null;
    if (!path) continue;
    const { data } = await service.storage.from('receipts').createSignedUrl(path, 3600);
    if (data?.signedUrl) signedMap.set(r.id as string, data.signedUrl);
  }

  const rows: ExtratoRow[] = (receipts ?? []).map((r) => ({
    id: r.id as string,
    created_at: r.created_at as string,
    consumer_first_name: nameMap.get(r.consumer_id as string) ?? 'Cliente',
    consumer_id: r.consumer_id as string,
    extracted_amount: Number(r.extracted_amount ?? 0),
    extracted_date: r.extracted_date as string | null,
    extracted_cnpj: r.extracted_cnpj as string | null,
    seeds_generated: Number(r.seeds_generated ?? 0),
    status: r.status as ExtratoRow['status'],
    confidence_score: r.confidence_score as number | null,
    match_type: matchTypeLabel((r.vision_raw as { match_type?: string } | null)?.match_type),
    image_signed_url: signedMap.get(r.id as string) ?? null,
    contested: contestedSet.has(r.id as string),
  }));

  const today = new Date();
  const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Extrato</h1>
        <p className="text-cv-earth/70 text-sm">{merchant.business_name}</p>
      </div>
      <ExtratoTable
        rows={rows}
        initialMonth={initialMonth}
        cashbackRate={Number(merchant.cashback_rate)}
        merchantName={merchant.business_name as string}
      />
    </div>
  );
}
