export function normalizeCode(code: string) {
  return (code || '').trim();
}

export function isValidAccessCode(code: string) {
  const normalized = normalizeCode(code);
  const validRaw = process.env.VALID_ACCESS_CODES || '';
  const disabledRaw = process.env.DISABLED_ACCESS_CODES || '';

  const valid = validRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const disabled = disabledRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (!normalized) return false;
  if (disabled.includes(normalized)) return false;
  return valid.includes(normalized);
}

export function clampWords(words: number, min: number, max: number) {
  return Math.max(min, Math.min(max, words));
}

export function approxWordsForDuration(seconds: number) {
  // Spoken narration: ~130 wpm average. 130/60 ≈ 2.1667 words/sec
  return Math.round(seconds * 2.1667);
}
