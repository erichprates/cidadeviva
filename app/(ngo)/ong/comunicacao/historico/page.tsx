import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SEGMENT_LABEL: Record<string, string> = {
  todos: 'Todos os apoiadores',
  projeto: 'Por projeto',
  nivel: 'Por nível',
  inativos: 'Inativos',
};

export default async function HistoricoPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: logs } = await service
    .from('message_logs')
    .select('*')
    .eq('ngo_admin_id', user.id)
    .order('sent_at', { ascending: false });

  return (
    <div className="space-y-5">
      <Link href="/ong/comunicacao" className="inline-flex items-center text-sm text-cv-earth/70 hover:text-cv-earth">
        ← Voltar para Comunicação
      </Link>
      <div>
        <h1 className="font-display text-3xl">Histórico</h1>
        <p className="text-sm text-cv-earth/65 mt-1">{(logs ?? []).length} disparo{(logs ?? []).length === 1 ? '' : 's'} registrado{(logs ?? []).length === 1 ? '' : 's'}.</p>
      </div>

      {(logs ?? []).length === 0 ? (
        <div className="bg-cv-white rounded-2xl p-8 text-center text-cv-earth/60 border border-cv-earth/5">
          Nenhum disparo ainda. Vá em <Link href="/ong/comunicacao/nova" className="text-cv-green font-medium">Nova mensagem</Link>.
        </div>
      ) : (
        <div className="bg-cv-white rounded-2xl border border-cv-earth/5 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-cv-earth/65 border-b border-cv-earth/5">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Segmento</th>
                <th className="px-4 py-3">Destinatários</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mensagem</th>
              </tr>
            </thead>
            <tbody>
              {logs!.map((m) => (
                <tr key={m.id} className="border-b border-cv-earth/5 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-cv-earth/75">
                    {new Date(m.sent_at as string).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{SEGMENT_LABEL[m.segment as string] ?? m.segment}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">{m.recipients_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5"
                      style={{ background: 'rgba(232,160,32,0.18)', color: '#a06a00' }}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-cv-earth/85" title={m.content as string}>
                    {m.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
