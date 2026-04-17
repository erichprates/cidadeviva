'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    let destination = '/dashboard';
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profile?.role === 'merchant') destination = '/lojista';
      else if (profile?.role === 'ngo_admin') destination = '/ong';
      else if (profile?.role === 'platform_admin') destination = '/admin';
    }

    setLoading(false);
    router.push(destination);
  };

  return (
    <main className="min-h-screen grid place-items-center px-6 bg-cv-sand">
      <form onSubmit={submit} className="w-full max-w-md bg-cv-white rounded-3xl p-8 border border-cv-earth/5">
        <h1 className="font-display text-3xl">Entrar na Cidade Viva</h1>
        <p className="mt-1 text-cv-earth/70 text-sm">Que bom ver você de novo por aqui.</p>

        <label className="block mt-6 text-sm">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-sand focus:outline-none focus:border-cv-green"
        />

        <label className="block mt-4 text-sm">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 w-full rounded-full border border-cv-earth/15 px-4 py-2 bg-cv-sand focus:outline-none focus:border-cv-green"
        />

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        <Button type="submit" className="mt-6 w-full" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        <div className="mt-4 text-sm text-center text-cv-earth/70">
          Ainda não tem conta? <Link href="/register" className="text-cv-green font-medium">Criar uma</Link>
        </div>
      </form>
    </main>
  );
}
