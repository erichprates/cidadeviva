import type { Merchant, Receipt, ReceiptStatus } from '../supabase/types';
import type { VisionResult } from '../vision/extract-receipt';

export const SEED_VALUE_IN_REAIS = 0.10;
export const MIN_SEEDS_TO_PLANT = 50;

export interface CreditDecision {
  status: ReceiptStatus;
  credits: number;
  seeds: number;
  reason: string | null;
}

export function seedsFromAmount(reaisAmount: number): number {
  if (!reaisAmount || reaisAmount <= 0) return 0;
  return Math.floor(reaisAmount / SEED_VALUE_IN_REAIS);
}

export function reaisFromSeeds(seeds: number): number {
  return Number((seeds * SEED_VALUE_IN_REAIS).toFixed(2));
}

const DATE_ONLY_SUSPICION = /\b(futura|future|data)\b/i;
const REAL_SUSPICION = /\b(editad[oa]|screenshot|manipulad[oa]|fals[oa]|inconsistent[e]?)\b/i;

export function isSuspicionLegit(reason: string | null | undefined): boolean {
  if (!reason) return true;
  if (REAL_SUSPICION.test(reason)) return true;
  if (DATE_ONLY_SUSPICION.test(reason)) return false;
  return true;
}

export function decideReceipt(
  vision: VisionResult,
  merchant: Merchant | null,
): CreditDecision {
  const suspicionIsLegit = vision.is_suspicious && isSuspicionLegit(vision.suspicion_reason);
  const lowConfidence = vision.confidence < 0.7;

  if (lowConfidence || suspicionIsLegit) {
    return {
      status: 'suspicious',
      credits: 0,
      seeds: 0,
      reason: vision.suspicion_reason ?? 'Confiança baixa na leitura. Enviado para revisão.',
    };
  }

  if (!vision.total_amount || vision.total_amount <= 0) {
    return {
      status: 'rejected',
      credits: 0,
      seeds: 0,
      reason: 'Não foi possível identificar o valor da compra.',
    };
  }

  if (!merchant) {
    return {
      status: 'pending',
      credits: 0,
      seeds: 0,
      reason: 'Lojista não identificado na rede Cidade Viva.',
    };
  }

  const credits = Number((vision.total_amount * (merchant.cashback_rate / 100)).toFixed(2));
  const seeds = seedsFromAmount(credits);
  return { status: 'approved', credits, seeds, reason: null };
}

export function fingerprintMatches(
  a: Pick<Receipt, 'extracted_cnpj' | 'extracted_amount' | 'extracted_date'>,
  b: Pick<Receipt, 'extracted_cnpj' | 'extracted_amount' | 'extracted_date'>,
): boolean {
  return !!a.extracted_cnpj && a.extracted_cnpj === b.extracted_cnpj &&
    a.extracted_amount === b.extracted_amount &&
    a.extracted_date === b.extracted_date;
}

export interface UserLevel {
  level: string;
  emoji: string;
  message: string;
  next: number;
  progress: number;
}

export function getUserLevel(totalSeedsEarned: number): UserLevel {
  if (totalSeedsEarned >= 2000) return {
    level: 'Floresta',
    emoji: '🌲',
    message: 'Uma floresta que impacta muitas vidas.',
    next: 0,
    progress: 100,
  };
  if (totalSeedsEarned >= 500) return {
    level: 'Árvore',
    emoji: '🌳',
    message: 'Já fez crescer uma árvore na comunidade.',
    next: 2000,
    progress: Math.round(((totalSeedsEarned - 500) / 1500) * 100),
  };
  if (totalSeedsEarned >= 100) return {
    level: 'Muda',
    emoji: '🌿',
    message: 'Sua muda está crescendo.',
    next: 500,
    progress: Math.round(((totalSeedsEarned - 100) / 400) * 100),
  };
  return {
    level: 'Broto',
    emoji: '🌱',
    message: 'Já brotando os primeiros resultados conscientes!',
    next: 100,
    progress: Math.round((totalSeedsEarned / 100) * 100),
  };
}

const NEXT_LEVEL_LABEL: Record<string, { name: string; emoji: string } | null> = {
  Broto: { name: 'Muda', emoji: '🌿' },
  Muda: { name: 'Árvore', emoji: '🌳' },
  Árvore: { name: 'Floresta', emoji: '🌲' },
  Floresta: null,
};

export function getNextLevelMeta(currentLevel: string) {
  return NEXT_LEVEL_LABEL[currentLevel] ?? null;
}
