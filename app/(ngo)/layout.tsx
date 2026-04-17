import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { CidadeSocialFooter } from '@/components/ui/CidadeSocialFooter';

export default async function NgoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { count: pendingCount } = await service
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'suspicious']);

  return (
    <div className="min-h-screen bg-cv-sand">
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-5 flex items-center justify-between gap-4">
        <Link href="/ong" aria-label="Cidade Viva — ONG" className="inline-flex items-center gap-2">
          <img src="/logo.svg" alt="Cidade Viva" style={{ height: 42, width: 'auto', display: 'block', maxWidth: '60vw' }} />
          <span className="hidden sm:inline-block font-display text-cv-earth/55 text-sm">· ONG</span>
        </Link>
        <nav className="flex gap-5 items-center text-sm">
          <Link href="/ong" className="text-cv-earth/70 hover:text-cv-earth">Painel</Link>
          <Link href="/ong/projects" className="text-cv-earth/70 hover:text-cv-earth">Projetos</Link>
          <Link href="/ong/reviews" className="text-cv-earth/70 hover:text-cv-earth inline-flex items-center">
            Revisão
            {pendingCount ? (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-200 text-amber-900 px-2 py-0.5 text-[10px] font-semibold">
                {pendingCount}
              </span>
            ) : null}
          </Link>
          <Link href="/ong/comunicacao" className="text-cv-earth/70 hover:text-cv-earth">Comunicação</Link>
          <Link href="/ong/merchants-onboarding" className="text-cv-earth/70 hover:text-cv-earth">Onboarding</Link>
          <LogoutButton />
        </nav>
      </div>
      <main className="max-w-6xl mx-auto px-6 pb-4 pt-4">{children}</main>
      <CidadeSocialFooter />
    </div>
  );
}
