'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { digitsOnly, formatPhoneBR, isValidPhoneBR } from '@/lib/phone';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappOptin, setWhatsappOptin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidPhoneBR(phone)) {
      setError('Informe um WhatsApp válido com DDD.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const phoneDigits = digitsOnly(phone);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role: 'consumer',
        phone: phoneDigits,
        whatsapp_optin: whatsappOptin,
      });
    }
    setLoading(false);
    router.push('/welcome');
  };

  const inp = 'mt-1 w-full rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-sand focus:outline-none focus:border-cv-green';

  return (
    <main className="min-h-screen grid place-items-center px-6 bg-cv-sand py-10">
      <form onSubmit={submit} className="w-full max-w-md bg-cv-white rounded-3xl p-8 border border-cv-earth/5">
        <h1 className="font-display text-3xl">Entrar para a Cidade Viva</h1>
        <p className="mt-1 text-cv-earth/70 text-sm">Cada compra sua vai virar impacto no bairro.</p>

        <label className="block mt-6 text-sm">Seu nome</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className={inp}
        />

        <label className="block mt-4 text-sm">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inp}
        />

        <label className="block mt-4 text-sm">WhatsApp</label>
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
          placeholder="(11) 99999-9999"
          required
          className={inp}
        />

        <label className="block mt-4 text-sm">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className={inp}
        />

        <label className="mt-5 flex items-start gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={whatsappOptin}
            onChange={(e) => setWhatsappOptin(e.target.checked)}
            className="mt-0.5 accent-cv-green"
          />
          <span className="text-cv-earth/80">
            Aceito receber atualizações pelo WhatsApp sobre meus projetos e da comunidade. Posso desativar a qualquer momento no perfil.
          </span>
        </label>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        <Button type="submit" className="mt-6 w-full" disabled={loading}>
          {loading ? 'Criando...' : 'Criar conta'}
        </Button>

        <div className="mt-4 text-sm text-center text-cv-earth/70">
          Já tem conta? <Link href="/login" className="text-cv-green font-medium">Entrar</Link>
        </div>
      </form>
    </main>
  );
}
