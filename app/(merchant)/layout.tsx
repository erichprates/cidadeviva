import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { CidadeSocialFooter } from '@/components/ui/CidadeSocialFooter';

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-cv-sand">
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-5 flex items-center justify-between gap-4 no-print">
        <Link href="/lojista" aria-label="Cidade Viva — Lojistas" className="inline-flex items-center gap-2">
          <img src="/logo.svg" alt="Cidade Viva" style={{ height: 42, width: 'auto', display: 'block', maxWidth: '60vw' }} />
          <span className="hidden sm:inline-block font-display text-cv-earth/55 text-sm">· Lojistas</span>
        </Link>
        <nav className="flex gap-4 items-center text-sm">
          <Link href="/lojista" className="text-cv-earth/70 hover:text-cv-earth">Painel</Link>
          <Link href="/extrato" className="text-cv-earth/70 hover:text-cv-earth">Extrato</Link>
          <Link href="/invoice" className="text-cv-earth/70 hover:text-cv-earth">Fatura</Link>
          <LogoutButton />
        </nav>
      </div>
      <main className="max-w-5xl mx-auto px-6 pb-4 pt-4">{children}</main>
      <CidadeSocialFooter className="no-print" />
    </div>
  );
}
