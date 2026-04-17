import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { LogoutButton } from '@/components/ui/LogoutButton';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Comunidade';
  const initial = (profile?.full_name ?? user.email ?? '?').charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pt-2">
      <Card className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-cv-lime/30 grid place-items-center text-cv-green font-display text-2xl">
          {initial}
        </div>
        <div>
          <div className="font-display text-xl text-cv-earth">{profile?.full_name ?? firstName}</div>
          <div className="text-sm text-cv-earth/60">{user.email}</div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Sair da conta</div>
            <div className="text-xs text-cv-earth/60">Encerrar a sessão neste aparelho</div>
          </div>
          <LogoutButton className="rounded-full border border-cv-earth/15 px-4 py-2" />
        </div>
      </Card>
    </div>
  );
}
