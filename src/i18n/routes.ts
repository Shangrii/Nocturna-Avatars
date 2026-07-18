/**
 * Central localized-route map (CHANGE 3).
 *
 * Single source of truth mapping a page *concept* → its per-locale URL slug.
 * Routing (getStaticPaths), the nav, and the language switcher all derive URLs
 * from here so there is never a naive prefix swap: translating a page to the
 * other locale means looking up the SAME concept's slug in that locale.
 *
 * Emitted URLs:
 *   home     → /es/        · /en/
 *   services → /es/servicios · /en/services
 *   gallery  → /es/galeria   · /en/gallery
 *   editors  → /es/editores  · /en/editors  (directory concept; per-editor pages ship in 10-07)
 *   terms    → /es/terminos  · /en/terms   (page itself ships in plan 01-04)
 */
import { langCodes, type Lang } from './ui';

export type PageConcept = 'home' | 'services' | 'gallery' | 'store' | 'editors' | 'terms';

/** concept → { es slug, en slug }. Home is the empty slug (bare locale root). */
export const routeSlugs: Record<PageConcept, Record<Lang, string>> = {
  home: { es: '', en: '' },
  services: { es: 'servicios', en: 'services' },
  gallery: { es: 'galeria', en: 'gallery' },
  store: { es: 'tienda', en: 'store' },
  editors: { es: 'editores', en: 'editors' },
  terms: { es: 'terminos', en: 'terms' },
};

/**
 * Concepts that are real, navigable pages in the nav, in display order.
 * `editors` is intentionally ABSENT (10.1 D-16): the directory is unlisted, so it
 * no longer appears in the navbar — but it stays in `routeSlugs` / `PageConcept`
 * so the (now-unlisted) directory route and the legacy redirect stubs still build.
 */
export const navConcepts: PageConcept[] = ['home', 'store', 'services', 'gallery', 'terms'];

/** Build the localized path for a concept in a given locale, e.g. "/en/services". */
export function localizedPath(concept: PageConcept, lang: Lang): string {
  const slug = routeSlugs[concept][lang];
  return slug ? `/${lang}/${slug}` : `/${lang}/`;
}

/**
 * Per-editor path helper: build the canonical vanity URL for a single editor
 * profile — editorPath('aria') → "/e/aria" (10.1 D-14/D-17). This one change
 * repoints every D-17 credit cross-link (store cards, gallery items, directory)
 * at the short standalone URL at once. Editor pages are single-language (D-13),
 * so the URL no longer carries a locale segment. The `lang` parameter is kept in
 * the signature so existing callers (ProductCard / directory / translatePath)
 * compile unchanged; it is intentionally unused now.
 */
export function editorPath(slug: string, _lang?: Lang): string {
  return `/e/${slug}`;
}

/**
 * Reverse lookup: given a locale and the slug currently in the URL, return the
 * page concept (or 'home' when the slug is empty). Returns null if unknown.
 */
export function conceptForSlug(lang: Lang, slug: string): PageConcept | null {
  if (!slug) return 'home';
  const entries = Object.entries(routeSlugs) as [PageConcept, Record<Lang, string>][];
  for (const [concept, byLang] of entries) {
    if (byLang[lang] === slug) return concept;
  }
  return null;
}

/**
 * Translate the CURRENT pathname to its counterpart in `target` locale using the
 * concept map (NOT a prefix swap). On /en/services → Español yields /es/servicios.
 * Falls back to the target locale root if the path can't be resolved.
 *
 * Per-editor pages carry a trailing `<slug>` the concept map alone can't resolve
 * (the editor slug is item-level, not a concept). When the path is
 * `/<lang>/<editorsSlug>/<slug>` we detect the editors concept from the first
 * path segment and rebuild the counterpart with the SAME slug via `editorPath`,
 * so the language switcher lands on `/es/editores/<slug>` instead of dropping to
 * the locale root (10-07 — D-19).
 */
export function translatePath(pathname: string, target: Lang): string {
  const segments = pathname.split('/').filter(Boolean); // ['en','editors','aria']
  const sourceLang = (segments[0] as Lang) ?? target;

  // Per-editor page: /<lang>/<editorsSlug>/<editorSlug> — carry the slug across
  // locales. segments[1] must equal the editors concept slug in the source lang.
  if (segments.length >= 3 && segments[1] === routeSlugs.editors[sourceLang]) {
    const editorSlug = segments.slice(2).join('/');
    return editorPath(editorSlug, target);
  }

  const slug = segments.slice(1).join('/'); // 'services' (or '' at root)
  const concept = conceptForSlug(sourceLang, slug);
  if (!concept) return `/${target}/`;
  return localizedPath(concept, target);
}

/**
 * All { lang, page } pairs for a concept, for use in getStaticPaths of the
 * [lang]/[page].astro resolver (the param key matches the `[page]` filename).
 * Excludes home (the bare locale root, owned by [lang]/index.astro).
 */
export function staticPathsForConcept(
  concept: Exclude<PageConcept, 'home'>,
): { params: { lang: Lang; page: string } }[] {
  return langCodes.map((lang) => ({
    params: { lang, page: routeSlugs[concept][lang] },
  }));
}
