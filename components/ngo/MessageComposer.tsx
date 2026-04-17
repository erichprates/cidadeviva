'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';

type Segment = 'todos' | 'projeto' | 'nivel' | 'inativos';

interface ProjectOption {
  id: string;
  title: string;
  count: number; // apoiadores únicos
}

interface Props {
  projects: ProjectOption[];
  totalConsumers: number;
  inactivesCount: number;
  byLevel: Record<string, number>;
}

const LEVELS: Array<{ v: string; l: string; emoji: string }> = [
  { v: 'Broto', l: 'Broto', emoji: '🌱' },
  { v: 'Muda', l: 'Muda', emoji: '🌿' },
  { v: 'Árvore', l: 'Árvore', emoji: '🌳' },
  { v: 'Floresta', l: 'Floresta', emoji: '🌲' },
];

const SAMPLE = {
  nome: 'Maria',
  seeds: 320,
  nivel: 'Muda 🌿',
};

function renderPreview(text: string): string {
  return text
    .replaceAll('{{nome}}', SAMPLE.nome)
    .replaceAll('{{seeds}}', String(SAMPLE.seeds))
    .replaceAll('{{nivel}}', SAMPLE.nivel);
}

export function MessageComposer({ projects, totalConsumers, inactivesCount, byLevel }: Props) {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('todos');
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '');
  const [level, setLevel] = useState<string>('Muda');
  const [content, setContent] = useState<string>(
    'Oi {{nome}}! 🌱 Seu apoio fez diferença essa semana. Você já plantou {{seeds}} Seeds e está no nível {{nivel}}.',
  );
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const recipientsCount = useMemo(() => {
    if (segment === 'todos') return totalConsumers;
    if (segment === 'inativos') return inactivesCount;
    if (segment === 'nivel') return byLevel[level] ?? 0;
    if (segment === 'projeto') return projects.find((p) => p.id === projectId)?.count ?? 0;
    return 0;
  }, [segment, projects, projectId, level, totalConsumers, inactivesCount, byLevel]);

  const send = async () => {
    setErr(null);
    setDone(false);
    if (!content.trim()) {
      setErr('A mensagem não pode ficar vazia.');
      return;
    }
    setSending(true);
    // Simula latência de envio
    await new Promise((r) => setTimeout(r, 1500));

    const res = await fetch('/api/ong/comunicacao/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        segment,
        content,
        recipients_count: recipientsCount,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setErr(data?.error ?? 'Falha ao enviar.');
      return;
    }
    setDone(true);
    setContent('');
    router.refresh();
  };

  const inp = 'mt-1 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand focus:outline-none focus:border-cv-green text-sm';

  const preview = renderPreview(content || ' ');

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* COMPOSER */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm">
            <span className="text-cv-earth/70 font-medium">Segmentação</span>
            <select className={inp} value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
              <option value="todos">Todos os apoiadores</option>
              <option value="projeto">Por projeto</option>
              <option value="nivel">Por nível</option>
              <option value="inativos">Inativos (sem scan há 30+ dias)</option>
            </select>
          </label>
        </div>

        {segment === 'projeto' && (
          <label className="block text-sm">
            <span className="text-cv-earth/70 font-medium">Projeto</span>
            <select className={inp} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.length === 0 && <option value="">Sem projetos</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.count} apoiador{p.count === 1 ? '' : 'es'})
                </option>
              ))}
            </select>
          </label>
        )}

        {segment === 'nivel' && (
          <label className="block text-sm">
            <span className="text-cv-earth/70 font-medium">Nível</span>
            <select className={inp} value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l.v} value={l.v}>
                  {l.emoji} {l.l} ({byLevel[l.v] ?? 0})
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="rounded-xl bg-cv-sand p-3 text-sm text-cv-earth/80">
          <strong>{recipientsCount}</strong> destinatário{recipientsCount === 1 ? '' : 's'} estimado{recipientsCount === 1 ? '' : 's'}
        </div>

        <div>
          <label className="block text-sm">
            <span className="text-cv-earth/70 font-medium">Mensagem</span>
            <textarea
              className={inp}
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva sua mensagem..."
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(['{{nome}}', '{{seeds}}', '{{nivel}}'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setContent((c) => c + (c.endsWith(' ') || c === '' ? '' : ' ') + v)}
                className="text-[11px] rounded-full px-2 py-1 bg-cv-sand border border-cv-earth/10 hover:bg-cv-white"
              >
                {v}
              </button>
            ))}
          </div>
          <div className="mt-1 text-[11px] text-cv-earth/55">
            Variáveis disponíveis: nome, seeds, nivel.
          </div>
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {done && <div className="text-sm text-cv-green">Disparo simulado registrado no histórico ✓</div>}

        <Button onClick={send} disabled={sending || recipientsCount === 0}>
          {sending ? 'Enviando...' : `Enviar para ${recipientsCount}`}
        </Button>
      </div>

      {/* PREVIEW estilo WhatsApp */}
      <div>
        <div className="text-xs text-cv-earth/55 uppercase tracking-wide mb-2">Pré-visualização</div>
        <div
          className="rounded-2xl p-4"
          style={{
            background:
              'linear-gradient(180deg, #ECE5DD 0%, #ECE5DD 100%), repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 6px, transparent 6px 12px)',
            minHeight: 280,
          }}
        >
          <div
            className="rounded-xl px-3 py-2 max-w-[85%] shadow-sm"
            style={{
              background: '#DCF8C6',
              borderTopLeftRadius: 4,
            }}
          >
            <div className="text-[11px] font-semibold text-cv-green">Cidade Viva</div>
            <div className="text-sm text-cv-earth whitespace-pre-line mt-0.5">
              {preview || <span className="text-cv-earth/40">Sua mensagem aparece aqui</span>}
            </div>
            <div className="text-[10px] text-cv-earth/55 mt-1 text-right">agora · simulado</div>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-cv-earth/55">
          Exemplo: nome = <strong>{SAMPLE.nome}</strong>, seeds = <strong>{SAMPLE.seeds}</strong>, nivel = <strong>{SAMPLE.nivel}</strong>.
        </div>
      </div>
    </div>
  );
}
