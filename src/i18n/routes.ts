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
 *   terms    → /es/terminos  · /en/terms   (page itself ships in plan 01-04)
 */
import { langCodes, type Lang } from './ui';

export type PageConcept = 'home' | 'services' | 'gallery' | 'store' | 'terms';

/** concept → { es slug, en slug }. Home is the empty slug (bare locale root). */
export const routeSlugs: Record<PageConcept, Record<Lang, string>> = {
  home: { es: '', en: '' },
  services: { es: 'servicios', en: 'services' },
  gallery: { es: 'galeria', en: 'gallery' },
  store: { es: 'tienda', en: 'store' },
  terms: { es: 'terminos', en: 'terms' },
};

/** Concepts that are real, navigable pages in the nav, in display order. */
export const navConcepts: PageConcept[] = ['home', 'services', 'gallery', 'store', 'terms'];

/** Build the localized path for a concept in a given locale, e.g. "/en/services". */
export function localizedPath(concept: PageConcept, lang: Lang): string {
  const slug = routeSlugs[concept][lang];
  return slug ? `/${lang}/${slug}` : `/${lang}/`;
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
 */
export function translatePath(pathname: string, target: Lang): string {
  const segments = pathname.split('/').filter(Boolean); // ['en','services']
  const sourceLang = (segments[0] as Lang) ?? target;
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
