/**
 * Avatar initials: first letter of the first and last word that start with a letter.
 * Words like "(Demo)" or "#2" are skipped, so "Alex Carter (Demo)" gives "AC", not "A(".
 */
export function initials(name: string, fallback = '?'): string {
  const words = name.trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || fallback;
}
