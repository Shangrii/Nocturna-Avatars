/**
 * blockText — resolve an editor block's copy field to a plain string.
 *
 * Block copy is SINGLE-LANGUAGE (D-13): the whole editor page renders in
 * `editor.lang`, so each block now carries one plain string. This helper returns
 * that string directly, but stays tolerant of a LEGACY `{es,en}` object written to
 * `editors.json` by an admin app that predates the de-bilingualization migration —
 * during the deploy window the un-migrated cinema app may still emit a pair, and a
 * live published page must never render a blank block. For the legacy object it
 * prefers the page's own `lang`, then `es`, then `en`. `editors.json` is externally
 * written, so every branch is defensively typed (never assumes shape).
 */
export function blockText(value: unknown, lang?: 'es' | 'en'): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const pick = (k: string): string => (typeof o[k] === 'string' ? (o[k] as string) : '');
    return (lang ? pick(lang) : '') || pick('es') || pick('en') || '';
  }
  return '';
}
