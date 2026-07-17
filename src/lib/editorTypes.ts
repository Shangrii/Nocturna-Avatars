/**
 * editorTypes — TypeScript mirror of the 10-01 `editors.json` entry + closed
 * block-union schema (D-01 / D-02). This is the SINGLE render-side contract the
 * block library (10-04) and the page route (10-07) type against.
 *
 * The union is CLOSED and every content field is a plain string / bilingual
 * `{es,en}` string — there is no raw-HTML field anywhere in the schema, which is
 * the load-bearing half of the D-02 XSS guarantee (the other half is that every
 * consuming component renders these through Astro auto-escaping, never a
 * raw-HTML directive). `editors.json` is written by the admin app / bot (untrusted at
 * build time), so consumers still read every field defensively — the types
 * document intent, they do not guarantee shape at runtime.
 */

/** A per-locale string pair. An empty locale is allowed (rendered as written). */
export interface Bilingual {
  es: string;
  en: string;
}

/** A custom link — `url` is `https://`-only, validated upstream (10-02 model). */
export interface EditorLink {
  label: string;
  url: string;
}

/** A hand-added portfolio item (appended to the auto-pulled credited work). */
export interface PortfolioExtra {
  image: string;
  caption: Bilingual;
}

/**
 * The closed block union (UI-SPEC Block Inventory). BlockRenderer dispatches on
 * `type`; an unknown/unlisted `type` renders nothing (defensive — editors.json
 * is externally written).
 */
export type EditorBlock =
  | { type: 'bio'; text: Bilingual }
  | { type: 'heading'; text: Bilingual }
  | { type: 'text'; text: Bilingual }
  | { type: 'links'; items: EditorLink[] }
  | { type: 'portfolio'; auto: boolean; extra?: PortfolioExtra[] }
  | { type: 'quote'; text: Bilingual; attribution?: string }
  | { type: 'image'; src: string; alt: string }
  | { type: 'divider' };

/** Narrow the union to a single variant (used by each per-block component). */
export type BlockOf<T extends EditorBlock['type']> = Extract<EditorBlock, { type: T }>;

/**
 * Per-editor theme (10.1 D-01/D-02/D-03/D-11/D-21/D-26). Mirrors the UI-SPEC
 * "Theme Token Contract" table one-to-one: each field feeds a single `--theme-*`
 * CSS custom property emitted by `EditorLayout` (10.1-06). Every field has a
 * Midnight-Nocturna default so an entry with a partial/absent theme still renders
 * (the render layer fills defaults — D-26 clean cutover). Types document intent
 * only; the render layer emits a FIXED whitelist of tokens and never trusts the
 * shape of these values (T-10.1-01-01), so there is no raw-HTML/media-exec field.
 */
export interface EditorTheme {
  /** `--theme-bg` — page background behind media. Default `#0a0c14`. */
  bg: string;
  /** `--theme-bg-media` — image/gif/video ref layer. Default none. */
  bgMedia?: string;
  /** `--theme-overlay` — 0–100, scrim darkness over media (D-21). Default 40. */
  overlay: number;
  /** `--theme-blur` — 0–20px, media backdrop blur (D-21). Default 0. */
  blur: number;
  /** `--theme-tint` — media color tint (D-21). Default none. */
  tint?: string;
  /** `--theme-surface` — glass card fill. Default `rgba(240,234,228,0.06)`. */
  surface: string;
  /** `--theme-accent` — buttons, ring, icon hover, active. Default `#c0192c`. */
  accent: string;
  /** `--theme-text` — body/link text. Default `#f0eae4`. */
  text: string;
  /** `--theme-text-muted` — tagline, meta. Default `#9a9198`. */
  textMuted: string;
  /** `--theme-font` — one curated family key (D-03). Default `Inter`. */
  font: string;
  /** `--theme-btn-style` — link-button treatment (D-11). Default `glass`. */
  btnStyle: 'filled' | 'outline' | 'glass';
  /** `--theme-btn-shape` — corner radius (D-11: 0/12px/999px). Default `rounded`. */
  btnShape: 'sharp' | 'rounded' | 'pill';
  /** Opt-in effect keys (Effects Catalog). Default `[]`. */
  effects: string[];
  /** Uploaded MP3 ref (the "own file" music option; mutually exclusive with spotify). */
  audio?: string;
  /** Vinyl cover image for the uploaded MP3. */
  audioCover?: string;
  /** Song title shown next to the MP3 vinyl. */
  audioTitle?: string;
  /** Independent link-button color (hex). Falls back to accent when unset. */
  btnColor?: string;
  /** Global text-size multiplier (0.8–1.6). Default 1. */
  fontScale?: number;
  /** Picked Spotify TRACK url (static vinyl player; art/title via oEmbed). Default none. */
  spotify?: string;
  /** Where the track starts on autoplay, in seconds. Default 0 (beginning). */
  spotifyStart?: number;
  /** Default music volume 0–100. Default 70. */
  musicVolume?: number;
  /** Applied preset key (D-24). Default `midnight-nocturna`. */
  preset?: string;
}

/** A single editor-profile entry (the `editors.json` array element). */
export interface Editor {
  slug: string;
  discordId: string;
  published: boolean;
  name: string;
  avatar: string;
  /** D-13: single-language page — the field the page renders in. */
  lang: 'es' | 'en';
  /** D-13: single-string tagline (per `lang`), replaces the old `Bilingual`. */
  tagline: string;
  /** Curated-set badge keys (D-07). */
  badges: string[];
  /** Platform-icon social row (D-09). */
  socials: EditorLink[];
  links: EditorLink[];
  blocks: EditorBlock[];
  /** Per-editor theme (D-01/D-26). */
  theme: EditorTheme;
  /** View count (D-25); optional — hidden when absent/unreachable. */
  views?: number;
}
