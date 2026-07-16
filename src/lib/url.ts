/**
 * url.ts — shared render-side URL scheme guard (CR-01, 10.1 review).
 *
 * editors.json is UNTRUSTED at build time. Astro attribute auto-escaping blocks
 * HTML-attribute breakout but does NOT neutralize dangerous URL *schemes*: an
 * `<a href="javascript:…">` still executes on click, and `rel="noopener…"` does
 * nothing to stop it. This is the render-side half of the defense the editor
 * shell advertises — it back-stops the bot-side validator (plan 09) so a
 * `javascript:` / `data:` / `vbscript:` URL in `links[]`, a block's `items[].url`,
 * or `socials[].url` can never become a clickable script-execution vector on a
 * public index,follow page.
 *
 * Policy: allow only `http:` / `https:` / `mailto:` absolute URLs and
 * site-relative paths (a single leading `/`, but not protocol-relative `//host`).
 * Everything else — including `javascript:`, `data:`, `vbscript:`, `file:` — is
 * rejected. Tabs/newlines that browsers strip before scheme resolution are
 * handled by the WHATWG `URL` parser, so obfuscated schemes (`java\nscript:`)
 * still fail. Returns the original (trimmed) string when safe, else `null`.
 */
export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  // Site-relative path (single leading slash). Reject protocol-relative `//host`
  // — it is technically http(s) but is easy to confuse with a path and offers no
  // benefit here; a real external link should carry an explicit scheme.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

  try {
    // Base handles the relative case; an absolute URL keeps its own scheme.
    const u = new URL(trimmed, 'https://x.invalid');
    if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}
