import type { Project } from '@/lib/supabase/types';
import { formatBRL } from '@/lib/format';

export function ProjectProgress({ project }: { project: Project }) {
  const pct = Math.min(100, Math.round((project.current_amount / project.goal_amount) * 100));
  return (
    <div className="bg-cv-white rounded-2xl border border-cv-earth/5 p-5">
      <div className="flex justify-between items-start">
        <h4 className="font-display text-lg">{project.title}</h4>
        <span className="text-sm font-medium text-cv-green">{pct}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-cv-sand overflow-hidden">
        <div className="h-full bg-cv-lime" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-cv-earth/60">
        <span>{formatBRL(Number(project.current_amount))}</span>
        <span>meta {formatBRL(Number(project.goal_amount))}</span>
      </div>
      <div className="mt-3 text-xs text-cv-earth/60">
        {project.beneficiaries_count} beneficiados
      </div>
    </div>
  );
}
