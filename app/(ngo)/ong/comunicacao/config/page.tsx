import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { WhatsappConfigForm } from '@/components/ngo/WhatsappConfigForm';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: config } = await service
    .from('whatsapp_config')
    .select('instance_name, api_url, api_key, phone_number')
    .eq('ngo_admin_id', user.id)
    .maybeSingle();

  return (
    <div className="space-y-5">
      <Link href="/ong/comunicacao" className="inline-flex items-center text-sm text-cv-earth/70 hover:text-cv-earth">
        ← Voltar para Comunicação
      </Link>
      <div>
        <h1 className="font-display text-3xl">Configuração</h1>
        <p className="text-sm text-cv-earth/65 mt-1">Conecte sua instância da Evolution API.</p>
      </div>
      <WhatsappConfigForm initial={config ? {
        instance_name: config.instance_name as string | null,
        api_url: config.api_url as string | null,
        api_key: config.api_key as string | null,
        phone_number: config.phone_number as string | null,
      } : null} />
    </div>
  );
}
