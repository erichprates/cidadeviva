export interface CategoryMeta {
  label: string;
  emoji: string;
  bg: string; // cor sólida do badge
  fg: string;
  gradient: string; // fallback CSS (foto sempre empilhada por cima)
  defaultCover: string; // foto padrão da categoria, validada (HTTP 200)
}

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #3D2B1F 0%, #6B4A36 100%)';
const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80&auto=format&fit=crop';

const CATEGORIES: Record<string, CategoryMeta> = {
  saude: {
    label: 'Saúde',
    emoji: '💚',
    bg: 'rgba(27, 122, 74, 0.92)',
    fg: '#FEFCF8',
    gradient: 'linear-gradient(135deg, #1B7A4A 0%, #8DC63F 100%)',
    defaultCover:
      'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80&auto=format&fit=crop',
  },
  educacao: {
    label: 'Educação',
    emoji: '📚',
    bg: 'rgba(36, 99, 175, 0.92)',
    fg: '#FEFCF8',
    gradient: 'linear-gradient(135deg, #1B4A7A 0%, #3F8DC6 100%)',
    defaultCover:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=80&auto=format&fit=crop',
  },
  alimentacao: {
    label: 'Alimentação',
    emoji: '🥗',
    bg: 'rgba(232, 160, 32, 0.95)',
    fg: '#3D2B1F',
    gradient: 'linear-gradient(135deg, #7A4A1B 0%, #C6833F 100%)',
    defaultCover:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80&auto=format&fit=crop',
  },
  cultura: {
    label: 'Cultura',
    emoji: '🎭',
    bg: 'rgba(255, 122, 69, 0.92)',
    fg: '#FEFCF8',
    gradient: 'linear-gradient(135deg, #7A1B4A 0%, #C63F83 100%)',
    defaultCover:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80&auto=format&fit=crop',
  },
  meio_ambiente: {
    label: 'Meio Ambiente',
    emoji: '🌿',
    bg: 'rgba(20, 158, 153, 0.92)',
    fg: '#FEFCF8',
    gradient: 'linear-gradient(135deg, #2D7A1B 0%, #63C63F 100%)',
    defaultCover:
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&q=80&auto=format&fit=crop',
  },
};

export function getCategory(slug: string | null | undefined): CategoryMeta {
  if (!slug)
    return {
      label: 'Projeto',
      emoji: '🌱',
      bg: 'rgba(61,43,31,0.85)',
      fg: '#FEFCF8',
      gradient: FALLBACK_GRADIENT,
      defaultCover: FALLBACK_COVER,
    };
  return (
    CATEGORIES[slug] ?? {
      label: slug,
      emoji: '🌱',
      bg: 'rgba(61,43,31,0.85)',
      fg: '#FEFCF8',
      gradient: FALLBACK_GRADIENT,
      defaultCover: FALLBACK_COVER,
    }
  );
}

export function coverBackground(category: string | null | undefined, coverUrl: string | null | undefined): string {
  const meta = getCategory(category);
  const url = coverUrl && coverUrl.trim() ? coverUrl : meta.defaultCover;
  // Empilhamos a imagem por cima do gradiente: se a foto demorar/falhar, o gradiente fica visível.
  return `center / cover no-repeat url("${url}"), ${meta.gradient}`;
}
