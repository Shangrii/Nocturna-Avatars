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

/** A single editor-profile entry (the `editors.json` array element). */
export interface Editor {
  slug: string;
  discordId: string;
  published: boolean;
  name: string;
  avatar: string;
  tagline: Bilingual;
  links: EditorLink[];
  blocks: EditorBlock[];
}
