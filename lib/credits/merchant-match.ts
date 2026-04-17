import type { Merchant } from '../supabase/types';

export function normalizeDocument(doc: string | null | undefined): string {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1;
    }
  }
  return matrix[b.length][a.length];
}

export const FUZZY_DISTANCE_THRESHOLD = 2;

export interface FuzzyResult {
  merchant: Merchant | null;
  distance: number | null;
  candidates: number;
}

export function fuzzyMatchCnpj(extractedCnpj: string, merchants: Merchant[]): FuzzyResult {
  const extractedNorm = normalizeDocument(extractedCnpj);
  if (extractedNorm.length !== 14) return { merchant: null, distance: null, candidates: 0 };

  const candidates: Array<{ merchant: Merchant; distance: number }> = [];
  for (const m of merchants) {
    const docNorm = normalizeDocument(m.document);
    if (docNorm.length !== 14) continue;
    const d = levenshtein(extractedNorm, docNorm);
    if (d <= FUZZY_DISTANCE_THRESHOLD) candidates.push({ merchant: m, distance: d });
  }

  if (candidates.length === 1) {
    return { merchant: candidates[0].merchant, distance: candidates[0].distance, candidates: 1 };
  }
  return { merchant: null, distance: null, candidates: candidates.length };
}
