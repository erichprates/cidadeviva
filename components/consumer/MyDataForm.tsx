'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '../ui/Button';
import { digitsOnly, formatPhoneBR, isValidPhoneBR } from '@/lib/phone';
import { colorForName, initials } from '@/lib/avatars';

interface Props {
  userId: string;
  initialFullName: string;
  initialAvatarUrl: string | null;
  initialPhone: string | null;
  initialOptin: boolean;
}

const MAX_AVATAR_MB = 5;
const ACCEPT = 'image/jpeg,image/png,image/webp';

export function MyDataForm({
  userId,
  initialFullName,
  initialAvatarUrl,
  initialPhone,
  initialOptin,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone ? formatPhoneBR(initialPhone) : '');
  const [optin, setOptin] = useState(initialOptin);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const onPickFile = async (file: File | null) => {
    setErr(null);
    setMsg(null);
    if (!file) return;
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setErr(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo ${MAX_AVATAR_MB} MB.`);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErr('Formato não aceito. Use JPG, PNG ou WEBP.');
      return;
    }

    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/me/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? 'Falha ao enviar foto.');
        setLocalPreview(null);
        return;
      }
      setAvatarUrl(data.url);
      setLocalPreview(null);
      setMsg('Foto atualizada ✓');
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setErr(null);
    setMsg(null);
    if (!confirm('Remover sua foto de perfil?')) return;
    setUploading(true);
    try {
      const res = await fetch('/api/me/avatar', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErr(data?.error ?? 'Falha ao remover foto.');
        return;
      }
      setAvatarUrl(null);
      setLocalPreview(null);
      setMsg('Foto removida.');
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    setErr(null);
    setMsg(null);

    const name = fullName.trim();
    if (!name) return setErr('O nome não pode ficar vazio.');

    const phoneDigits = digitsOnly(phone);
    if (phoneDigits && !isValidPhoneBR(phoneDigits)) {
      return setErr('WhatsApp inválido. Use o formato (11) 99999-9999.');
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        phone: phoneDigits || null,
        whatsapp_optin: optin,
      })
      .eq('id', userId);
    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }
    setMsg('Dados salvos ✓');
    router.refresh();
    setTimeout(() => setMsg(null), 2000);
  };

  const displayName = fullName.trim() || 'Você';
  const previewSrc = localPreview ?? avatarUrl;
  const color = colorForName(displayName);

  return (
    <div className="bg-cv-white rounded-2xl border border-cv-earth/5 p-5 space-y-5">
      {/* AVATAR */}
      <div className="flex items-center gap-4">
        <div
          className="relative shrink-0 rounded-full overflow-hidden"
          style={{ width: 80, height: 80 }}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Foto de perfil"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              className="w-full h-full grid place-items-center font-display"
              style={{ background: color.bg, color: color.fg, fontSize: 28, fontWeight: 700 }}
            >
              {initials(displayName)}
            </div>
          )}
          {uploading && (
            <div
              className="absolute inset-0 grid place-items-center"
              style={{ background: 'rgba(61,43,31,0.45)' }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: '3px solid rgba(254,252,248,0.35)',
                  borderTopColor: '#FEFCF8',
                  animation: 'spin 800ms linear infinite',
                }}
              />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-cv-earth/70 font-medium">Foto de perfil</div>
          <div className="text-xs text-cv-earth/55 mt-0.5">
            JPG, PNG ou WEBP · máx {MAX_AVATAR_MB} MB
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center rounded-full border border-cv-earth/15 px-4 py-2 text-sm hover:bg-cv-sand disabled:opacity-50"
            >
              {avatarUrl ? 'Trocar foto' : 'Escolher foto'}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={removeAvatar}
                disabled={uploading}
                className="text-sm text-red-600 hover:underline disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NOME */}
      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">Nome</span>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Como quer aparecer pra comunidade"
          className="mt-1 w-full rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-sand focus:outline-none focus:border-cv-green"
        />
      </label>

      {/* WHATSAPP */}
      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">WhatsApp</span>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
          placeholder="(11) 99999-9999"
          className="mt-1 w-full rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-sand focus:outline-none focus:border-cv-green"
        />
      </label>

      {/* OPT-IN */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <span
          role="switch"
          aria-checked={optin}
          className="relative inline-flex shrink-0 mt-0.5"
          style={{
            width: 40,
            height: 24,
            background: optin ? '#1B7A4A' : 'rgba(61,43,31,0.25)',
            borderRadius: 999,
            transition: 'background 200ms',
          }}
        >
          <input
            type="checkbox"
            checked={optin}
            onChange={(e) => setOptin(e.target.checked)}
            className="sr-only"
          />
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: optin ? 18 : 2,
              width: 20,
              height: 20,
              background: '#FEFCF8',
              borderRadius: '50%',
              transition: 'left 200ms',
            }}
          />
        </span>
        <span className="text-sm">
          <span className="text-cv-earth font-medium">Receber notificações pelo WhatsApp</span>
          <span className="block text-xs text-cv-earth/60 mt-0.5">
            Atualizações dos projetos que você apoia, conquistas e desafios.
          </span>
        </span>
      </label>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {msg && <div className="text-sm text-cv-green">{msg}</div>}

      <Button onClick={saveProfile} disabled={saving || uploading}>
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </div>
  );
}
