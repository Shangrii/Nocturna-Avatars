# Phase 10: Editor Profile Pages — Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 16 (8 website repo · 8 nocturna-bot repo)
**Analogs found:** 13 with a real analog / 16 total (3 genuinely new — FastAPI app entry, systemd unit, pydantic model)

> This phase spans **two repos** (D-05/D-06). Both are checked out locally and were read directly:
> - **Website repo** (`Coding/Website`) — static Astro half: per-editor pages, directory, block renderer, `editors.json`.
> - **nocturna-bot repo** (`Coding/nocturna-bot`) — backend half: FastAPI admin app + reused `core/` transport + role-loss cog.
>
> Analog file paths below are **repo-relative**; the repo is named in each row/section.

---

## File Classification

### Website repo (static Astro — this checkout)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/pages/[lang]/editores/[slug].astro` (NEW) | route/page | request-response (build-time) | `src/pages/[lang]/[page].astro` + `staticPathsForConcept` | role-match (no per-item route exists yet) |
| `src/components/editor-blocks/BlockRenderer.astro` + per-block `*.astro` (NEW) | component | transform (block list → markup) | `src/components/ProductCard.astro`; block-map in `GalleryPage.astro` L110-151 | role-match |
| `src/components/sections/EditorsDirectory.astro` (NEW, D-20) | component/section | CRUD (read list → grid) | `src/components/sections/StorePage.astro` | exact |
| `src/data/editors.json` (NEW, D-18) | config/data | file-I/O (commit target) | `src/data/gallery.json` (array) · `src/data/store.json` (object+`_comment`) | exact |
| `src/i18n/routes.ts` (MODIFIED) | config/utility | — | itself (add `editors` concept + per-slug path helper) | exact |
| `src/pages/[lang]/[page].astro` (MODIFIED, D-20 directory) | route | request-response | itself (add `editors` concept branch) | exact |
| `src/components/Nav.astro` (MODIFIED, D-20 link) | component | — | itself (`navConcepts` map) | exact |
| `src/i18n/pages.json` (MODIFIED — editor/directory copy) | config/i18n | — | `src/i18n/pages.json` (`galeria`/`tienda` slices) | exact |

### nocturna-bot repo (admin backend — sibling checkout)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `core/github_publish.py` (MODIFIED — add `sync_editors()`) | service | file-I/O (cross-repo commit) | `_sync_store_sync` L569 + `_commit_with_retry` L292 | exact |
| `core/editors_model.py` (NEW — pydantic block/link schema) | model | transform/validation | `core/store_sync.py::STAFF_OWNED` tuple (partial) | partial |
| `app/main.py` (NEW — FastAPI app, SessionMiddleware, routes) | controller/route | request-response | none in repo (first web surface) | **no analog** |
| `app/auth.py` (NEW — Authlib OAuth2 + bot-token role check) | middleware/auth | request-response | `cogs/gallery.py::_is_staff` L41 + `config.ROLE_MODERATOR_ID` | role-match |
| `app/deps.py` (NEW — `require_editor()` ownership gate) | middleware | request-response | `cogs/gallery.py::_is_staff` L41 | role-match |
| `cogs/editors.py` (NEW — `on_member_update` unpublish + `/mi-pagina`) | cog/event-driven | event-driven | `cogs/gallery.py` (cog class + `on_raw_reaction_add` L124 + `setup()` L521) | role-match |
| `core/image_optimize.py` (REUSED verbatim — D-17 uploads) | utility | transform | itself — `optimize_to_webp` L30 | exact (no change) |
| `deploy/nocturna-editor-admin.service` (NEW systemd unit) | config | — | none in repo | **no analog** |

---

## Pattern Assignments

### `src/pages/[lang]/editores/[slug].astro` (route/page, build-time)  — WEBSITE

**Analog:** `src/pages/[lang]/[page].astro` (the singleton concept resolver) + `staticPathsForConcept` in `src/i18n/routes.ts`.

> **No per-item dynamic route exists on the site yet.** Every current page is a *concept singleton* (one page per concept × 2 langs). The editor page is the site's first **per-item × per-lang** route (editors × langs), so `getStaticPaths` must produce the **cartesian product**, not a fixed concept list. Adapt the pattern below — do not copy it verbatim.

**getStaticPaths pattern to adapt** (`[lang]/[page].astro` L32-39 emits per-concept; editor route emits per-editor×lang):
```astro
export function getStaticPaths() {
  return [
    ...staticPathsForConcept('services'),
    ...staticPathsForConcept('gallery'),
    ...staticPathsForConcept('store'),
    ...staticPathsForConcept('terms'),
  ];
}
```
For editors, mirror `staticPathsForConcept`'s shape (`routes.ts` L69-75) but nest over the `editors.json` array:
```ts
// new helper in routes.ts, mirroring staticPathsForConcept
langCodes.flatMap((lang) =>
  editors.filter(e => e.published).map((e) => ({
    params: { lang, slug: e.slug }, props: { editor: e },
  })),
);
```

**Lang narrowing + dict access pattern** (`[lang]/[page].astro` L41-45):
```astro
const lang = toLang(Astro.params.lang);
const slug = Astro.params.page ?? '';
const pages = useTranslations(lang, 'pages');
```

**BaseLayout wrapping pattern** (`[lang]/[page].astro` L60-63) — chrome (Nav/Footer/grain) is inherited; the page only supplies `lang`/`title`/`description` + body:
```astro
<BaseLayout lang={lang} title={meta.title} description={meta.description}>
  {concept === 'gallery' && <GalleryPage lang={lang} />}
</BaseLayout>
```

---

### `src/components/editor-blocks/BlockRenderer.astro` (+ per-block components) (component, transform)  — WEBSITE

**Analog:** `src/components/ProductCard.astro` (self-contained typed card with scoped `<style>`) for each block; the **type→markup map** idiom from `GalleryPage.astro`.

**Closed-union render map** (research Pattern 3 — no `set:html` ever). Model the `BlockRenderer` on the inline decision map in `GalleryPage.astro` L122-135 (`holdFor(entry) === 'pin' ? … : …`), generalized to `block.type`:
```astro
---
import BioBlock from './BioBlock.astro';
import LinksBlock from './LinksBlock.astro';
import PortfolioBlock from './PortfolioBlock.astro';
// ...
const { block, lang } = Astro.props;
---
{block.type === 'bio' && <BioBlock block={block} lang={lang} />}
{block.type === 'links' && <LinksBlock block={block} lang={lang} />}
{block.type === 'portfolio' && <PortfolioBlock block={block} lang={lang} slug={slug} />}
{block.type === 'divider' && <hr class="editor-divider" />}
```

**Per-block component shape** — copy `ProductCard.astro`'s structure: a typed `interface Props`, destructure `Astro.props`, render through `{...}` auto-escaping only, scoped `<style>` using brand tokens (`var(--color-ink-raised)`, `var(--color-border)`, `var(--color-red)`, `var(--font-display)`, `var(--font-mono)` — see `ProductCard.astro` L114-315). Brand tokens come from `src/styles/theme.css` (Tailwind v4 `@theme`).

**Auto-escape / XSS discipline** (`ProductCard.astro` header L14-16, `GalleryPage.astro` L16-19) — the load-bearing rule for D-02 safety: untrusted block text is only ever an escaped `{expr}` or an attribute value, **never** `set:html`.

---

### `src/components/sections/EditorsDirectory.astro` (component/section, CRUD)  — WEBSITE

**Analog:** `src/components/sections/StorePage.astro` — near-exact fit (read a data array → defensive filter/sort → grid of cards → branded `EmptyState` fallback).

**Data read + defensive pipeline** (`StorePage.astro` L22-23, L68-83) — `editors.json` is a bot/admin-app write target, so apply the same "never throw on one bad entry" discipline (copy before sort, filter structural minimum, per-field fallback):
```astro
import editorsData from '../../data/editors.json';
const editors = ([...(editorsData as Editor[])])
  .filter(e => e.published && typeof e.slug === 'string')
  .sort((a, b) => String(a.name).localeCompare(String(b.name)));
```

**Grid + EmptyState fallback** (`StorePage.astro` L139-164) — copy the `entries.length ? <grid> : <EmptyState>` shape so an empty `editors.json` never looks broken and the Discord CTA stays reachable:
```astro
{editors.length ? (
  <div class="editor-grid">
    {editors.map((e) => (
      <a href={localizedPath('editor', lang, e.slug)} class="editor-directory-card">…</a>
    ))}
  </div>
) : (
  <EmptyState heading={page.emptyHeading} body={page.emptyBody} ticketLabel={page.emptyCta} />
)}
```

**Directory card** — model the individual listing on `ProductCard.astro` (avatar image + name + tagline), simplified to a link (not a quick-view button).

**Section chrome** (`StorePage.astro` L127-137) — reuse `<NightBackground fixed />` + `.section section-page-top section--rule` + `.section-header` block for visual consistency with store/gallery.

---

### `src/data/editors.json` (config/data, file-I/O)  — WEBSITE

**Analog:** `src/data/gallery.json` (flat array — D-18 says mirror it) and `src/data/store.json` (object-with-`_comment` staff-doc idiom).

- **Shape:** top-level **array** of editor objects (D-18), mirroring `gallery.json`/`reviews.json`. Ship committed as `[]` so builds never break (research Open Q4 — same as every prior data file).
- **Per-entry schema** (research Pattern 3 proposed shape): `slug`, `discordId`, `published`, `name`, `avatar`, `tagline{es,en}`, `links[]{label,url}`, `blocks[]{type,…}`.
- **Bilingual field idiom** — copy `store.json`'s `{es,en}` per-locale objects (see `StorePage.astro` `StoreProduct` interface L31-51) for `tagline` and any block text; resolve with the `p.name?.[lang] ?? p.name?.es ?? p.name?.en ?? ''` fallback chain (`StorePage.astro` L86-87).
- **`_comment` staff doc** — if the admin app is the sole writer, a `_comment` is optional; the array shape (D-18) takes precedence over store's object shape.

---

### `src/i18n/routes.ts` (config/utility — MODIFIED)  — WEBSITE

**Analog:** itself. Register the directory as a new **concept** and add a **per-item path helper** (new shape — current helpers are concept-only).

**Add the directory concept** (extend `PageConcept` L17, `routeSlugs` L20-26, `navConcepts` L29):
```ts
export type PageConcept = 'home' | 'services' | 'gallery' | 'store' | 'terms' | 'editors';
// routeSlugs: editors: { es: 'editores', en: 'editors' },
// navConcepts: [..., 'editors']   // D-20 discoverability
```
The directory page then rides the existing `[lang]/[page].astro` resolver via `staticPathsForConcept('editors')` (add to L32-39 there) — no new page file for the directory.

**Add a per-editor path helper** (new — mirrors `localizedPath` L32-35 but takes a slug):
```ts
export function editorPath(slug: string, lang: Lang): string {
  return `/${lang}/${routeSlugs.editors[lang]}/${slug}`;  // /en/editors/aria · /es/editores/aria
}
```
Extend `conceptForSlug`/`translatePath` (L41-62) if the per-editor pages need language-switch support (map `/en/editors/<slug>` ↔ `/es/editores/<slug>` by carrying the slug through).

---

### `src/components/Nav.astro` (component — MODIFIED, D-20)  — WEBSITE

**Analog:** itself. The nav auto-derives links from `navConcepts` (L26-36), so adding `'editors'` to `navConcepts` + a `conceptLabels.editors` entry (L26-32) + a `t.navEditors` string is the whole change — **no new markup**:
```astro
const conceptLabels: Record<(typeof navConcepts)[number], string> = {
  home: t.navHome, services: t.navServices, gallery: t.navGallery,
  store: t.navStore, terms: t.navTerms, editors: t.navEditors,  // NEW
};
```
Requires adding `navEditors` to `src/i18n/nav.json` (both locales).

---

### `core/github_publish.py` — add `sync_editors()` (service, file-I/O)  — NOCTURNA-BOT

**Analog:** `_sync_store_sync` (L569-634) + the generic `_commit_with_retry` core (L292-330). This is a near-exact fit — `store.json` is the closest existing write target (object with a staff-owned key set; the editor case is simpler — a whole-array upsert).

**Generic retryable commit core to plug into** (`github_publish.py` L292-330) — re-fetches `current` each attempt and calls `build_tree(current)` so concurrent saves **merge, never clobber** (research Pitfall 6):
```python
def _commit_with_retry(repo, branch, message, build_tree, fetch=None):
    fetch = fetch or (lambda: _fetch_gallery(repo, branch))
    for attempt in range(_MAX_ATTEMPTS):
        parent_sha = _fetch_parent_sha(repo, branch)
        base_tree_sha = _fetch_base_tree_sha(repo, parent_sha)
        current = fetch()                     # freshly fetched each attempt
        tree_entries = build_tree(current)    # upsert-by-discordId here
        new_tree_sha = _create_tree(repo, base_tree_sha, tree_entries)
        commit_sha = _create_commit(repo, message, new_tree_sha, parent_sha)
        resp = _update_ref(repo, branch, commit_sha)
        if _ok(resp): return commit_sha
        # 409/422 stale-ref → exponential backoff + rebuild (L320-325)
```

**`build_tree` upsert pattern to copy** (`_sync_store_sync` L609-629) — the store's re-graft-by-`checkoutUrl` is the exact template for editor upsert-by-`discordId`; note it committed **image blobs + JSON in ONE tree** (D-17 avatar/block uploads need this):
```python
def build_tree(cur):
    # cur is the FRESH editors array; upsert THIS editor by discordId, keep others.
    others = [e for e in cur if e.get("discordId") != entry["discordId"]]
    updated = others + [entry]
    return [{"path": editors_path, "mode": _MODE, "type": "blob",
             "content": _serialize_json(updated)}]  # + image blob entries in same list
commit_sha = _commit_with_retry(repo, branch, msg, build_tree,
    fetch=lambda: _fetch_json(repo, branch, editors_path))
```
`_serialize_json` (L288, alias of `_serialize_gallery` L280-282) = `json.dumps(array, ensure_ascii=False, indent=2)` — reuse verbatim (keeps ES/EN text readable). New `.env` keys mirror `WEBSITE_STORE_JSON`/`WEBSITE_STORE_IMAGE_DIR` (`config.py` L111-114): add `WEBSITE_EDITORS_JSON` (`src/data/editors.json`) + `WEBSITE_EDITORS_IMAGE_DIR` (`public/editors`).

**Off-loop invocation** — `sync_store` is `async def` wrapping the blocking `requests` transport via a thread (see L762); in FastAPI use `run_in_threadpool` instead of `asyncio.to_thread`.

---

### `core/image_optimize.py` — REUSED verbatim (utility, transform)  — NOCTURNA-BOT

**Analog:** itself — `optimize_to_webp(raw) -> (webp_bytes, w, h)` (L30-57). Reuse **unchanged** for D-17 avatar/block uploads. It already: downscales to 1920px long edge, re-encodes WebP (drops EXIF/GPS metadata — no `exif=` on save), and keeps Pillow's `MAX_IMAGE_PIXELS` bomb guard (L13, L40-57). Research Pitfall 3 additions the *admin app* must add around it (not in this module): byte-size cap before read, **reject SVG**, commit only the re-encoded bytes.

---

### `cogs/editors.py` (cog/event-driven — NEW, D-10)  — NOCTURNA-BOT

**Analog:** `cogs/gallery.py` — the cog class shape, event-listener idiom, role gate, and `setup()`.

**Cog + event-listener + role-gate skeleton** (`gallery.py` `on_raw_reaction_add` L124-133; `_is_staff` L41-47; `setup` L521):
```python
def _is_staff(member) -> bool:                     # gallery.py L41-47 — reuse verbatim
    role_ids = {r.id for r in getattr(member, "roles", [])}
    return bool(role_ids & set(config.GALLERY_STAFF_ROLE_IDS))

class EditorsCog(commands.Cog):
    @commands.Cog.listener()
    async def on_member_update(self, before, after):
        # D-10: role lost → auto-unpublish. ROLE_MODERATOR_ID is the editor role (D-15).
        had = config.ROLE_MODERATOR_ID in {r.id for r in before.roles}
        has = config.ROLE_MODERATOR_ID in {r.id for r in after.roles}
        if had and not has:
            await unpublish_editor_by_discord_id(after.id)   # → github_publish

async def setup(bot):                              # gallery.py L521 idiom
    await bot.add_cog(EditorsCog(bot))
```
Optional `/mi-pagina` slash command (DMs the editor their admin link) — model on any existing app-command cog. `on_member_update` needs the `members` privileged intent (research A5/Open Q3) — plan a polling sweep fallback.

---

### `app/auth.py` + `app/deps.py` (middleware/auth — NEW, D-07/D-08)  — NOCTURNA-BOT

**Analog:** `cogs/gallery.py::_is_staff` (L41-47) for the role-membership check idiom; `config.ROLE_MODERATOR_ID` / `config.GUILD_ID` / `config.BOT_TOKEN` (`config.py` L8-15) for the trust-boundary constants.

**Role gate — same trust boundary, OAuth instead of a reaction** (research Pattern 2). The set-intersection check in `_is_staff` is the direct precedent; the admin app reads the *authoritative current* roles via the **bot token** (never the OAuth user token):
```python
r = httpx.get(f"https://discord.com/api/v10/guilds/{config.GUILD_ID}/members/{user_id}",
              headers={"Authorization": f"Bot {config.BOT_TOKEN}"})
if config.ROLE_MODERATOR_ID not in [int(x) for x in r.json().get("roles", [])]:
    raise HTTPException(403)
```
`require_editor()` (`deps.py`) resolves identity **only from the signed session**, never the request body (research Pitfall 1 / D-08 IDOR). Re-run the role check on each write (Pitfall 2). See research "Code Examples" for the `require_editor` + `SessionMiddleware` shape.

---

### `app/main.py` (controller/route — NEW)  — NOCTURNA-BOT · **NO ANALOG**

No web-app entry point exists in either repo — this is the project's first HTTP surface. Follow **RESEARCH.md** (Standard Stack + Architecture Patterns + Code Examples): FastAPI app, `SessionMiddleware` (signed httpOnly `SameSite=Lax` cookie, short TTL), Authlib OAuth2 routes, Jinja2 + Alpine.js + SortableJS templates, uvicorn bound to `127.0.0.1` behind Caddy/nginx. Reuse `core.github_publish`, `core.image_optimize`, `config` by **direct import** (same venv). No codebase analog to copy — this is genuinely new code confined to OAuth login + ownership-scoped session + block editor UI.

---

## Shared Patterns

### i18n dictionary access (all website components)
**Source:** `src/i18n/ui.ts` (`useTranslations`, `toLang`, `type Lang` L28-54)
**Apply to:** every new `.astro` file (editor page, directory, block components)
```astro
import { useTranslations, type Lang } from '../../i18n/ui';
const { lang } = Astro.props;   // Props: { lang: Lang }
const page = useTranslations(lang, 'pages').tienda;   // never hard-code strings
```
Add a new `editores`/`editors` slice to `src/i18n/pages.json` (both locales) mirroring the existing `galeria`/`tienda` slices (tag/title/subtitle/emptyHeading/emptyBody/emptyCta).

### Central route map — never prefix-swap
**Source:** `src/i18n/routes.ts` (`routeSlugs`, `localizedPath`, `conceptForSlug`, `staticPathsForConcept`)
**Apply to:** the new editor route, the directory concept, Nav, LanguageSwitcher
All URLs derive from `routeSlugs`; translating a page = looking up the *same concept's* slug in the other locale. New per-editor pages need slug-carrying language-switch support (extend `translatePath`).

### Defensive data pipeline (bot/admin-written JSON)
**Source:** `src/components/sections/StorePage.astro` L59-103 (copy-before-sort, filter structural minimum, per-field fallback)
**Apply to:** `EditorsDirectory.astro` and the per-editor page reading `editors.json`
`editors.json` is externally written — one malformed entry must never throw at build time and freeze all deploys (the same build publishes gallery/store). Skip incomplete entries, fall back per-field.

### Auto-escape only — no `set:html`
**Source:** `GalleryPage.astro` L16-19, `ProductCard.astro` L14-16, `StorePage.astro` L10-18
**Apply to:** every editor-block component (D-02 safety guarantee)
Untrusted block/bio/link text renders only as escaped `{expr}` or attribute values. This is what makes the closed-block-union safe without HTML sanitization.

### Cross-repo commit transport (backend writes)
**Source:** `nocturna-bot/core/github_publish.py` — `_commit_with_retry` (L292) + `_sync_store_sync` (L569)
**Apply to:** every admin-app write (save page, upload image, unpublish)
Atomic blobs→tree→commit→ref with stale-ref retry; `build_tree` re-fetches and upserts (by `discordId` for editors) so concurrent saves merge. Reuse by import — do not re-port.

### Staff role gate = the trust boundary (backend auth)
**Source:** `nocturna-bot/cogs/gallery.py::_is_staff` (L41-47) + `config.py` L8-15 (`BOT_TOKEN`, `GUILD_ID`, `ROLE_MODERATOR_ID`)
**Apply to:** `app/auth.py`, `app/deps.py`, `cogs/editors.py`
D-15 reuses the existing `ROLE_MODERATOR_ID` staff role. Same membership-intersection check the whole bot uses, enforced server-side via the bot token in the OAuth app.

---

## No Analog Found

| File | Repo | Role | Reason |
|------|------|------|--------|
| `app/main.py` | nocturna-bot | controller/route | First HTTP surface in the project — no FastAPI/web-app precedent. Follow RESEARCH.md stack + patterns. |
| `deploy/nocturna-editor-admin.service` | nocturna-bot | config | No systemd unit committed in-repo (bot runs via an uncommitted unit on `cinema`). Follow RESEARCH.md deploy section + host confirmation (A3). |
| `core/editors_model.py` | nocturna-bot | model | No pydantic model in the repo (bot is discord.py, not FastAPI). Closest is `store_sync.py::STAFF_OWNED` (a field allowlist tuple), which informs *which fields the transport owns* but is not a schema. Build the closed block-type union per RESEARCH Pattern 3. |

---

## Metadata

**Analog search scope:**
- Website repo: `src/pages/`, `src/components/`, `src/components/sections/`, `src/data/`, `src/i18n/`, `src/styles/`
- nocturna-bot repo: `core/`, `cogs/`, `config.py`

**Files scanned (read directly):** `[lang]/[page].astro`, `routes.ts`, `ui.ts`, `GalleryPage.astro`, `StorePage.astro`, `ProductCard.astro`, `Nav.astro`, `gallery.json`/`store.json`/`reviews.json` (shape), `config.py`, `image_optimize.py`, `github_publish.py` (L280-330, L569-648), `cogs/gallery.py` (L124-193)

**Pattern extraction date:** 2026-07-14
