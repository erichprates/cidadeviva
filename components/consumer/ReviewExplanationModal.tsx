'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type Status = 'pending' | 'suspicious' | 'rejected';

interface Props {
  open: boolean;
  status: Status;
  rejectionReason?: string | null;
  onClose: () => void;
}

const REJECT_FRIENDLY: Record<string, string> = {
  pix_not_accepted: 'Comprovantes de PIX bancário não são aceitos. Use o cupom da maquininha ou a nota fiscal do estabelecimento.',
  duplicate_hash: 'Este comprovante já foi registrado anteriormente.',
  duplicate_fingerprint: 'Uma compra com os mesmos dados já foi registrada.',
  ilegivel: 'O comprovante estava ilegível. Tente fotografar com melhor iluminação.',
};

function friendlyReject(reason: string | null | undefined): string {
  if (!reason) return 'Comprovante inválido para o programa.';
  const key = reason.toLowerCase();
  for (const [k, msg] of Object.entries(REJECT_FRIENDLY)) {
    if (key.includes(k)) return msg;
  }
  return reason;
}

export function ReviewExplanationModal({ open, status, rejectionReason, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (() => {
    if (status === 'pending') {
      return {
        emoji: '🔍',
        title: 'Comprovante em análise',
        body: (
          <>
            <p>
              Seu comprovante foi recebido mas o estabelecimento ainda não é parceiro da rede Cidade Viva.
            </p>
            <p className="mt-3">Nossa equipe vai analisar e, se válido, vai:</p>
            <ol className="mt-2 list-decimal list-inside space-y-1 text-cv-earth/85">
              <li>Cadastrar o estabelecimento como parceiro</li>
              <li>Aprovar seu comprovante</li>
              <li>Creditar seus Seeds automaticamente</li>
            </ol>
            <p className="mt-3 text-cv-earth/70">Isso pode levar até 48 horas úteis.</p>
            <div
              className="mt-4 rounded-xl p-3 text-sm"
              style={{ background: 'rgba(27, 122, 74, 0.12)', color: '#1B7A4A' }}
            >
              💡 <strong>Boa notícia:</strong> se seu comprovante for aprovado, o estabelecimento entra para a rede e você ajuda outros consumidores também!
            </div>
          </>
        ),
        cta: (
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-5 py-3 text-sm font-semibold active:scale-[0.98]"
          >
            Entendi, obrigado!
          </button>
        ),
      };
    }

    if (status === 'suspicious') {
      return {
        emoji: '🕵️',
        title: 'Comprovante em verificação',
        body: (
          <>
            <p>
              Nosso sistema identificou algo incomum neste comprovante e ele está passando por uma verificação extra de autenticidade.
            </p>
            <p className="mt-3">Isso acontece quando:</p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-cv-earth/85">
              <li>A imagem está muito escura ou borrada</li>
              <li>O comprovante parece ser uma captura de tela</li>
              <li>Dados inconsistentes foram detectados</li>
            </ul>
            <p className="mt-3 text-cv-earth/70">
              Se o comprovante for autêntico, será aprovado em até 48 horas úteis.
            </p>
            <div
              className="mt-4 rounded-xl p-3 text-sm"
              style={{ background: 'rgba(232, 160, 32, 0.15)', color: '#8a5a00' }}
            >
              ⚠️ <strong>Para evitar isso no futuro:</strong> fotografe o comprovante físico diretamente, com boa iluminação.
            </div>
          </>
        ),
        cta: (
          <button
            type="button"
            onClick={onClose}
            className="w-full inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-5 py-3 text-sm font-semibold active:scale-[0.98]"
          >
            Entendi
          </button>
        ),
      };
    }

    // rejected
    return {
      emoji: '❌',
      title: 'Comprovante não aprovado',
      body: (
        <>
          <p>{friendlyReject(rejectionReason)}</p>
        </>
      ),
      cta: (
        <Link
          href="/scan"
          onClick={onClose}
          className="w-full inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-5 py-3 text-sm font-semibold active:scale-[0.98]"
        >
          Escanear outro →
        </Link>
      ),
    };
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(61, 43, 31, 0.55)' }}
      onClick={onClose}
    >
      <style>{`
        @keyframes cv-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes cv-modal-in { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cv-sheet { animation: cv-sheet-up 300ms cubic-bezier(0.22, 1, 0.36, 1); }
        @media (min-width: 640px) {
          .cv-sheet { animation: cv-modal-in 260ms cubic-bezier(0.22, 1, 0.36, 1); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="cv-sheet w-full sm:max-w-md bg-cv-white p-6 sm:p-7"
        style={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderBottomLeftRadius: typeof window !== 'undefined' && window.innerWidth >= 640 ? 24 : 0,
          borderBottomRightRadius: typeof window !== 'undefined' && window.innerWidth >= 640 ? 24 : 0,
          maxHeight: '88dvh',
          overflowY: 'auto',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex justify-end sm:hidden">
          <div style={{ width: 40, height: 4, background: 'rgba(61,43,31,0.2)', borderRadius: 999, margin: '0 auto 12px' }} />
        </div>
        <div className="text-center">
          <div style={{ fontSize: 48, lineHeight: 1 }}>{content.emoji}</div>
          <h3 className="font-display text-cv-earth mt-3" style={{ fontSize: 22, fontWeight: 700 }}>
            {content.title}
          </h3>
        </div>
        <div className="mt-5 text-sm text-cv-earth/85" style={{ lineHeight: 1.55 }}>
          {content.body}
        </div>
        <div className="mt-6">{content.cta}</div>
      </div>
    </div>
  );
}
