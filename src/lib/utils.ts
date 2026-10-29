export function flagEmoji(cc: string): string {
  if (!cc || cc.length !== 2) return '🏳️';
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + (cc.charCodeAt(0) - base)) +
         String.fromCodePoint(A + (cc.charCodeAt(1) - base));
}

// Basque place-name overrides for spots within Euskal Herria.
// Keyed by spot id — keeps the canonical ES/EN name as DB default and only
// swaps in the Basque form when the active language is EUS.
const BASQUE_NAMES: Record<string, string> = {
  '11111111-1111-4111-8111-111111111101': 'Gaztelugatxe',
  '11111111-1111-4111-8111-111111111303': 'Bardenak',
  '11111111-1111-4111-8111-111111111304': 'Donibane Garazi',
};

export function basqueName(spotId: string, fallback: string): string {
  return BASQUE_NAMES[spotId] ?? fallback;
}

// When language is EUS, Basque-country spots render their territory instead
// of "España" / "Spain" as the country label.
export function spotCountryLabel(spot: { country: string; euskal_herria: string | null }, lang: string): string {
  if (lang === 'EUS' && spot.euskal_herria) return 'Euskal Herria';
  return spot.country;
}

// Country flag for a spot. Under EUS, Basque spots show the Ikurriña flag
// (components render <Ikurrina /> directly for EUS spots; this helper is
// only used for non-Basque emoji flags).
export function spotFlag(spot: { country_code: string; euskal_herria: string | null }, lang: string): string {
  if (lang === 'EUS' && spot.euskal_herria) return '';
  return flagEmoji(spot.country_code);
}

export function formatLikes(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
  return `${n}`;
}

/**
 * Returns the translated text for the current language, falling back to
 * Spanish, then to the original `fallback` string (English).
 * Safely handles both string and object formats — newly added spots may
 * have a plain string description instead of a translations object.
 */
export function translatedText(
  translations: Record<string, string> | string | null | undefined,
  langKey: string,
  fallback: string | null | undefined,
): string | null {
  if (typeof translations === 'string') return translations;
  if (!translations || typeof translations !== 'object') return fallback ?? null;
  return translations[langKey] || translations['es'] || fallback || null;
}

export function categoryColor(cat: string): { bg: string; ring: string; text: string; pin: string } {
  if (cat === 'city') return { bg: 'bg-blue-500/15', ring: 'ring-blue-500/30', text: 'text-blue-600 dark:text-blue-300', pin: '#2e5a41' };
  if (cat === 'village') return { bg: 'bg-terracotta-500/15', ring: 'ring-terracotta-500/30', text: 'text-terracotta-600 dark:text-terracotta-300', pin: '#c6643f' };
  return { bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-300', pin: '#3f7253' };
}
