export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
export type TriggerType = 'conquista' | 'surpresa' | 'desafio' | 'sequencia' | 'marco';

export interface CollectibleItem {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  description: string;
  rarity: Rarity;
  rarity_score: number;
  trigger_type: TriggerType;
  trigger_condition: Record<string, unknown> | null;
}

export interface UserCollectible {
  id: string;
  consumer_id: string;
  item_id: string;
  quantity: number;
  first_obtained_at: string;
  obtained_count: number;
  seeds_bonus_earned: number;
}

export interface AwardContext {
  scan_count?: number;
  seeds_earned?: number;
  level?: string;
  projects_count?: number;
  purchase_count?: number;
  streak_days?: number;
  purchase_amount?: number;
  all_active_projects_supported?: boolean;
}

export type AwardKind = 'marco' | 'conquista' | 'lendario' | 'sequencia' | 'desafio' | 'duplicata';

export interface AwardResult {
  item: CollectibleItem;
  new: boolean;
  bonus?: number;
  kind: AwardKind;
}

export type EventType = 'scan' | 'plant' | 'purchase';

export const DUPLICATE_BONUS_SEEDS = 5;
export const MARCO_INTERVAL_SCANS = 5;
