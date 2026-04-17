import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { ProjectFormFull } from '@/components/ngo/ProjectFormFull';
import type { Project } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const service = createServiceClient();
  const { data: project } = await service.from('projects').select('*').eq('id', params.id).maybeSingle();
  if (!project) notFound();

  return (
    <div className="space-y-5">
      <Link href="/ong/projects" className="inline-flex items-center text-sm text-cv-earth/70 hover:text-cv-earth">
        ← Voltar para projetos
      </Link>
      <div>
        <h1 className="font-display text-3xl">Editar projeto</h1>
        <p className="text-sm text-cv-earth/65 mt-1">Ajuste informações, capa e status.</p>
      </div>
      <ProjectFormFull mode="edit" project={project as Project} />
    </div>
  );
}
