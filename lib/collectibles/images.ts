// Mapeamento slug → imagem 3D em public/collectibles/.

export const COLLECTIBLE_IMAGES: Record<string, string> = {
  bota: '/collectibles/bota.png',
  rastelo: '/collectibles/rastelo.png',
  pa: '/collectibles/pa.png',
  regador: '/collectibles/regador.png',
  cerca: '/collectibles/cerca.png',
  mangueira: '/collectibles/mangueira.png',
  nuvem_chuva: '/collectibles/nuven_de_chuva.png',
  celeiro: '/collectibles/celeiro.png',
  celeiro_2: '/collectibles/celeiro_2.png',
  carrinho_mao: '/collectibles/carrinho_de_mao.png',
  girassol: '/collectibles/girassol.png',
  cesta_vegetais: '/collectibles/cesta_com_vegetais.png',
  fertilizante: '/collectibles/fertilizante.png',
  pinheiros: '/collectibles/pinheiros.png',
  floresta: '/collectibles/floresta.png',
  arvore: '/collectibles/arvore.png',
  balde_agua: '/collectibles/balde_de_agua.png',
  flor_especial: '/collectibles/flor_especial.png',
  flor_lilas: '/collectibles/flor_lilas.png',
  nuvem_pouca_chuva: '/collectibles/nuvem_pouca_chuva.png',
  rastelo_dourado: '/collectibles/rastelo_dourado.png',
  regador_dourado: '/collectibles/regador_dourado.png',
  bota_dourada: '/collectibles/bota_dourada.png',
  pa_dourada: '/collectibles/pa-dourada.png', // o arquivo usa hífen
  trator_dourado: '/collectibles/trator_dourado.png',
  trator: '/collectibles/trator.png',
  mao_solidaria: '/collectibles/mao_solidaria.png',
  globo: '/collectibles/globo.png',
};

export function imageForSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return COLLECTIBLE_IMAGES[slug] ?? null;
}

export type RarityKey = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

export interface RarityConfig {
  label: string;
  color: string; // texto do badge
  bg: string; // fundo do card/badge suave
  score: number;
}

export const RARITY_CONFIG: Record<RarityKey, RarityConfig> = {
  comum: { label: 'Comum', color: '#6E6B62', bg: '#F1EFE8', score: 1 },
  incomum: { label: 'Incomum', color: '#1B7A4A', bg: '#E1F5EE', score: 10 },
  raro: { label: 'Raro', color: '#185FA5', bg: '#E6F1FB', score: 30 },
  epico: { label: 'Épico', color: '#8B6914', bg: '#FAEEDA', score: 60 },
  lendario: { label: 'Lendário', color: '#C04828', bg: '#FAECE7', score: 100 },
};

export function rarityConfig(key: string | null | undefined): RarityConfig {
  return RARITY_CONFIG[(key as RarityKey) ?? 'comum'] ?? RARITY_CONFIG.comum;
}

// Ordem pra renderização: Lendário → Épico → Raro → Incomum → Comum
export const RARITY_ORDER_DESC: RarityKey[] = ['lendario', 'epico', 'raro', 'incomum', 'comum'];
