'use client';

import { useState } from 'react';
import { formatBRL } from '@/lib/format';

interface Props {
  amount: number;
  pixKey: string;
  recipient: string;
}

export function PixPaymentBlock({ amount, pixKey, recipient }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-2xl bg-cv-sand p-4 border border-cv-earth/10">
      <div className="text-xs text-cv-earth/60 uppercase tracking-wide">Pagamento via PIX</div>
      <div className="mt-2 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-cv-earth/70">Chave PIX</span>
          <span className="font-mono text-cv-earth truncate">{pixKey}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-cv-earth/70">Nome</span>
          <span className="text-cv-earth">{recipient}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-cv-earth/70">Valor</span>
          <span className="font-display font-bold text-cv-gold" style={{ fontSize: 18 }}>
            {formatBRL(amount)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="mt-3 w-full inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-4 py-2.5 text-sm font-semibold active:scale-95 transition"
      >
        {copied ? 'Chave PIX copiada! ✓' : 'Copiar chave PIX'}
      </button>
    </div>
  );
}
