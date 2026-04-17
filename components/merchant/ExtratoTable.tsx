'use client';

import { useMemo, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ReceiptDetailModal, type ReceiptDetail } from './ReceiptDetailModal';
import { formatBRL, formatDate, formatSeeds } from '@/lib/format';
import { SeedIcon } from '../ui/SeedIcon';

export interface ExtratoRow {
  id: string;
  created_at: string;
  consumer_first_name: string;
  consumer_id: string;
  extracted_amount: number;
  extracted_date: string | null;
  extracted_cnpj: string | null;
  seeds_generated: number;
  status: 'approved' | 'pending' | 'suspicious' | 'rejected';
  confidence_score: number | null;
  match_type: 'Exato' | 'Aproximado' | 'Por nome' | 'Sem match';
  image_signed_url: string | null;
  contested: boolean;
}

type Filter = 'all' | 'approved' | 'suspicious' | 'contested';

const STATUS_MAP: Record<ExtratoRow['status'], { tone: 'green' | 'amber' | 'earth' | 'red'; label: string }> = {
  approved: { tone: 'green', label: 'Aprovado' },
  pending: { tone: 'earth', label: 'Pendente' },
  suspicious: { tone: 'amber', label: 'Em revisão' },
  rejected: { tone: 'red', label: 'Rejeitado' },
};

interface Props {
  rows: ExtratoRow[];
  initialMonth: string;
  cashbackRate: number;
  merchantName: string;
}

export function ExtratoTable({ rows, initialMonth, cashbackRate, merchantName }: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<ExtratoRow | null>(null);
  const [contesting, setContesting] = useState<ExtratoRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!r.created_at.startsWith(month)) return false;
      if (filter === 'approved' && r.status !== 'approved') return false;
      if (filter === 'suspicious' && r.status !== 'suspicious') return false;
      if (filter === 'contested' && !r.contested) return false;
      if (q && !r.consumer_first_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, month, filter, search]);

  const monthApproved = useMemo(
    () => rows.filter((r) => r.created_at.startsWith(month) && r.status === 'approved'),
    [rows, month],
  );
  const volumeMonth = monthApproved.reduce((s, r) => s + Number(r.extracted_amount ?? 0), 0);
  const seedsMonth = monthApproved.reduce((s, r) => s + Number(r.seeds_generated ?? 0), 0);
  const approvedCount = monthApproved.length;
  const faturaMonth = Number((volumeMonth * (cashbackRate / 100)).toFixed(2));

  const totalFiltered = filtered.reduce((s, r) => s + Number(r.extracted_amount ?? 0), 0);
  const approvedFilteredCount = filtered.filter((r) => r.status === 'approved').length;
  const faturaFiltered = Number(
    (filtered.filter((r) => r.status === 'approved').reduce((s, r) => s + r.extracted_amount, 0) * (cashbackRate / 100)).toFixed(2),
  );

  const toDetail = (r: ExtratoRow): ReceiptDetail => ({
    id: r.id,
    image_signed_url: r.image_signed_url,
    merchant_name: merchantName,
    consumer_first_name: r.consumer_first_name,
    status: r.status,
    extracted_cnpj: r.extracted_cnpj,
    extracted_date: r.extracted_date,
    extracted_amount: r.extracted_amount,
    seeds_generated: r.seeds_generated,
    confidence_score: r.confidence_score,
    match_type: r.match_type,
    created_at: r.created_at,
  });

  const submitContest = async () => {
    if (!contesting || !reason.trim()) return;
    setBusy(true);
    const res = await fetch('/api/contestations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_id: contesting.id, reason: reason.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    setMsg(res.ok ? 'Contestação registrada. Equipe vai analisar.' : data.error);
    if (res.ok) {
      setTimeout(() => {
        setContesting(null);
        setReason('');
        setMsg(null);
        window.location.reload();
      }, 1400);
    }
  };

  return (
    <div className="pb-20 sm:pb-0">
      {/* RESUMO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-4">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Volume do período</div>
          <div className="font-display text-2xl mt-1 text-cv-green">{formatBRL(volumeMonth)}</div>
        </div>
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-4">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Seeds gerados</div>
          <div className="font-display text-2xl mt-1 inline-flex items-center gap-1.5" style={{ color: '#6B9E1F' }}>
            <SeedIcon size={22} /> {formatSeeds(seedsMonth)}
          </div>
        </div>
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-4">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Aprovados</div>
          <div className="font-display text-2xl mt-1">{approvedCount}</div>
        </div>
        <div className="rounded-2xl bg-cv-white border border-cv-earth/5 p-4">
          <div className="text-[11px] text-cv-earth/60 uppercase tracking-wide">Fatura estimada</div>
          <div className="font-display text-2xl mt-1 text-cv-gold">{formatBRL(faturaMonth)}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-3 no-print">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-white text-sm"
        />
        <button
          onClick={() => window.print()}
          className="text-sm text-cv-green hover:underline self-end sm:self-auto"
        >
          Exportar PDF
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4 no-print">
        <div className="flex gap-1 rounded-full p-1 bg-cv-earth/5 overflow-x-auto">
          {([
            ['all', 'Todos'],
            ['approved', 'Aprovados'],
            ['suspicious', 'Em revisão'],
            ['contested', 'Contestados'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition whitespace-nowrap"
              style={{
                background: filter === k ? '#FEFCF8' : 'transparent',
                color: '#3D2B1F',
                boxShadow: filter === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar consumidor..."
          className="flex-1 rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-white text-sm focus:outline-none focus:border-cv-green"
        />
      </div>

      <div className="bg-cv-white rounded-2xl border border-cv-earth/5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cv-sand text-cv-earth/70 text-left">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Consumidor</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Seeds</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right no-print">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const s = STATUS_MAP[r.status];
              return (
                <tr
                  key={r.id}
                  onClick={() => setActive(r)}
                  className="border-t border-cv-earth/5 cursor-pointer hover:bg-cv-sand/60 transition"
                >
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">{r.consumer_first_name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatBRL(Number(r.extracted_amount ?? 0))}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: 'rgba(141, 198, 63, 0.22)', color: '#1B7A4A' }}
                    >
                      {formatSeeds(Number(r.seeds_generated ?? 0))} <SeedIcon size={11} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={s.tone}>{s.label}</Badge>
                      {r.contested && <span className="text-[10px] text-red-700 font-semibold">· Contestado</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right no-print">
                    {r.status === 'approved' && !r.contested && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContesting(r);
                          setReason('');
                          setMsg(null);
                        }}
                        aria-label="Contestar"
                        title="Contestar"
                        className="inline-flex items-center justify-center rounded-full text-amber-700 hover:bg-amber-50 transition"
                        style={{ width: 30, height: 30 }}
                      >
                        ⚠️
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-cv-earth/60 text-sm">
                  Nada neste período com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div
          className="fixed sm:static left-0 right-0 z-30 px-4 sm:px-0 no-print"
          style={{ bottom: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto max-w-5xl mt-0 sm:mt-4">
            <div
              className="rounded-2xl px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2"
              style={{
                background: 'rgba(61, 43, 31, 0.96)',
                color: '#FEFCF8',
                boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span>
                Total: <strong>{formatBRL(totalFiltered)}</strong> · {approvedFilteredCount} aprovado{approvedFilteredCount === 1 ? '' : 's'}
              </span>
              <span className="text-cv-lime">
                Fatura estimada: <strong>{formatBRL(faturaFiltered)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      <ReceiptDetailModal
        receipt={active ? toDetail(active) : null}
        onClose={() => setActive(null)}
        onContest={(d) => {
          const r = rows.find((x) => x.id === d.id);
          if (!r) return;
          setActive(null);
          setContesting(r);
          setReason('');
          setMsg(null);
        }}
      />

      {contesting && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-cv-earth/40 p-4 no-print"
          onClick={() => setContesting(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-cv-white rounded-3xl p-6"
          >
            <h3 className="font-display text-xl">Contestar comprovante</h3>
            <p className="mt-2 text-sm text-cv-earth/70">
              Descreva o motivo — a equipe Cidade Viva vai analisar.
            </p>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-3 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand text-sm focus:outline-none focus:border-cv-green"
              placeholder="Ex: valor não corresponde, compra não reconhecida..."
            />
            {msg && <div className="mt-3 text-sm">{msg}</div>}
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={() => setContesting(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={submitContest} disabled={busy || !reason.trim()} className="flex-1">
                {busy ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
