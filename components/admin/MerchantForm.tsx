'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import type { Merchant } from '@/lib/supabase/types';

const TYPES = ['padaria', 'mercado', 'farmácia', 'salão', 'restaurante', 'loja de roupas', 'petshop', 'oficina', 'outro'];

interface Props {
  merchant?: Merchant | null;
  initialDocument?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function MerchantForm({ merchant, initialDocument, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    business_name: merchant?.business_name ?? '',
    document: merchant?.document ?? initialDocument ?? '',
    business_type: merchant?.business_type ?? 'padaria',
    neighborhood: merchant?.neighborhood ?? '',
    city: merchant?.city ?? 'São José dos Campos',
    cashback_rate: String(merchant?.cashback_rate ?? 3),
    status: merchant?.status ?? 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/merchants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: merchant?.id,
        ...form,
        cashback_rate: Number(form.cashback_rate),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Falha ao salvar.');
      return;
    }
    onSaved();
  };

  const inp = 'mt-1 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand focus:outline-none focus:border-cv-green text-sm';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cv-earth/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-cv-white rounded-3xl p-6 border border-cv-earth/10 max-h-[90vh] overflow-auto">
        <h3 className="font-display text-2xl">{merchant ? 'Editar lojista' : 'Novo lojista'}</h3>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <label className="md:col-span-2">
            <span className="text-cv-earth/70">Nome do estabelecimento *</span>
            <input className={inp} value={form.business_name} onChange={set('business_name')} />
          </label>
          <label>
            <span className="text-cv-earth/70">Documento (CNPJ ou CPF)</span>
            <input className={inp} value={form.document} onChange={set('document')} placeholder="opcional" />
          </label>
          <label>
            <span className="text-cv-earth/70">Tipo *</span>
            <select className={inp} value={form.business_type} onChange={set('business_type')}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            <span className="text-cv-earth/70">Bairro *</span>
            <input className={inp} value={form.neighborhood} onChange={set('neighborhood')} />
          </label>
          <label>
            <span className="text-cv-earth/70">Cidade *</span>
            <input className={inp} value={form.city} onChange={set('city')} />
          </label>
          <label>
            <span className="text-cv-earth/70">Taxa (%)</span>
            <input type="number" step="0.5" min="1" max="10" className={inp} value={form.cashback_rate} onChange={set('cashback_rate')} />
          </label>
          <label>
            <span className="text-cv-earth/70">Status</span>
            <select className={inp} value={form.status} onChange={set('status')}>
              <option value="active">ativo</option>
              <option value="pending">pendente</option>
              <option value="suspended">suspenso</option>
            </select>
          </label>
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
