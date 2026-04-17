'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { Merchant } from '@/lib/supabase/types';
import { formatBRL, formatDateTime } from '@/lib/format';

const REJECT_REASONS = [
  'Comprovante ilegível',
  'Estabelecimento não identificado',
  'Comprovante duplicado suspeito',
  'Imagem manipulada',
  'Outro',
];

interface ReviewItem {
  id: string;
  consumer_name: string;
  consumer_id: string;
  image_url: string;
  extracted_cnpj: string | null;
  extracted_merchant_name: string | null;
  extracted_amount: number | null;
  extracted_date: string | null;
  confidence_score: number | null;
  status: string;
  suspicion_reason: string | null;
  created_at: string;
  broken?: boolean;
}

interface Props {
  items: ReviewItem[];
  merchants: Merchant[];
  imageBaseUrl: string;
}

function formatCnpj(raw: string | null): string {
  if (!raw) return '—';
  const d = raw.replace(/\D/g, '');
  if (d.length !== 14) return raw; // devolve original se não for 14 dígitos
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function waitingBadge(createdAt: string): { text: string; color: string; alert: boolean } {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  let text: string;
  if (hours < 1) text = 'menos de 1h';
  else if (hours < 24) text = `${hours} h`;
  else if (days < 14) text = `${days} dia${days === 1 ? '' : 's'}`;
  else text = `${Math.floor(days / 7)} semanas`;

  if (hours >= 48) return { text, color: '#b91c1c', alert: true };
  if (hours >= 24) return { text, color: '#a06a00', alert: false };
  return { text, color: '#3D2B1F', alert: false };
}

export function ReviewQueue({ items, merchants }: Props) {
  const [filter, setFilter] = useState<'pending' | 'suspicious' | 'all'>('all');
  const [approving, setApproving] = useState<ReviewItem | null>(null);
  const [rejecting, setRejecting] = useState<ReviewItem | null>(null);
  const [viewing, setViewing] = useState<ReviewItem | null>(null);
  const [merchantId, setMerchantId] = useState('');
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState(REJECT_REASONS[0]);
  const [bulkCustom, setBulkCustom] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  // Sort oldest first (pra urgência aparecer no topo).
  const filtered = useMemo(() => {
    const base = filter === 'all' ? items : items.filter((i) => i.status === filter);
    return [...base].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [items, filter]);

  // ESC fecha lightbox
  useEffect(() => {
    if (!viewing) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewing(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [viewing]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const openApprove = (item: ReviewItem) => {
    setApproving(item);
    const auto = merchants.find((m) => m.document && item.extracted_cnpj && m.document === item.extracted_cnpj);
    setMerchantId(auto?.id ?? '');
  };

  const submitApprove = async () => {
    if (!approving || !merchantId) return;
    setBusy(true);
    const res = await fetch('/api/ong/review/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_id: approving.id, merchant_id: merchantId }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(data.message ?? data.error);
    setTimeout(() => window.location.reload(), 1000);
  };

  const submitReject = async () => {
    if (!rejecting) return;
    setBusy(true);
    const finalReason = reason === 'Outro' ? customReason.trim() : reason;
    if (!finalReason) { setBusy(false); return; }
    const res = await fetch('/api/ong/review/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_id: rejecting.id, reason: finalReason }),
    });
    setBusy(false);
    if (res.ok) {
      setRejecting(null);
      window.location.reload();
    }
  };

  const archive = async (item: ReviewItem) => {
    if (!confirm('Arquivar esse comprovante? Vai sair da fila e marcar como rejeitado por erro técnico.')) return;
    const res = await fetch('/api/ong/review/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receipt_id: item.id,
        reason: 'Arquivado: erro técnico de processamento (Vision não conseguiu extrair dados).',
      }),
    });
    if (res.ok) window.location.reload();
  };

  const submitBulkReject = async () => {
    const finalReason = bulkReason === 'Outro' ? bulkCustom.trim() : bulkReason;
    if (!finalReason || selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) =>
        fetch('/api/ong/review/reject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt_id: id, reason: finalReason }),
        }),
      ),
    );
    setBulkBusy(false);
    setBulkOpen(false);
    clearSelection();
    window.location.reload();
  };

  return (
    <div className="pb-24">
      {/* BARRA DE SELEÇÃO EM LOTE */}
      {selected.size >= 2 && (
        <div
          className="sticky top-0 z-40 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 mb-4"
          style={{
            background: 'rgba(61, 43, 31, 0.96)',
            color: '#FEFCF8',
            boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span className="text-sm">
            <strong>{selected.size}</strong> selecionados
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-cv-white/85 hover:text-cv-white px-3 py-1.5"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkReason(REJECT_REASONS[0]);
                setBulkCustom('');
                setBulkOpen(true);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 font-medium"
            >
              Rejeitar todos ✗
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 text-sm">
        {(['all', 'pending', 'suspicious'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full ${filter === k ? 'bg-cv-earth text-cv-white' : 'bg-cv-white'}`}
          >
            {k === 'all' ? 'Todos' : k === 'pending' ? 'Pendentes' : 'Suspeitos'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((i) => {
          const amber = i.status === 'suspicious';
          const wait = waitingBadge(i.created_at);
          const isSelected = selected.has(i.id);
          return (
            <div
              key={i.id}
              className={`bg-cv-white rounded-2xl p-4 border transition ${
                isSelected
                  ? 'border-cv-earth bg-cv-sand'
                  : amber
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-cv-earth/10'
              }`}
            >
              <div className="flex gap-3 sm:gap-4 items-start">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(i.id)}
                  aria-label="Selecionar comprovante"
                  className="mt-2 accent-cv-earth shrink-0"
                  style={{ width: 18, height: 18 }}
                />
                <button
                  onClick={() => setViewing(i)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-cv-sand overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-cv-green/40 transition"
                  aria-label="Ver foto em tamanho grande"
                >
                  <img
                    src={i.image_url}
                    alt="Comprovante"
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={amber ? 'amber' : 'earth'}>{amber ? 'Suspeito' : 'Pendente'}</Badge>
                    {i.broken && <Badge tone="red">Erro técnico</Badge>}
                    <span
                      className="text-xs inline-flex items-center gap-1"
                      style={{ color: wait.color, fontWeight: wait.alert ? 600 : 400 }}
                    >
                      {wait.alert && <span aria-hidden>⚠️</span>}
                      Aguardando há {wait.text}
                    </span>
                    <span className="text-xs text-cv-earth/60">· {formatDateTime(i.created_at)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span className="text-cv-earth/60">CNPJ:</span>{' '}
                      {i.extracted_cnpj ? (
                        <span className="font-mono text-xs">{formatCnpj(i.extracted_cnpj)}</span>
                      ) : (
                        <span
                          className="text-cv-earth/55"
                          title="CNPJ não identificado pelo Vision"
                        >
                          —
                        </span>
                      )}
                    </div>
                    <div><span className="text-cv-earth/60">Loja:</span> {i.extracted_merchant_name ?? '—'}</div>
                    <div><span className="text-cv-earth/60">Valor:</span> {formatBRL(Number(i.extracted_amount ?? 0))}</div>
                    <div><span className="text-cv-earth/60">Data:</span> {i.extracted_date ?? '—'}</div>
                    <div><span className="text-cv-earth/60">Confiança:</span> {Number((i.confidence_score ?? 0) * 100).toFixed(0)}%</div>
                    <div><span className="text-cv-earth/60">Enviado por:</span> {i.consumer_name}</div>
                  </div>
                  {i.suspicion_reason && (
                    <div className="mt-2 text-xs text-amber-800 bg-amber-100 rounded px-2 py-1 inline-block">
                      {i.suspicion_reason}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {i.broken ? (
                    <button
                      onClick={() => archive(i)}
                      className="text-xs px-3 py-1.5 rounded-full bg-cv-earth/15 text-cv-earth hover:bg-cv-earth/25"
                      title="Vision não conseguiu extrair dados deste comprovante."
                    >
                      Arquivar 🗄️
                    </button>
                  ) : (
                    <Button onClick={() => openApprove(i)} className="text-xs px-3 py-1.5">Aprovar ✓</Button>
                  )}
                  <button
                    onClick={() => { setRejecting(i); setReason(REJECT_REASONS[0]); setCustomReason(''); }}
                    className="text-xs px-3 py-1.5 rounded-full bg-red-600 text-white hover:bg-red-700"
                  >
                    Rejeitar ✗
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-cv-white rounded-2xl p-8 text-center text-cv-earth/60">
            Nada na fila. Bom trabalho 🌿
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.88)' }}
          onClick={() => setViewing(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setViewing(null);
            }}
            aria-label="Fechar"
            className="absolute top-4 right-4 grid place-items-center rounded-full"
            style={{
              width: 44,
              height: 44,
              background: 'rgba(254,252,248,0.18)',
              color: '#FEFCF8',
              fontSize: 22,
              backdropFilter: 'blur(8px)',
            }}
          >
            ✕
          </button>
          <img
            src={viewing.image_url}
            alt="Comprovante"
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl"
            style={{ maxWidth: 'min(600px, 92vw)', maxHeight: '88vh', objectFit: 'contain', background: '#FEFCF8' }}
          />
        </div>
      )}

      {approving && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cv-earth/40 p-4" onClick={() => setApproving(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-cv-white rounded-3xl p-6">
            <h3 className="font-display text-xl">Qual lojista é esse?</h3>
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="mt-4 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand"
            >
              <option value="">— selecione —</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.business_name} {m.document ? `· ${m.document}` : ''} · {Number(m.cashback_rate).toFixed(1)}%
                </option>
              ))}
            </select>
            {msg && <div className="mt-3 text-sm">{msg}</div>}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={() => setApproving(null)} className="flex-1">Cancelar</Button>
              <Button onClick={submitApprove} disabled={!merchantId || busy} className="flex-1">
                {busy ? 'Aprovando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cv-earth/40 p-4" onClick={() => setRejecting(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-cv-white rounded-3xl p-6">
            <h3 className="font-display text-xl">Rejeitar comprovante</h3>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-4 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand"
            >
              {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {reason === 'Outro' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descreva o motivo..."
                className="mt-3 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand text-sm"
                rows={3}
              />
            )}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={() => setRejecting(null)} className="flex-1">Cancelar</Button>
              <button
                onClick={submitReject}
                disabled={busy || (reason === 'Outro' && !customReason.trim())}
                className="flex-1 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {busy ? 'Rejeitando...' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK REJECT MODAL */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cv-earth/50 p-4" onClick={() => setBulkOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-cv-white rounded-3xl p-6">
            <h3 className="font-display text-xl">Rejeitar {selected.size} comprovantes</h3>
            <p className="mt-1 text-sm text-cv-earth/70">
              Todos receberão o mesmo motivo. Essa ação não pode ser desfeita.
            </p>
            <select
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              className="mt-4 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand"
            >
              {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {bulkReason === 'Outro' && (
              <textarea
                value={bulkCustom}
                onChange={(e) => setBulkCustom(e.target.value)}
                placeholder="Descreva o motivo..."
                className="mt-3 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand text-sm"
                rows={3}
              />
            )}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={() => setBulkOpen(false)} className="flex-1">Cancelar</Button>
              <button
                onClick={submitBulkReject}
                disabled={bulkBusy || (bulkReason === 'Outro' && !bulkCustom.trim())}
                className="flex-1 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {bulkBusy ? 'Rejeitando...' : `Rejeitar ${selected.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
