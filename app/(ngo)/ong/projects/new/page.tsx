import Link from 'next/link';
import { ProjectFormFull } from '@/components/ngo/ProjectFormFull';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  return (
    <div className="space-y-5">
      <Link href="/ong/projects" className="inline-flex items-center text-sm text-cv-earth/70 hover:text-cv-earth">
        ← Voltar para projetos
      </Link>
      <div>
        <h1 className="font-display text-3xl">Novo projeto</h1>
        <p className="text-sm text-cv-earth/65 mt-1">Conte sobre o projeto. Ele fica disponível para apoio assim que você publicar.</p>
      </div>
      <ProjectFormFull mode="create" />
    </div>
  );
}
