'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { digitsOnly, formatPhoneBR, isValidPhoneBR } from '@/lib/phone';

interface Props {
  userId: string;
  hasPhone: boolean;
}

const DISMISS_KEY = 'cv_whatsapp_dismissed';

export function WhatsappBanner({ userId, hasPhone }: Props) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (hasPhone) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    } catch {}
    setShow(true);
  }, [hasPhone]);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch {}
    setShow(false);
  };

  const save = async () => {
    setErr(null);
    if (!isValidPhoneBR(phone)) {
      setErr('Informe um WhatsApp válido com DDD.');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ phone: digitsOnly(phone), whatsapp_optin: true })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    try { localStorage.removeItem(DISMISS_KEY); } catch {}
    setTimeout(() => {
      setShow(false);
      router.refresh();
    }, 1200);
  };

  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ background: 'rgba(232, 160, 32, 0.12)', borderColor: 'rgba(232, 160, 32, 0.35)' }}
    >
      <div className="flex items-start gap-3">
        <div style={{ fontSize: 24, lineHeight: 1 }}>📱</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-cv-earth" style={{ fontSize: 15, fontWeight: 700 }}>
            Adicione seu WhatsApp
          </div>
          <p className="mt-0.5 text-xs text-cv-earth/75">
            Receba atualizações dos projetos que você apoia diretamente no WhatsApp.
          </p>

          {done ? (
            <div className="mt-3 text-sm text-cv-green font-medium">WhatsApp salvo! ✓</div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="rounded-full border border-cv-earth/15 px-3 py-2 bg-cv-white focus:outline-none focus:border-cv-green text-sm flex-1 min-w-[180px]"
                />
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-full bg-cv-green text-cv-white px-4 py-2 text-sm font-medium hover:bg-cv-green/90 disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-xs text-cv-earth/60 hover:text-cv-earth px-2 py-1"
                >
                  Agora não
                </button>
              </div>
              {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
