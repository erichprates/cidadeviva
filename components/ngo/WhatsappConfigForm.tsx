'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '../ui/Button';

interface Props {
  initial: {
    instance_name: string | null;
    api_url: string | null;
    api_key: string | null;
    phone_number: string | null;
  } | null;
}

export function WhatsappConfigForm({ initial }: Props) {
  const router = useRouter();
  const [instanceName, setInstanceName] = useState(initial?.instance_name ?? '');
  const [apiUrl, setApiUrl] = useState(initial?.api_url ?? '');
  const [apiKey, setApiKey] = useState(initial?.api_key ?? '');
  const [phoneNumber, setPhoneNumber] = useState(initial?.phone_number ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    setErr(null);
    setSaving(true);
    const res = await fetch('/api/ong/comunicacao/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instance_name: instanceName,
        api_url: apiUrl,
        api_key: apiKey,
        phone_number: phoneNumber,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(data?.error ?? 'Falha ao salvar.');
      return;
    }
    setMsg('Configuração salva ✓ A integração com a Evolution API ainda não está ativa.');
    router.refresh();
  };

  const inp = 'mt-1 w-full rounded-xl border border-cv-earth/15 px-3 py-2 bg-cv-sand focus:outline-none focus:border-cv-green text-sm';

  return (
    <div className="max-w-xl space-y-4">
      <div
        className="rounded-2xl p-3 text-xs"
        style={{ background: 'rgba(232,160,32,0.12)', color: '#a06a00' }}
      >
        Esta tela só guarda os dados — a conexão com a Evolution API ainda não está implementada.
      </div>

      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">Nome da instância</span>
        <input className={inp} value={instanceName} onChange={(e) => setInstanceName(e.target.value)} placeholder="ex: cidade-viva-prod" />
      </label>

      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">URL da API</span>
        <input className={inp} value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://evolution.suaempresa.com" />
      </label>

      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">API Key</span>
        <input
          type="password"
          className={inp}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="••••••••"
        />
      </label>

      <label className="block text-sm">
        <span className="text-cv-earth/70 font-medium">Número do WhatsApp</span>
        <input className={inp} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+55 12 99999-9999" />
      </label>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {msg && <div className="text-sm text-cv-green">{msg}</div>}

      <Button onClick={submit} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar configuração'}
      </Button>
    </div>
  );
}
