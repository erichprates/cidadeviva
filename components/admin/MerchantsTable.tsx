'use client';

import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { MerchantForm } from './MerchantForm';
import type { Merchant } from '@/lib/supabase/types';

const statusTone = {
  active: { tone: 'green' as const, label: 'Ativo' },
  pending: { tone: 'earth' as const, label: 'Pendente' },
  suspended: { tone: 'amber' as const, label: 'Suspenso' },
};

export function MerchantsTable({ initial }: { initial: Merchant[] }) {
  const [list, setList] = useState<Merchant[]>(initial);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Merchant | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) =>
      m.business_name.toLowerCase().includes(q) ||
      (m.document ?? '').toLowerCase().includes(q),
    );
  }, [list, query]);

  const reload = async () => {
    const res = await fetch('/api/admin/merchants/list', { cache: 'no-store' }).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setList(data.merchants as Merchant[]);
    } else {
      window.location.reload();
    }
  };

  const toggleStatus = async (m: Merchant) => {
    const next = m.status === 'active' ? 'suspended' : 'active';
    await fetch('/api/admin/merchants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, status: next }),
    });
    setList((prev) => prev.map((x) => x.id === m.id ? { ...x, status: next } : x));
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou CNPJ..."
          className="rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-white text-sm md:w-80 focus:outline-none focus:border-cv-green"
        />
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>+ Novo lojista</Button>
      </div>

      <div className="bg-cv-white rounded-2xl border border-cv-earth/5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cv-sand text-cv-earth/70 text-left">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Bairro</th>
              <th className="px-4 py-3">Taxa</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const s = statusTone[m.status as keyof typeof statusTone] ?? statusTone.pending;
              return (
                <tr key={m.id} className="border-t border-cv-earth/5">
                  <td className="px-4 py-3 font-medium">{m.business_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{m.document ?? '—'}</td>
                  <td className="px-4 py-3">{m.business_type}</td>
                  <td className="px-4 py-3">{m.neighborhood}</td>
                  <td className="px-4 py-3">{Number(m.cashback_rate).toFixed(1)}%</td>
                  <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditing(m); setFormOpen(true); }} className="text-cv-green text-xs mr-3 hover:underline">Editar</button>
                    <button onClick={() => toggleStatus(m)} className="text-cv-earth/70 text-xs hover:underline">
                      {m.status === 'active' ? 'Suspender' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-cv-earth/60">Nenhum lojista.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <MerchantForm
          merchant={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); reload(); }}
        />
      )}
    </div>
  );
}
