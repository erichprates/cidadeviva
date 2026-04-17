'use client';

import { useEffect, useState } from 'react';
import { formatPhoneBR } from '@/lib/phone';

export function PartnerLeadForm() {
  const [open, setOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const reset = () => {
    setBusinessName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setMessage('');
    setErr(null);
    setDone(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!businessName.trim()) return setErr('Informe o nome do seu estabelecimento.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('E-mail inválido.');

    setSending(true);
    const res = await fetch('/api/partners/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: businessName,
        contact_name: contactName,
        email,
        phone,
        message,
      }),
    });
    const data = await res.json().catch(() => null);
    setSending(false);
    if (!res.ok) {
      setErr(data?.error ?? 'Falha ao enviar.');
      return;
    }
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 1800);
  };

  const inp = 'mt-1 w-full rounded-xl border border-cv-earth/15 px-3 py-2.5 bg-cv-sand focus:outline-none focus:border-cv-green text-sm';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-full bg-cv-lime text-cv-earth px-5 py-3 text-sm font-bold hover:bg-cv-lime/90 active:scale-95 transition"
      >
        Quero ser parceiro →
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(61, 43, 31, 0.6)' }}
          onClick={() => setOpen(false)}
        >
          <style>{`
            @keyframes cv-plf-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes cv-plf-in { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .cv-plf { animation: cv-plf-up 300ms cubic-bezier(0.22, 1, 0.36, 1); }
            @media (min-width: 640px) {
              .cv-plf { animation: cv-plf-in 260ms cubic-bezier(0.22, 1, 0.36, 1); }
            }
          `}</style>

          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="cv-plf w-full sm:max-w-lg bg-cv-white p-6 sm:p-8"
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-cv-earth" style={{ fontSize: 22, fontWeight: 700 }}>
                  Seja parceiro da Cidade Viva 🏪
                </h3>
                <p className="mt-1 text-sm text-cv-earth/70">
                  Preencha o formulário que a gente entra em contato em até 2 dias úteis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-cv-earth/50 hover:text-cv-earth -mt-2 -mr-2 p-2"
              >
                ✕
              </button>
            </div>

            {done ? (
              <div className="mt-6 text-center py-8">
                <div style={{ fontSize: 48, lineHeight: 1 }}>✅</div>
                <div className="mt-3 font-display text-cv-earth" style={{ fontSize: 18, fontWeight: 700 }}>
                  Recebemos seu contato!
                </div>
                <p className="mt-1 text-sm text-cv-earth/70">Respondemos em até 2 dias úteis.</p>
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3">
                  <label className="block text-sm">
                    <span className="text-cv-earth/70 font-medium">Nome do estabelecimento *</span>
                    <input
                      className={inp}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Ex: Padaria do Zé"
                      required
                    />
                  </label>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="text-cv-earth/70 font-medium">Seu nome</span>
                      <input
                        className={inp}
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Como te chamar"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-cv-earth/70 font-medium">Telefone</span>
                      <input
                        className={inp}
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                        placeholder="(11) 99999-9999"
                      />
                    </label>
                  </div>

                  <label className="block text-sm">
                    <span className="text-cv-earth/70 font-medium">E-mail *</span>
                    <input
                      className={inp}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="text-cv-earth/70 font-medium">Conte um pouco sobre a loja</span>
                    <textarea
                      className={inp}
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tipo de negócio, bairro, volume médio de clientes..."
                    />
                  </label>
                </div>

                {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

                <div className="mt-6 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 inline-flex items-center justify-center rounded-full border border-cv-earth/15 px-5 py-3 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex-1 inline-flex items-center justify-center rounded-full bg-cv-green text-cv-white px-5 py-3 text-sm font-semibold disabled:opacity-60"
                  >
                    {sending ? 'Enviando...' : 'Enviar solicitação'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
