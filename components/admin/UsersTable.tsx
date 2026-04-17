'use client';

import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { Merchant, Profile, UserRole } from '@/lib/supabase/types';
import { formatDate } from '@/lib/format';

type UserRow = Profile & { email: string | null };

interface Props {
  users: UserRow[];
  merchants: Merchant[];
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'consumer', label: 'Consumidor' },
  { value: 'merchant', label: 'Lojista' },
  { value: 'ngo_admin', label: 'ONG' },
  { value: 'platform_admin', label: 'Admin' },
];

export function UsersTable({ users, merchants }: Props) {
  const [filter, setFilter] = useState<UserRole | 'all'>('all');
  const [promoting, setPromoting] = useState<UserRow | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>('merchant');
  const [merchantId, setMerchantId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => filter === 'all' ? users : users.filter((u) => u.role === filter),
    [users, filter],
  );

  const submit = async () => {
    if (!promoting) return;
    setBusy(true);
    const res = await fetch('/api/admin/users/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: promoting.id,
        role: targetRole,
        merchant_id: targetRole === 'merchant' ? merchantId : null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setPromoting(null);
      window.location.reload();
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 text-sm">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-full ${filter === 'all' ? 'bg-cv-earth text-cv-white' : 'bg-cv-white'}`}>Todos</button>
        {ROLES.map((r) => (
          <button key={r.value} onClick={() => setFilter(r.value)} className={`px-3 py-1.5 rounded-full ${filter === r.value ? 'bg-cv-earth text-cv-white' : 'bg-cv-white'}`}>{r.label}</button>
        ))}
      </div>

      <div className="bg-cv-white rounded-2xl border border-cv-earth/5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cv-sand text-cv-earth/70 text-left">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-cv-earth/5">
                <td className="px-4 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3 text-cv-earth/70">{u.email ?? '—'}</td>
                <td className="px-4 py-3"><Badge tone="earth">{u.role}</Badge></td>
                <td className="px-4 py-3 text-xs text-cv-earth/60">
                  {formatDate(u.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="text-cv-green text-xs hover:underline"
                    onClick={() => { setPromoting(u); setTargetRole('merchant'); setMerchantId(''); }}
                  >
                    Promover
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-cv-earth/60">Nenhum usuário.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {promoting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cv-earth/40 p-4" onClick={() => setPromoting(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-cv-white rounded-3xl p-6">
            <h3 className="font-display text-xl">Promover {promoting.full_name}</h3>
            <label className="block mt-4 text-sm">
              Novo papel
              <select value={targetRole} onChange={(e) => setTargetRole(e.target.value as UserRole)} className="mt-1 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            {targetRole === 'merchant' && (
              <label className="block mt-3 text-sm">
                Vincular a lojista
                <select value={merchantId} onChange={(e) => setMerchantId(e.target.value)} className="mt-1 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand">
                  <option value="">— selecione —</option>
                  {merchants.map((m) => <option key={m.id} value={m.id}>{m.business_name}</option>)}
                </select>
              </label>
            )}
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={() => setPromoting(null)} className="flex-1">Cancelar</Button>
              <Button onClick={submit} disabled={busy || (targetRole === 'merchant' && !merchantId)} className="flex-1">
                {busy ? 'Aplicando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
