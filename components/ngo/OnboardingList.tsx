'use client';

import { useState } from 'react';
import { MerchantForm } from '../admin/MerchantForm';
import { Button } from '../ui/Button';

interface Row {
  id: string;
  cnpj: string | null;
  merchant_name: string | null;
  count: number;
}

export function OnboardingList({ rows }: { rows: Row[] }) {
  const [picking, setPicking] = useState<Row | null>(null);

  return (
    <div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="bg-cv-white rounded-2xl p-4 border border-cv-earth/5 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.merchant_name ?? 'Sem nome extraído'}</div>
              <div className="text-xs text-cv-earth/60 mt-1">
                CNPJ: {r.cnpj ?? '—'} · {r.count} comprovante{r.count === 1 ? '' : 's'} rejeitado{r.count === 1 ? '' : 's'}
              </div>
            </div>
            <Button onClick={() => setPicking(r)}>Cadastrar este lojista</Button>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="bg-cv-white rounded-2xl p-8 text-center text-cv-earth/60">
            Nenhuma oportunidade de onboarding no momento.
          </div>
        )}
      </div>

      {picking && (
        <MerchantForm
          initialDocument={picking.cnpj}
          onClose={() => setPicking(null)}
          onSaved={() => { setPicking(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}
