import { createServiceClient } from '@/lib/supabase/server';
import { MerchantsTable } from '@/components/admin/MerchantsTable';
import type { Merchant } from '@/lib/supabase/types';

export default async function AdminMerchantsPage() {
  const service = createServiceClient();
  const { data: merchants } = await service.from('merchants').select('*').order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Lojistas</h1>
        <p className="text-cv-earth/70 text-sm">Cadastre e gerencie os parceiros da rede.</p>
      </div>
      <MerchantsTable initial={(merchants as Merchant[]) ?? []} />
    </div>
  );
}
