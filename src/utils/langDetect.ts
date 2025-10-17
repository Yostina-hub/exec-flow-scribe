export type DetectedLang = 'am' | 'en' | 'ar' | 'mixed' | 'other';

// Unicode ranges for script detection
const ETHIOPIC_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/g; // Ge'ez/Ethiopic
const ARABIC_REGEX = /[\u0600-\u06FF]/g; // Arabic
const LATIN_REGEX = /[A-Za-z]/g; // Basic Latin letters

const countMatches = (text: string, regex: RegExp) => (text.match(regex) || []).length;

export function detectLanguage(text: string): DetectedLang {
  if (!text) return 'other';
  const cleaned = text.normalize('NFC');

  const et = countMatches(cleaned, ETHIOPIC_REGEX);
  const ar = countMatches(cleaned, ARABIC_REGEX);
  const la = countMatches(cleaned, LATIN_REGEX);
  const total = et + ar + la;

  if (total === 0) return 'other';

  const etRatio = et / total;
  const arRatio = ar / total;
  const laRatio = la / total;

  const ratios = [etRatio, arRatio, laRatio].sort((a, b) => b - a);
  const hasMixed = ratios.length >= 2 && ratios[1] >= 0.2; // at least 20% of a second script

  if (hasMixed) {
    // Decide the dominant language but mark as mixed
    if (etRatio >= arRatio && etRatio >= laRatio) return 'mixed';
    if (arRatio >= etRatio && arRatio >= laRatio) return 'mixed';
    return 'mixed';
  }

  if (etRatio > arRatio && etRatio > laRatio) return 'am';
  if (arRatio > etRatio && arRatio > laRatio) return 'ar';
  if (laRatio > etRatio && laRatio > arRatio) return 'en';
  return 'other';
}

export function isNoise(text: string): boolean {
  const s = (text || '').replace(/\s+/g, '').toLowerCase();
  if (s.length < 8) return false;
  // Repeated single/dual chars like eeeeeeeeee or hahahahaha
  if (/^(.)\1{8,}$/.test(s)) return true;
  if (/^(ha)+$/.test(s)) return true;
  // Very low character diversity
  const unique = new Set([...s]).size;
  return unique <= 3;
}
