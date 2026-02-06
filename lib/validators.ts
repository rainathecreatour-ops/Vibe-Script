// lib/validators.ts

const ACCESS_CODES = [
  'VIBE-1001',
  'VIBE-1002',
  'VIBE-1003',
  'VIBE-7F3K9',
  'VIBE-M8Q2L'
];

// Optional: disable/refund codes here
const DISABLED_CODES: string[] = [];

export function normalizeCode(code: string) {
  return (code || '').trim();
}

export function isValidAccessCode(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return false;
  if (DISABLED_CODES.includes(normalized)) return false;
  return ACCESS_CODES.includes(normalized);
}

export function clampWords(words: number, min: number, max: number) {
  return Math.max(min, Math.min(max, words));
}

export function approxWordsForDuration(seconds: number) {
  return Math.round(seconds * (130 / 60));
}
