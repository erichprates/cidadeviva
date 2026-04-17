import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { timeAgoPt } from '@/lib/avatars';
import { formatSeeds } from '@/lib/format';

export const dynamic = 'force-dynamic';

const SEGMENT_LABEL: Record<string, string> = {
  todos: 'Todos os apoiadores',
  projeto: 'Por projeto',
  nivel: 'Por nível',
  inativos: 'Inativos',
};

function WhatsAppIcon({ size = 22, color = '#FEFCF8' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        d="M17.3 14.3c-.3-.15-1.78-.88-2.06-.98-.27-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.36.22-.66.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.6.14-.14.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.51l-.57-.01c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.12 3.23 5.14 4.53.72.3 1.28.5 1.72.63.72.23 1.38.2 1.9.12.58-.08 1.78-.72 2.03-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35z"
        fill={color}
      />
    </svg>
  );
}

function ListClockIcon({ size = 22, color = '#3D2B1F' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="6" x2="13" y2="6" />
      <line x1="3" y1="12" x2="10" y2="12" />
      <line x1="3" y1="18" x2="10" y2="18" />
      <circle cx="17" cy="16" r="5" />
      <path d="M17 14v2.2l1.4.8" />
    </svg>
  );
}

function PlugIcon({ size = 22, color = '#3D2B1F' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <rect x="7" y="8" width="10" height="6" rx="1.5" />
      <path d="M12 14v3a3 3 0 0 0 3 3h2" />
    </svg>
  );
}

export default async function ComunicacaoHubPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [{ data: config }, { data: logs }, { data: monthLogs }] = await Promise.all([
    service.from('whatsapp_config').select('*').eq('ngo_admin_id', user.id).maybeSingle(),
    service
      .from('message_logs')
      .select('*')
      .eq('ngo_admin_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(5),
    service
      .from('message_logs')
      .select('recipients_count, sent_at')
      .eq('ngo_admin_id', user.id)
      .gte('sent_at', monthStart.toISOString()),
  ]);

  const isConnected = !!config?.is_connected;
  const hasConfig = !!config;
  const status = isConnected ? 'Conectado' : hasConfig ? 'Aguardando ativação' : 'Não configurado';
  const statusBg = isConnected ? 'rgba(27,122,74,0.15)' : 'rgba(232,160,32,0.18)';
  const statusFg = isConnected ? '#1B7A4A' : '#a06a00';

  const monthMessageCount = monthLogs?.length ?? 0;
  const monthReach = (monthLogs ?? []).reduce((s, m) => s + Number(m.recipients_count ?? 0), 0);

  const hasLogs = (logs ?? []).length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Comunicação</h1>
        <p className="text-sm text-cv-earth/65 mt-1">Engaje sua comunidade com mensagens via WhatsApp.</p>
      </div>

      {/* STATUS */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-3"
        style={{ background: statusBg }}
      >
        <div>
          <div className="text-xs uppercase tracking-wide" style={{ color: statusFg }}>Status</div>
          <div className="font-display text-xl mt-0.5" style={{ color: statusFg }}>{status}</div>
          {config?.instance_name && (
            <div className="text-xs mt-0.5 text-cv-earth/65">Instância: {config.instance_name}</div>
          )}
        </div>
        <Link
          href="/ong/comunicacao/config"
          className="rounded-full bg-cv-white px-4 py-2 text-sm font-medium border border-cv-earth/10 hover:bg-cv-sand"
        >
          {hasConfig ? 'Ajustar' : 'Configurar'}
        </Link>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-4">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Mensagens esse mês</div>
          <div className="font-display text-2xl mt-1 text-cv-earth">{formatSeeds(monthMessageCount)}</div>
          {monthMessageCount === 0 && (
            <div className="mt-1 text-[11px] text-cv-earth/55">Configure o WhatsApp para começar.</div>
          )}
        </div>
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-4">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Consumidores alcançados</div>
          <div className="font-display text-2xl mt-1 text-cv-earth">{formatSeeds(monthReach)}</div>
          <div className="mt-1 text-[11px] text-cv-earth/55">Somatório dos destinatários no mês.</div>
        </div>
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-4">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Taxa de engajamento</div>
          <div className="font-display text-2xl mt-1 text-cv-earth/55">—%</div>
          <div className="mt-1 text-[11px] text-cv-earth/55">Disponível após integração real.</div>
        </div>
      </div>

      {/* CARDS DE AÇÃO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/ong/comunicacao/nova"
          className="rounded-2xl bg-cv-green text-cv-white p-5 hover:bg-cv-green/90 transition active:scale-[0.99]"
        >
          <div className="inline-grid place-items-center rounded-full" style={{ width: 44, height: 44, background: 'rgba(254,252,248,0.14)' }}>
            <WhatsAppIcon size={24} />
          </div>
          <div className="font-display text-lg mt-3">Nova mensagem</div>
          <div className="text-xs opacity-90 mt-1">Componha e dispare para sua base.</div>
        </Link>
        <Link
          href="/ong/comunicacao/historico"
          className="rounded-2xl bg-cv-white border border-cv-earth/5 p-5 hover:bg-cv-sand transition active:scale-[0.99]"
        >
          <div
            className="inline-grid place-items-center rounded-full"
            style={{ width: 44, height: 44, background: 'rgba(141, 198, 63, 0.22)' }}
          >
            <ListClockIcon size={22} color="#1B7A4A" />
          </div>
          <div className="font-display text-lg mt-3 text-cv-earth">Histórico</div>
          <div className="text-xs text-cv-earth/65 mt-1">Veja tudo que já saiu.</div>
        </Link>
        <Link
          href="/ong/comunicacao/config"
          className="rounded-2xl bg-cv-white border border-cv-earth/5 p-5 hover:bg-cv-sand transition active:scale-[0.99]"
        >
          <div
            className="inline-grid place-items-center rounded-full"
            style={{ width: 44, height: 44, background: 'rgba(232, 160, 32, 0.22)' }}
          >
            <PlugIcon size={22} color="#a06a00" />
          </div>
          <div className="font-display text-lg mt-3 text-cv-earth">Configurar</div>
          <div className="text-xs text-cv-earth/65 mt-1">Conecte sua Evolution API.</div>
        </Link>
      </div>

      {/* EMPTY STATE RICO ou LISTAGEM */}
      <section>
        <h2 className="font-display text-xl mb-3">Últimos disparos</h2>
        {!hasLogs ? (
          <div className="bg-cv-white rounded-2xl border border-cv-earth/5 p-6">
            <div className="font-display text-cv-earth" style={{ fontSize: 17, fontWeight: 700 }}>
              Como começar
            </div>
            <ol className="mt-4 space-y-3">
              {[
                { step: 1, emoji: '⚙️', title: 'Configure sua instância WhatsApp', href: '/ong/comunicacao/config' },
                { step: 2, emoji: '✍️', title: 'Crie sua primeira mensagem', href: '/ong/comunicacao/nova' },
                { step: 3, emoji: '🚀', title: 'Dispare para seus plantadores', href: '/ong/comunicacao/nova' },
              ].map((s) => (
                <li key={s.step} className="flex items-center gap-3">
                  <span
                    className="inline-grid place-items-center rounded-full shrink-0 font-display font-bold"
                    style={{
                      width: 32,
                      height: 32,
                      background: 'rgba(141, 198, 63, 0.22)',
                      color: '#1B7A4A',
                      fontSize: 14,
                    }}
                  >
                    {s.step}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-cv-earth/85">
                    <span>{s.emoji}</span>
                    <span>{s.title}</span>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              href="/ong/comunicacao/config"
              className="mt-5 inline-flex items-center rounded-full bg-cv-green text-cv-white px-5 py-2.5 text-sm font-semibold active:scale-95 transition"
            >
              Começar agora →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {logs!.map((m) => {
              const isSimulated = m.status === 'simulated';
              const badgeBg = isSimulated ? 'rgba(36, 99, 175, 0.15)' : 'rgba(27, 122, 74, 0.15)';
              const badgeFg = isSimulated ? '#1B4A7A' : '#1B7A4A';
              const badgeLabel = isSimulated ? 'Simulado' : 'Enviado';
              const preview = String(m.content ?? '').slice(0, 60);
              return (
                <div key={m.id} className="bg-cv-white rounded-2xl p-4 border border-cv-earth/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-cv-earth/55 min-w-0">
                      <WhatsAppIcon size={18} />
                      <span className="truncate">
                        {timeAgoPt(m.sent_at as string)} · {SEGMENT_LABEL[m.segment as string] ?? m.segment} · {m.recipients_count} destinatários
                      </span>
                    </div>
                    <span
                      className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0"
                      style={{ background: badgeBg, color: badgeFg }}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-cv-earth/85">
                    {preview}
                    {(m.content ?? '').length > 60 ? '…' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
