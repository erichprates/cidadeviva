import { reaisFromSeeds } from '@/lib/credits/calculator';

export interface ProjectFormPayload {
  title?: unknown;
  description?: unknown;
  story?: unknown;
  category?: unknown;
  neighborhood?: unknown;
  goal_seeds?: unknown;
  beneficiaries_count?: unknown;
  impact_unit?: unknown;
  impact_per_seed?: unknown;
  created_by_name?: unknown;
  cover_image_url?: unknown;
  status?: unknown;
}

export interface NormalizedProject {
  title: string;
  description: string;
  story: string | null;
  category: string;
  neighborhood: string | null;
  goal_seeds: number;
  goal_amount: number;
  beneficiaries_count: number;
  impact_unit: string | null;
  impact_per_seed: number | null;
  created_by_name: string | null;
  cover_image_url: string | null;
  status: 'active' | 'paused';
}

const ALLOWED_CATEGORIES = new Set(['saude', 'educacao', 'alimentacao', 'cultura', 'meio_ambiente']);
const MAX_DESCRIPTION = 200;

export interface ValidationError {
  field: string;
  message: string;
}

export function validateProjectPayload(body: ProjectFormPayload): { ok: true; data: NormalizedProject } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) errors.push({ field: 'title', message: 'Título é obrigatório.' });

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!description) errors.push({ field: 'description', message: 'Descrição é obrigatória.' });
  if (description.length > MAX_DESCRIPTION) errors.push({ field: 'description', message: `Descrição não pode passar de ${MAX_DESCRIPTION} caracteres.` });

  const story = typeof body.story === 'string' && body.story.trim() ? body.story.trim() : null;

  const categoryRaw = typeof body.category === 'string' ? body.category : '';
  if (!ALLOWED_CATEGORIES.has(categoryRaw)) errors.push({ field: 'category', message: 'Categoria inválida.' });

  const neighborhood = typeof body.neighborhood === 'string' && body.neighborhood.trim() ? body.neighborhood.trim() : null;

  const goalSeeds = Math.floor(Number(body.goal_seeds ?? 0));
  if (!Number.isFinite(goalSeeds) || goalSeeds <= 0) errors.push({ field: 'goal_seeds', message: 'Meta em Seeds deve ser maior que zero.' });

  const beneficiaries = Math.max(0, Math.floor(Number(body.beneficiaries_count ?? 0)));

  const impactUnit = typeof body.impact_unit === 'string' && body.impact_unit.trim() ? body.impact_unit.trim() : null;
  const impactPerSeedNum = Number(body.impact_per_seed ?? 0);
  const impactPerSeed = Number.isFinite(impactPerSeedNum) && impactPerSeedNum >= 0 ? impactPerSeedNum : 0;

  const createdByName = typeof body.created_by_name === 'string' && body.created_by_name.trim() ? body.created_by_name.trim() : null;

  const coverImageUrl = typeof body.cover_image_url === 'string' && body.cover_image_url.trim() ? body.cover_image_url.trim() : null;

  const statusRaw = typeof body.status === 'string' ? body.status : 'active';
  const status: 'active' | 'paused' = statusRaw === 'paused' ? 'paused' : 'active';

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      title,
      description,
      story,
      category: categoryRaw,
      neighborhood,
      goal_seeds: goalSeeds,
      goal_amount: reaisFromSeeds(goalSeeds),
      beneficiaries_count: beneficiaries,
      impact_unit: impactUnit,
      impact_per_seed: impactPerSeed,
      created_by_name: createdByName,
      cover_image_url: coverImageUrl,
      status,
    },
  };
}

export const PROJECT_FORM_LIMITS = {
  descriptionMax: MAX_DESCRIPTION,
  uploadMaxBytes: 5 * 1024 * 1024,
  uploadMimes: new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
};
