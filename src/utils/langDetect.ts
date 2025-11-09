export type DetectedLang = 'am' | 'en' | 'or' | 'so' | 'ti' | 'mixed' | 'other';

// Unicode ranges for script detection
const ETHIOPIC_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/g; // Ge'ez/Ethiopic
const LATIN_REGEX = /[A-Za-z]/g; // Basic Latin letters

const countMatches = (text: string, regex: RegExp) => (text.match(regex) || []).length;

export function detectLanguage(text: string): DetectedLang {
  if (!text) return 'other';
  const cleaned = text.normalize('NFC');

  const et = countMatches(cleaned, ETHIOPIC_REGEX);
  const la = countMatches(cleaned, LATIN_REGEX);
  const total = et + la;

  if (total === 0) return 'other';

  const etRatio = et / total;
  const laRatio = la / total;

  const ratios = [etRatio, laRatio].sort((a, b) => b - a);
  const hasMixed = ratios.length >= 2 && ratios[1] >= 0.2; // at least 20% of a second script

  if (hasMixed) {
    return 'mixed';
  }

  // Check for Oromo-specific patterns in Latin script text
  if (laRatio > etRatio) {
    const oromoPatterns = /\b(maqaa|garee|qabeenyi|hojii|adeemsa|qooda|waliin|irraa)\b/i;
    const somaliPatterns = /\b(waa|iyo|ama|soo|ka|ku|ugu|ayaa|baan|aan)\b/i;
    
    if (oromoPatterns.test(text)) {
      return 'or';
    }
    if (somaliPatterns.test(text)) {
      return 'so';
    }
    return 'en';
  }

  // For Ethiopic script, check for Tigrinya-specific patterns
  if (etRatio > laRatio) {
    const tigrinyaPatterns = /\b(ክቡር|እንተ|እዚ|ንሱ|ኣብ|ዝኾነ|ከም|ምስ|ናይ)\b/i;
    if (tigrinyaPatterns.test(text)) {
      return 'ti';
    }
    return 'am';
  }
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
