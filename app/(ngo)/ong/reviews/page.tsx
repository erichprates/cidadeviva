import { createServiceClient } from '@/lib/supabase/server';
import { ReviewQueue } from '@/components/ngo/ReviewQueue';
import type { Merchant } from '@/lib/supabase/types';

// Sempre busca dados frescos — evita "flash" de versão cacheada antiga.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReviewsPage() {
  const service = createServiceClient();
  const { data: receipts } = await service
    .from('receipts')
    .select('*')
    .in('status', ['pending', 'suspicious'])
    .order('created_at', { ascending: false });

  const consumerIds = Array.from(new Set((receipts ?? []).map((r) => r.consumer_id)));
  const { data: profiles } = consumerIds.length
    ? await service.from('profiles').select('id, full_name').in('id', consumerIds)
    : { data: [] };
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const { data: merchants } = await service.from('merchants').select('*').eq('status', 'active').order('business_name');

  // Signed URLs pra bucket privado (uma por comprovante, tolerante a falha)
  const urlMap = new Map<string, string>();
  for (const r of receipts ?? []) {
    const path = r.image_url as string;
    if (!path) continue;
    const { data: signedOne, error: signedErr } = await service.storage
      .from('receipts')
      .createSignedUrl(path, 3600);
    if (signedErr) {
      console.error('[reviews] signed URL error for', path, signedErr.message);
      continue;
    }
    if (signedOne?.signedUrl) urlMap.set(path, signedOne.signedUrl);
  }

  const items = (receipts ?? []).map((r) => {
    const visionRaw = r.vision_raw as { suspicion_reason?: string } | null;
    const confidence = Number(r.confidence_score ?? 0);
    const amount = r.extracted_amount;
    // "Quebrado": Vision não conseguiu extrair nada útil. UI mostra botão Arquivar.
    const broken = (amount === null || amount === undefined) && confidence === 0;
    return {
      id: r.id,
      consumer_id: r.consumer_id,
      consumer_name: nameMap.get(r.consumer_id) ?? 'Consumidor',
      image_url: urlMap.get(r.image_url) ?? r.image_url,
      extracted_cnpj: r.extracted_cnpj,
      extracted_merchant_name: r.extracted_merchant_name,
      extracted_amount: r.extracted_amount,
      extracted_date: r.extracted_date,
      confidence_score: r.confidence_score,
      status: r.status,
      suspicion_reason: visionRaw?.suspicion_reason ?? r.rejection_reason,
      created_at: r.created_at,
      broken,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Fila de revisão</h1>
        <p className="text-cv-earth/70 text-sm">
          {items.length} comprovante{items.length === 1 ? '' : 's'} aguardando sua decisão.
        </p>
      </div>
      <ReviewQueue items={items} merchants={(merchants as Merchant[]) ?? []} imageBaseUrl="" />
    </div>
  );
}
