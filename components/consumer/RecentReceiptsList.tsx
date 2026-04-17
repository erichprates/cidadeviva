'use client';

import { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ReviewExplanationModal } from './ReviewExplanationModal';
import { formatBRL, formatDate, formatSeeds } from '@/lib/format';

export interface ReceiptRow {
  id: string;
  merchant_name: string | null;
  amount: number | null;
  seeds_generated: number | null;
  status: 'approved' | 'pending' | 'suspicious' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  extracted_date: string | null;
}

const BADGE: Record<ReceiptRow['status'], React.ReactNode> = {
  approved: <Badge tone="green">Aprovado</Badge>,
  pending: <Badge tone="earth">Em análise</Badge>,
  suspicious: <Badge tone="amber">Em revisão</Badge>,
  rejected: <Badge tone="red">Rejeitado</Badge>,
};

export function RecentReceiptsList({ items }: { items: ReceiptRow[] }) {
  const [modal, setModal] = useState<{ status: 'pending' | 'suspicious' | 'rejected'; reason: string | null } | null>(null);

  if (items.length === 0) {
    return <Card><div className="text-cv-earth/60 text-sm">Escaneie sua primeira nota.</div></Card>;
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((r) => {
          const needsExplain = r.status !== 'approved';
          return (
            <Card key={r.id} className="flex items-center justify-between gap-3 !p-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.merchant_name ?? 'Lojista não identificado'}</div>
                <div className="text-xs text-cv-earth/60">
                  {r.extracted_date ? formatDate(r.extracted_date) : formatDate(r.created_at)}
                  {' · '}
                  {formatBRL(Number(r.amount ?? 0))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  {BADGE[r.status]}
                  {needsExplain && (
                    <button
                      type="button"
                      onClick={() => setModal({ status: r.status as 'pending' | 'suspicious' | 'rejected', reason: r.rejection_reason })}
                      aria-label="Saber mais sobre este status"
                      className="grid place-items-center rounded-full text-cv-earth/70 hover:text-cv-earth hover:bg-cv-sand transition"
                      style={{ width: 22, height: 22, fontSize: 13 }}
                    >
                      ℹ️
                    </button>
                  )}
                </div>
                {Number(r.seeds_generated ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-cv-green font-medium">
                    +{formatSeeds(Number(r.seeds_generated))}
                    <img
                      src="/assets/moeda.png"
                      alt=""
                      aria-hidden
                      style={{ width: 16, height: 16, objectFit: 'contain' }}
                    />
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ReviewExplanationModal
        open={!!modal}
        status={modal?.status ?? 'pending'}
        rejectionReason={modal?.reason ?? null}
        onClose={() => setModal(null)}
      />
    </>
  );
}
