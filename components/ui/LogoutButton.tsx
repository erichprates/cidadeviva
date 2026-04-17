'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={`text-sm text-cv-earth/60 hover:text-cv-earth disabled:opacity-50 ${className}`}
    >
      {loading ? 'Saindo...' : 'Sair'}
    </button>
  );
}
