import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { UpdatesManager } from '@/components/ngo/UpdatesManager';
import type { Project, ProjectUpdate } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function ProjectUpdatesPage({ params }: { params: { id: string } }) {
  // Service client: a policy projects_public_read filtra por status='active' e
  // esconderia projetos pausados do próprio NGO admin. A middleware já garante
  // que só ngo_admin/platform_admin chegam nessa rota.
  const service = createServiceClient();
  const { data: project } = await service.from('projects').select('id, title').eq('id', params.id).maybeSingle();
  if (!project) notFound();
  const p = project as Pick<Project, 'id' | 'title'>;

  const { data: updates } = await service
    .from('project_updates')
    .select('*')
    .eq('project_id', p.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-5">
      <Link href="/ong/projects" className="inline-flex items-center text-sm text-cv-earth/70 hover:text-cv-earth">
        ← Voltar para projetos
      </Link>
      <div>
        <div className="text-xs text-cv-earth/55 uppercase tracking-wide">Atualizações</div>
        <h1 className="font-display text-3xl mt-1">{p.title}</h1>
      </div>

      <UpdatesManager projectId={p.id} updates={(updates as ProjectUpdate[] | null) ?? []} />
    </div>
  );
}
