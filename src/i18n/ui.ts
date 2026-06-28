/**
 * i18n core (I18N-01/I18N-02).
 *
 * Content lives in per-language JSON dictionaries ({ es: {...}, en: {...} }).
 * Components read copy through these helpers — never hard-code strings.
 */
import commonDict from './common.json';
import homeDict from './home.json';

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'es';

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
