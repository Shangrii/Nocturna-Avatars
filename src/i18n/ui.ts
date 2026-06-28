/**
 * i18n core (I18N-01/I18N-02).
 *
 * Content lives in per-language JSON dictionaries ({ es: {...}, en: {...} }).
 * Components read copy through these helpers — never hard-code strings.
 */
import commonDict from './common.json';
import homeDict from './home.json';
import navDict from './nav.json';
import packagesDict from './packages.json';
import pagesDict from './pages.json';

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

// English-first (CHANGE 1): EN is the default/fallback locale. Spanish browsers
// are still routed to /es/ by the root redirect's navigator.language detection.
export const defaultLang: Lang = 'en';

/** All supported language codes, in routing order. */
export const langCodes = Object.keys(languages) as Lang[];

/** Narrow an arbitrary string (e.g. route param) to a supported Lang, else default. */
export function toLang(value: string | undefined): Lang {
  return value && value in languages ? (value as Lang) : defaultLang;
}

/** A bilingual dictionary keyed by language code. */
type Dict<T> = Record<Lang, T>;

const dictionaries = {
  common: commonDict as Dict<(typeof commonDict)['es']>,
  home: homeDict as Dict<(typeof homeDict)['es']>,
  nav: navDict as Dict<(typeof navDict)['es']>,
  packages: packagesDict as Dict<(typeof packagesDict)['es']>,
  pages: pagesDict as Dict<(typeof pagesDict)['es']>,
};

export type DictName = keyof typeof dictionaries;

/**
 * Return the slice of a named dictionary for the given language.
 * Usage: const t = useTranslations('en', 'home'); t.taglineB
 */
export function useTranslations<N extends DictName>(
  lang: Lang,
  dict: N,
): (typeof dictionaries)[N][Lang] {
  return dictionaries[dict][lang];
}
