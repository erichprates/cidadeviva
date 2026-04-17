import { createServiceClient } from '@/lib/supabase/server';
import { UsersTable } from '@/components/admin/UsersTable';
import type { Merchant } from '@/lib/supabase/types';

export default async function AdminUsersPage() {
  const service = createServiceClient();
  const { data: profiles } = await service.from('profiles').select('*').order('created_at', { ascending: false });
  const { data: merchants } = await service.from('merchants').select('*').order('business_name');

  // Junta email via auth.admin
  const { data: authUsers } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailMap = new Map(authUsers?.users?.map((u) => [u.id, u.email ?? null]) ?? []);

  const users = (profiles ?? []).map((p) => ({ ...p, email: emailMap.get(p.id) ?? null }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Usuários</h1>
        <p className="text-cv-earth/70 text-sm">Gerencie papéis e vínculos.</p>
      </div>
      <UsersTable users={users} merchants={(merchants as Merchant[]) ?? []} />
    </div>
  );
}
