/** Normalize to E.164-ish: digits only, leading + */
export function normalizePhoneE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;

  return hasPlus || digits.length > 10 ? `+${digits}` : `+${digits}`;
}
