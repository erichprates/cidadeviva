// Mapeamento slug → imagem 3D em public/winners/.
// Arquivos renomeados pra underscore (sem espaços).

export const ACHIEVEMENT_IMAGES: Record<string, string> = {
  primeira_nota: '/winners/primeira_nota.png',
  consumidor_consciente: '/winners/consumidor_consciente.png',
  semana_ativa: '/winners/semana_ativa.png',
  guardiao_saude: '/winners/guardiao_saude.png',
  plantador_dedicado: '/winners/plantador_dedicado.png',
  transformador_local: '/winners/transformador_local.png',
  embaixador_cidade: '/winners/embaixador_da_cidade.png',
  guardiao_floresta: '/winners/guardiao_da_floresta.png',
  lenda_comunidade: '/winners/lenda_da_comunidade.png',
  doador_exponencial: '/winners/doador_exponencial.png',
};

export function achievementImage(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return ACHIEVEMENT_IMAGES[slug] ?? null;
}

export interface DifficultyConfig {
  level: number;
  color: string;
  bg: string;
  label: string;
}

const DIFFICULTY_COLORS: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: '#1B7A4A', bg: 'rgba(27, 122, 74, 0.14)', label: 'Iniciante' },
  2: { color: '#1B7A4A', bg: 'rgba(27, 122, 74, 0.14)', label: 'Fácil' },
  3: { color: '#185FA5', bg: 'rgba(24, 95, 165, 0.14)', label: 'Médio' },
  4: { color: '#185FA5', bg: 'rgba(24, 95, 165, 0.14)', label: 'Médio' },
  5: { color: '#8B6914', bg: 'rgba(139, 105, 20, 0.14)', label: 'Difícil' },
  6: { color: '#C04828', bg: 'rgba(192, 72, 40, 0.14)', label: 'Épico' },
  7: { color: '#C04828', bg: 'rgba(192, 72, 40, 0.14)', label: 'Épico' },
};

export const ACHIEVEMENT_DIFFICULTY: Record<string, DifficultyConfig> = {
  primeira_nota: { level: 1, ...DIFFICULTY_COLORS[1] },
  consumidor_consciente: { level: 2, ...DIFFICULTY_COLORS[2] },
  semana_ativa: { level: 3, ...DIFFICULTY_COLORS[3] },
  guardiao_saude: { level: 3, ...DIFFICULTY_COLORS[3] },
  plantador_dedicado: { level: 4, ...DIFFICULTY_COLORS[4] },
  transformador_local: { level: 5, ...DIFFICULTY_COLORS[5] },
  embaixador_cidade: { level: 5, ...DIFFICULTY_COLORS[5] },
  guardiao_floresta: { level: 6, ...DIFFICULTY_COLORS[6] },
  lenda_comunidade: { level: 7, ...DIFFICULTY_COLORS[7] },
  doador_exponencial: { level: 8, ...DIFFICULTY_COLORS[7] },
};

export function achievementDifficulty(slug: string | null | undefined): DifficultyConfig {
  if (!slug) return { level: 1, ...DIFFICULTY_COLORS[1] };
  return ACHIEVEMENT_DIFFICULTY[slug] ?? { level: 1, ...DIFFICULTY_COLORS[1] };
}

// Descrições motivacionais por condition_type, com valor dinâmico quando aplicável.
export function achievementCondition(
  type: string,
  value: number,
): string {
  switch (type) {
    case 'receipt_count':
      return value === 1
        ? 'Escaneie seu primeiro comprovante para desbloquear.'
        : `Escaneie ${value.toLocaleString('pt-BR')} comprovantes para desbloquear.`;
    case 'streak_days':
      return `Escaneie por ${value} dias consecutivos sem falhar.`;
    case 'total_amount':
      return `Acumule ${value.toLocaleString('pt-BR')} Seeds gerados por scans.`;
    case 'projects_supported':
      return `Apoie ${value} vezes projetos da categoria Saúde.`;
    case 'all_projects':
      return 'Apoie todos os projetos ativos ao mesmo tempo.';
    default:
      return 'Continue usando o app para desbloquear!';
  }
}

// Dica curta pelo slug (hint de motivação).
export function achievementHint(slug: string): string {
  switch (slug) {
    case 'primeira_nota':
      return 'Escaneie seu primeiro comprovante agora!';
    case 'consumidor_consciente':
    case 'plantador_dedicado':
      return 'Cada compra conta — escaneie sempre!';
    case 'semana_ativa':
    case 'doador_exponencial':
      return 'Escaneie hoje para manter sua sequência!';
    case 'guardiao_saude':
    case 'embaixador_cidade':
      return 'Plante em projetos diferentes para avançar.';
    case 'transformador_local':
    case 'guardiao_floresta':
    case 'lenda_comunidade':
      return 'Cada compra aproxima você dessa conquista!';
    default:
      return 'Continue escaneando!';
  }
}
