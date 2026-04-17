'use client';

import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatBRL, formatDate, formatSeeds } from '@/lib/format';
import { SeedIcon } from '../ui/SeedIcon';

export interface ReceiptDetail {
  id: string;
  image_signed_url: string | null;
  merchant_name: string;
  consumer_first_name: string;
  status: 'approved' | 'pending' | 'suspicious' | 'rejected';
  extracted_cnpj: string | null;
  extracted_date: string | null;
  extracted_amount: number | null;
  seeds_generated: number | null;
  confidence_score: number | null;
  match_type: 'Exato' | 'Aproximado' | 'Por nome' | 'Sem match';
  created_at: string;
}

const STATUS: Record<ReceiptDetail['status'], { tone: 'green' | 'amber' | 'earth' | 'red'; label: string }> = {
  approved: { tone: 'green', label: 'Aprovado' },
  pending: { tone: 'earth', label: 'Pendente' },
  suspicious: { tone: 'amber', label: 'Em revisão' },
  rejected: { tone: 'red', label: 'Rejeitado' },
};

interface Props {
  receipt: ReceiptDetail | null;
  onClose: () => void;
  onContest?: (r: ReceiptDetail) => void;
}

export function ReceiptDetailModal({ receipt, onClose, onContest }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!receipt) return;
    setImgLoaded(false);
    setImgError(false);
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [receipt, onClose]);

  if (!receipt) return null;
  const s = STATUS[receipt.status];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(61, 43, 31, 0.6)' }}
      onClick={onClose}
    >
      <style>{`
        @keyframes cv-rdm-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes cv-rdm-in { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cv-rdm { animation: cv-rdm-up 300ms cubic-bezier(0.22, 1, 0.36, 1); }
        @media (min-width: 640px) {
          .cv-rdm { animation: cv-rdm-in 260ms cubic-bezier(0.22, 1, 0.36, 1); }
        }
        @keyframes cv-skel { 0%,100%{opacity:.5} 50%{opacity:.9} }
        .cv-skel { animation: cv-skel 1.2s ease-in-out infinite; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="cv-rdm w-full sm:max-w-2xl bg-cv-white"
        style={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          maxHeight: '92dvh',
          overflowY: 'auto',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-cv-earth" style={{ fontSize: 20, fontWeight: 700 }}>
                Comprovante #{receipt.id.slice(0, 8)}
              </h3>
              <div className="mt-1.5">
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="text-cv-earth/50 hover:text-cv-earth -mt-2 -mr-2 p-2"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 grid md:grid-cols-2 gap-5">
            {/* IMAGEM */}
            <div>
              <div
                className="rounded-xl overflow-hidden relative"
                style={{
                  background: '#F5F0E8',
                  maxWidth: 400,
                  aspectRatio: '3/4',
                  width: '100%',
                }}
              >
                {!imgLoaded && !imgError && (
                  <div className="cv-skel absolute inset-0 grid place-items-center text-cv-earth/40 text-xs" style={{ background: 'rgba(61,43,31,0.08)' }}>
                    Carregando...
                  </div>
                )}
                {imgError && (
                  <div className="absolute inset-0 grid place-items-center text-cv-earth/60 text-sm px-4 text-center">
                    Imagem não disponível
                  </div>
                )}
                {receipt.image_signed_url ? (
                  <img
                    src={receipt.image_signed_url}
                    alt="Comprovante"
                    loading="lazy"
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-contain"
                    style={{ background: '#FEFCF8' }}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-cv-earth/60 text-sm">
                    Imagem não disponível
                  </div>
                )}
              </div>
            </div>

            {/* DETALHES */}
            <div className="text-sm">
              <dl className="space-y-3">
                <Row label="Lojista" value={receipt.merchant_name} />
                <Row label="Consumidor" value={receipt.consumer_first_name} />
                <Row label="Data da compra" value={receipt.extracted_date ? formatDate(receipt.extracted_date) : '—'} />
                <Row label="Escaneado em" value={formatDate(receipt.created_at)} />
                <Row label="CNPJ" value={receipt.extracted_cnpj ?? '—'} mono />
                <div className="pt-2">
                  <div className="text-xs text-cv-earth/60">Valor da compra</div>
                  <div className="font-display text-cv-earth mt-1" style={{ fontSize: 24, fontWeight: 700 }}>
                    {formatBRL(Number(receipt.extracted_amount ?? 0))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cv-earth/60">Seeds gerados</div>
                  <div className="text-cv-green font-display mt-0.5 inline-flex items-center gap-1.5" style={{ fontSize: 18, fontWeight: 700 }}>
                    {formatSeeds(Number(receipt.seeds_generated ?? 0))} <SeedIcon size={16} />
                  </div>
                </div>
                <Row
                  label="Confiança Vision"
                  value={`${Math.round(Number(receipt.confidence_score ?? 0) * 100)}%`}
                />
                <Row label="Match" value={receipt.match_type} />
              </dl>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row-reverse gap-2">
            {receipt.status === 'approved' && onContest && (
              <Button
                onClick={() => onContest(receipt)}
                className="flex-1"
                style={{ background: '#C2410C' }}
              >
                Contestar ⚠️
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center rounded-full border border-cv-earth/15 px-5 py-3 text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-cv-earth/60">{label}</dt>
      <dd className={`text-cv-earth ${mono ? 'font-mono text-xs' : ''}`} style={{ textAlign: 'right' }}>
        {value}
      </dd>
    </div>
  );
}
