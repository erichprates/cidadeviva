// Dados fictícios pra encher o ranking enquanto a comunidade cresce.
// IDs em prefixo 'demo-' pra nunca colidir com UUIDs reais.

export interface FictitiousSeedsRow {
  id: string;
  name: string;
  seeds: number;
  level_emoji: string;
  level_name: string;
  fictitious: true;
}

export interface FictitiousCollectionRow {
  id: string;
  name: string;
  score: number;
  unique_items: number;
  legendary_count: number;
  legendary_emojis: string[];
  fictitious: true;
}

export const FICTITIOUS_SEEDS: FictitiousSeedsRow[] = [
  { id: 'demo-1', name: 'Ana Carolina S.', seeds: 2340, level_emoji: '🌲', level_name: 'Floresta', fictitious: true },
  { id: 'demo-2', name: 'Pedro Mendes', seeds: 1820, level_emoji: '🌳', level_name: 'Árvore', fictitious: true },
  { id: 'demo-3', name: 'Juliana Costa', seeds: 1240, level_emoji: '🌳', level_name: 'Árvore', fictitious: true },
  { id: 'demo-4', name: 'Roberto Lima', seeds: 680, level_emoji: '🌿', level_name: 'Muda', fictitious: true },
  { id: 'demo-5', name: 'Fernanda Alves', seeds: 420, level_emoji: '🌿', level_name: 'Muda', fictitious: true },
  { id: 'demo-6', name: 'Carlos Eduardo', seeds: 180, level_emoji: '🌱', level_name: 'Broto', fictitious: true },
  { id: 'demo-7', name: 'Mariana Souza', seeds: 95, level_emoji: '🌱', level_name: 'Broto', fictitious: true },
];

// Coleção: score proporcional à posição (raros/lendários principalmente no topo).
export const FICTITIOUS_COLLECTION: FictitiousCollectionRow[] = [
  { id: 'demo-1', name: 'Ana Carolina S.', score: 340, unique_items: 11, legendary_count: 2, legendary_emojis: ['🚜', '🌍'], fictitious: true },
  { id: 'demo-2', name: 'Pedro Mendes', score: 240, unique_items: 9, legendary_count: 1, legendary_emojis: ['🌍'], fictitious: true },
  { id: 'demo-3', name: 'Juliana Costa', score: 180, unique_items: 8, legendary_count: 1, legendary_emojis: ['✨'], fictitious: true },
  { id: 'demo-4', name: 'Roberto Lima', score: 105, unique_items: 6, legendary_count: 0, legendary_emojis: [], fictitious: true },
  { id: 'demo-5', name: 'Fernanda Alves', score: 72, unique_items: 5, legendary_count: 0, legendary_emojis: [], fictitious: true },
  { id: 'demo-6', name: 'Carlos Eduardo', score: 35, unique_items: 4, legendary_count: 0, legendary_emojis: [], fictitious: true },
  { id: 'demo-7', name: 'Mariana Souza', score: 12, unique_items: 3, legendary_count: 0, legendary_emojis: [], fictitious: true },
];

export const FICTITIOUS_THRESHOLD = 5;
