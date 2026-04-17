import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { CidadeSocialFooter } from '@/components/ui/CidadeSocialFooter';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-cv-sand">
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-5 flex items-center justify-between gap-4">
        <Link href="/admin/dashboard" aria-label="Cidade Viva — Admin" className="inline-flex items-center gap-2">
          <img src="/logo.svg" alt="Cidade Viva" style={{ height: 42, width: 'auto', display: 'block', maxWidth: '60vw' }} />
          <span className="hidden sm:inline-block font-display text-cv-earth/55 text-sm">· Admin</span>
        </Link>
        <nav className="flex gap-5 items-center text-sm">
          <Link href="/admin/dashboard" className="text-cv-earth/70 hover:text-cv-earth">Painel</Link>
          <Link href="/admin/merchants" className="text-cv-earth/70 hover:text-cv-earth">Lojistas</Link>
          <Link href="/admin/users" className="text-cv-earth/70 hover:text-cv-earth">Usuários</Link>
          <LogoutButton />
        </nav>
      </div>
      <main className="max-w-6xl mx-auto px-6 pb-4 pt-4">{children}</main>
      <CidadeSocialFooter />
    </div>
  );
}
