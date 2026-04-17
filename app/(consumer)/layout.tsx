import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/consumer/BottomNav';
import { ConsumerHeader } from '@/components/consumer/ConsumerHeader';
import { CollectibleToast } from '@/components/consumer/CollectibleToast';
import { AchievementToast } from '@/components/consumer/AchievementToast';
import { CidadeSocialFooter } from '@/components/ui/CidadeSocialFooter';

export default async function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-cv-sand">
      <main
        className="max-w-xl mx-auto px-4"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        <ConsumerHeader />
        {children}
        <CidadeSocialFooter />
      </main>
      <BottomNav />
      <CollectibleToast />
      <AchievementToast />
    </div>
  );
}
