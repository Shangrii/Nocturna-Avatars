# Phase 7: Reviews Publishing Pipeline - Pattern Map

**Mapped:** 2026-07-08
**Files analyzed:** 10 (5 bot repo, 5 website repo)
**Analogs found:** 9 / 10 (1 net-new: Discord Modal has no in-repo analog)

> Spans TWO repos. **Bot repo:** `c:\Users\Shangri\Pictures\Nocturna Avatars\Coding\nocturna-bot`. **Website repo (cwd):** `c:\Users\Shangri\Pictures\Nocturna Avatars\Coding\Website`. All line numbers below are from the files as read on the mapping date.

---

## File Classification

| New/Modified File | Repo | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|------|-----------|----------------|---------------|
| `cogs/reviews.py` | bot | cog / event-driven | event-driven (Discord events → commit) | `cogs/gallery.py` | exact (structural template) |
| `config.py` (additions) | bot | config | — | `config.py` L51–71 (Gallery block) | exact |
| `core/github_publish.py` (parametrize) | bot | service / transport | request-response (GitHub Git Data API) | itself (gallery-specific funcs) | self / generalize |
| `bot.py` (register cog) | bot | config / bootstrap | — | `bot.py` L45 (`load_extension("cogs.gallery")`) | exact |
| `tests/test_reviews_cog.py` | bot | test | — | `tests/test_gallery_cog.py` | exact (exists) |
| `src/data/reviews.json` | web | data / model | file-I/O (build-time import) | `src/data/gallery.json` | role-match (no images) |
| `src/components/sections/Reviews.astro` | web | component / section | transform (JSON → static HTML) | `src/components/sections/FeaturedGallery.astro` | exact |
| `src/i18n/pages.json` (add `reviews` key) | web | config / i18n dict | — | `teaser`/`gallery` keys in `pages.json` | exact |
| `src/pages/[lang]/index.astro` (wire section) | web | route / page | — | `FeaturedGallery` import+placement L13/L88 | exact |
| Reviews CSS (in `sections.css` or new `reviews.css`) | web | style | — | `.cards`/`.card`/`.about-features` idiom in `sections.css` | exact |

**Discord Modal (`ReviewModal`) has NO in-repo analog** — see "No Analog Found" below.

---

## Pattern Assignments

### `cogs/reviews.py` (cog, event-driven) — bot repo

**Analog:** `cogs/gallery.py` (the full structural template; mirror it closely).

**Cog scaffolding / conventions** (`cogs/gallery.py` L18–29, L104–110, L521–522):
```python
import asyncio
import logging
from datetime import timezone

import discord
from discord.ext import commands

import config
from core import db, github_publish

log = logging.getLogger(__name__)

class GalleryCog(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._backfilled = False   # startup reconcile runs once (on_ready can re-fire)
        db.init_gallery_state()    # backfill-cursor table (D-20)
    # ...
async def setup(bot: commands.Bot):
    await bot.add_cog(GalleryCog(bot))
```
Reviews equivalent: `ReviewsCog`, `setup()` adds it; `import config`; module `log`. NOTE the header docstring (L1–16) explicitly says it "Mirrors the repo's cog conventions (`cogs/forum.py`)" — write a matching docstring.

**Staff role gate** — copy the trust boundary verbatim, swapping the role constant (`cogs/gallery.py` L41–47):
```python
def _is_staff(member) -> bool:
    role_ids = {r.id for r in getattr(member, "roles", [])}
    return bool(role_ids & set(config.GALLERY_STAFF_ROLE_IDS))
```
For reviews use `config.REVIEWS_STAFF_ROLE_IDS` (which per CONTEXT falls back to `GALLERY_STAFF_ROLE_IDS`).

**Pending ✅ prompt on plain client message** (`cogs/gallery.py` L112–121) — reviews channel accepts plain typed reviews; add the ✅ pending reaction. Adapt the `on_message` guard: `message.channel.id != config.REVIEWS_CHANNEL_ID`. NOTE divergence: gallery only prompts *staff-authored image* posts; reviews should prompt *client text* posts (do NOT require `_is_staff(message.author)` on the author — a review comes from a client, not staff). Skip bot messages and empty text.

**Staff ✅/🌙 reaction gate (raw event)** — copy structure verbatim (`cogs/gallery.py` L123–150):
```python
@commands.Cog.listener()
async def on_raw_reaction_add(self, payload: discord.RawReactionActionEvent):
    if payload.channel_id != config.PHOTO_CHANNEL_ID:
        return
    if payload.member is None or payload.member.bot:
        return
    if not _is_staff(payload.member):
        return
    emoji = str(payload.emoji)
    if emoji not in ("✅", "🌙"):
        return
    try:
        channel = self.bot.get_channel(payload.channel_id) or \
            await self.bot.fetch_channel(payload.channel_id)
        message = await channel.fetch_message(payload.message_id)
    except discord.HTTPException:
        log.exception("gallery: could not fetch reacted message %s", payload.message_id)
        return
    if emoji == "✅":
        await self._publish(message)
    else:
        await self._unpublish(message)
```

**Published-state derivation (🟢 marker + entry match)** (`cogs/gallery.py` L83–101) — reuse the 🟢-marker idea. For reviews the entry key is the Discord **message id** stored directly as `entry["id"]` (no filename parsing needed — simpler than gallery's `_BOT_FILE_RE`). Reimplement `_is_published` matching on `str(entry.get("id")) == str(message.id)`.

**Publish → commit → 🟢/🌙 markers + auto-deleting reply** (`cogs/gallery.py` L152–223) — mirror the whole flow, minus image optimization. Reviews `_publish` builds one entry `{id, author, text, date}` and calls the reviews transport (see github_publish below). Author resolution: if the review came from the **anonymous button**, `author = None`; if from the **named button** or a plain typed message, `author = message.author.display_name`. The date shape to match gallery (`cogs/gallery.py` L176–177):
```python
date = message.created_at.astimezone(timezone.utc).isoformat(timespec="milliseconds")
date = date.replace("+00:00", "Z")
```

**Unpublish / dismiss (🌙)** (`cogs/gallery.py` L224–267) — mirror: published (has 🟢) → transport remove by id, clear 🟢, mirrored reply; pending (no 🟢) → clear the ✅ prompt, commit nothing.

**Failure surface ⚠️ + retry / clear-warning** (`cogs/gallery.py` L280–311) — copy verbatim; only the Spanish verb strings change.

**Delete → auto-unpublish** (`cogs/gallery.py` L313–338) — copy; swap channel id; call reviews `remove_message(payload.message_id)`.

**on_ready backfill + orphan reconcile** (`cogs/gallery.py` L340–518) — mirror `_backfill`, `_reconcile`, `_reconcile_orphans`, `_resolve_member`, `_reaction_by_staff`. Reconcile-orphan keying is by `entry["id"]` string (simpler than gallery's filename parse). Uses `db.init_gallery_state()` / `db.get_cursor()` / `db.set_cursor()` — check whether a **separate reviews cursor** is needed in `core/db.py` (gallery uses one shared cursor table; a second channel needs its own cursor row/table — flag for planner).

---

### `cogs/reviews.py` — collection embed: 2 Buttons + Modal (Discord side)

**Button/View analog:** `cogs/forum.py` `TypoConfirmView` (L63–87). This is the ONLY `discord.ui` usage in the repo.
```python
class TypoConfirmView(discord.ui.View):
    def __init__(self, author_id: int, timeout: float = 60):
        super().__init__(timeout=timeout)
        # ...
    @discord.ui.button(label="Sí, corregir", style=discord.ButtonStyle.success, emoji="✅")
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        self.accepted = True
        await interaction.response.defer()
        self.stop()
```

**CRITICAL divergences from this analog** the planner must handle:
1. **Persistence.** `TypoConfirmView` is a transient, timed (`timeout=60`) ephemeral view. The reviews collection embed must survive bot restarts, so its View needs `super().__init__(timeout=None)`, each button needs a stable `custom_id=`, and the bot must re-register it via `self.bot.add_view(ReviewCollectView())` in `setup()`/`on_ready` (persistent-view pattern). No in-repo example of a persistent view exists — write from discord.py conventions.
2. **Modal on click.** The button handler must call `await interaction.response.send_modal(ReviewModal(...))` instead of `defer()`. See "No Analog Found" for the Modal itself.
3. **No `interaction_check` author lock** — the collection embed is public; anyone may open it (unlike `TypoConfirmView` which locks to `author_id`).

Button label copy (Spanish-first, per CONTEXT L21): "Reseña con nombre" (named) and "Reseña anónima" (anonymous). Use `discord.ButtonStyle.secondary`/`primary`.

---

### `config.py` additions (bot repo)

**Analog:** the Phase-5 Gallery block (`config.py` L51–71). Extend in the same env-driven idiom:
```python
# ── Galería (Fase 5) ──
PHOTO_CHANNEL_ID = int(os.getenv("PHOTO_CHANNEL_ID", "1416329356426481717"))
GALLERY_STAFF_ROLE_IDS = [
    int(x) for x in os.getenv("GALLERY_STAFF_ROLE_IDS", "").split(",") if x.strip()
]
GITHUB_PAT = os.getenv("GITHUB_PAT", "")
WEBSITE_REPO = os.getenv("WEBSITE_REPO", "Shangrii/Nocturna-Avatars")
WEBSITE_BRANCH = os.getenv("WEBSITE_BRANCH", "revamp")
WEBSITE_GALLERY_JSON = os.getenv("WEBSITE_GALLERY_JSON", "src/data/gallery.json")
WEBSITE_IMAGE_DIR = os.getenv("WEBSITE_IMAGE_DIR", "public/gallery")
```
Add a parallel "Reseñas (Fase 7)" block (per CONTEXT L29):
```python
REVIEWS_CHANNEL_ID = int(os.getenv("REVIEWS_CHANNEL_ID", "1453534905706221600"))
# Fall back to the gallery staff roles when unset (CONTEXT L29).
REVIEWS_STAFF_ROLE_IDS = [
    int(x) for x in os.getenv("REVIEWS_STAFF_ROLE_IDS", "").split(",") if x.strip()
] or GALLERY_STAFF_ROLE_IDS
WEBSITE_REVIEWS_JSON = os.getenv("WEBSITE_REVIEWS_JSON", "src/data/reviews.json")
```
Reuse `GITHUB_PAT` / `WEBSITE_REPO` / `WEBSITE_BRANCH` as-is (same target repo).

---

### `core/github_publish.py` parametrization (bot repo) — THE KEY GENERALIZATION

**Exactly which functions hardcode the gallery path** (planner must decide "parametrize vs parallel thin function"; CONTEXT L28):

| Function | Line(s) | Gallery coupling |
|----------|---------|------------------|
| `_fetch_gallery(repo, branch)` | L151, **L161** | URL built from `config.WEBSITE_GALLERY_JSON`; log labels say "gallery.json". Returns the array. |
| `_serialize_gallery(array)` | L208–210 | Name only; body is generic `json.dumps(array, ensure_ascii=False, indent=2)` — reusable as-is. |
| `_commit_with_retry(...)` | L214–246 | **L225 hardcodes `current = _fetch_gallery(repo, branch)`** — the tightest coupling. The retry core always fetches *gallery* JSON. |
| `_publish_sync(message_id, entries, date)` | L250–300 | L253 `image_dir`, **L254 `gallery_path = config.WEBSITE_GALLERY_JSON`**, L264–279 image-blob loop (gallery-only), L281 commit msg `"gallery: publish ..."`, L283–297 `build_tree` appends gallery entries. |
| `_remove_sync(message_id)` | L303–338 | L306 `image_dir`, **L307 `gallery_path`**, L313–314 filename-derived file list, L318 commit msg, L320–334 `build_tree` (drops entries + `sha:null` file deletes). |
| `publish_message` / `remove_message` (public API) | L342–377 | Signatures are image-tuple shaped (`entries` = webp bytes). |

**Recommended safer cut (planner's call):** reviews have **no image blobs** — the reviews commit is a pure read-modify-write of ONE JSON file. The gallery `_publish_sync` image machinery (blobs, `image_dir`, `sha:null` deletes) does not apply. Two viable approaches:
- **(A) Minimal generalization:** extract a generic `_fetch_json(repo, branch, path)` (parametrize L161's path) and make `_commit_with_retry` take the fetch as a callable (break the L225 coupling), then add slim `publish_review` / `remove_review` public fns whose `build_tree` writes a single `{"path": reviews_path, "content": _serialize_gallery(updated)}` blob. Rename `_serialize_gallery` → `_serialize_json` (pure, safe).
- **(B) Parallel thin path (lowest regression risk):** leave all gallery funcs untouched; add a self-contained `publish_review`/`remove_review` pair + a private `_commit_json(repo, branch, path, message, updater)` that duplicates only the ref→tree→commit→ref dance for a single JSON blob, reusing the existing `_headers`/`_http`/`_create_tree`/`_create_commit`/`_update_ref`/`_commit_lock`/`GitHubPublishError`.

Reuse verbatim regardless of cut: `_headers` (L80–85), `_http` typed-error wrapper (L100–119), `_TIMEOUT` (L64), `_commit_lock` (L69), `GitHubPublishError` (L72), `_create_tree`/`_create_commit`/`_update_ref` (L187–205), and the retry/backoff constants (L57–59). The single-JSON commit `build_tree` (adapted from L283–297) writes one blob via `"content"` (no `sha` blob needed for text):
```python
gallery_entry = {
    "path": gallery_path,
    "mode": _MODE,           # "100644"
    "type": "blob",
    "content": _serialize_gallery(updated),
}
```
Idempotent dedupe pattern to mirror (L288–290, keyed by id not filename for reviews):
```python
kept = [e for e in current if str(e.get("id")) != str(message_id)]
updated = kept + [new_entry]
```

---

### `bot.py` cog registration (bot repo)

**Analog:** `bot.py` L43–46. Add `cogs.reviews` to the load list:
```python
await self.load_extension("cogs.encoding")
await self.load_extension("cogs.forum")
await self.load_extension("cogs.gallery")
await self.load_extension("cogs.help")
```
Also mirror the startup fail-fast validation block (`bot.py` L86–97) — if a `REVIEWS_CHANNEL_ID` / staff-role guard is wanted, add a parallel check. `GITHUB_PAT`/`WEBSITE_REPO` are already validated. NOTE the `members` intent stays OFF (L26–35) — reviews backfill must resolve members via `fetch_member` exactly like gallery (`_resolve_member`).

---

### `tests/test_reviews_cog.py` (bot repo)

**Analog:** `tests/test_gallery_cog.py` and `tests/test_github_publish.py` (both exist). Mirror their structure: pure helpers unit-tested without a running bot, HTTP mocked for the transport. Read them when writing tests.

---

### `src/data/reviews.json` (website repo)

**Analog:** `src/data/gallery.json` (array of objects, 2-space indent, committed to the repo). Reviews contract (CONTEXT L27, UI-SPEC L107):
```json
[]
```
Ship committed as `[]` so builds never break. Each entry: `{ "id": "<discord msg id>", "author": "<display name>" | null, "text": "<review text>", "date": "<ISO 8601>" }`. `author: null` ⇒ anonymous. Matches the transport's `ensure_ascii=False, indent=2` serialization.

---

### `src/components/sections/Reviews.astro` (website repo)

**Analog:** `src/components/sections/FeaturedGallery.astro` (exact — build-time JSON import → sort newest-first → slice → render, localized chrome).

**Frontmatter import + i18n + sort/slice** (`FeaturedGallery.astro` L24–55):
```astro
---
import { useTranslations, type Lang } from '../../i18n/ui';
import galleryData from '../../data/gallery.json';

interface Props { lang: Lang; }
const { lang } = Astro.props;

const head = useTranslations(lang, 'pages').teaser.featured;

const featured = ([...(galleryData as GalleryEntry[])])
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 6);
---
```
Reviews equivalent: `import reviewsData from '../../data/reviews.json'`; `const t = useTranslations(lang, 'pages').reviews`; sort by `date` desc; `.slice(0, 9)` (UI-SPEC L106 — 9 = clean 3×3).

**Section shell + header + conditional render** (`FeaturedGallery.astro` L77–83). NOTE the deliberate divergence (UI-SPEC L113): FeaturedGallery renders an `<EmptyState>` when empty (L132–140); **Reviews renders NOTHING when empty** — early-return the section, do not import `EmptyState`. Pattern:
```astro
{reviews.length >= 1 && (
  <section class="section section--rule" data-reviews>
    <div class="section-header reveal">
      <span class="section-tag">{t.tag}</span>
      <h2 class="section-title">{t.title}</h2>
    </div>
    <!-- grid of <figure> cards -->
  </section>
)}
```

**Card semantics** (UI-SPEC L108/L114): each card = `<figure>` › decorative red quote glyph + `<blockquote>{review.text}</blockquote>` + hairline `.card-divider` + `<figcaption>— {author ?? t.anonymous} · {localizedDate}</figcaption>`. Author fallback via new i18n key. Date via `new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(review.date))` (UI-SPEC L96). Text rendered through Astro auto-escaping ONLY — never `set:html` (CONTEXT L38). Add `.reveal` class (UI-SPEC L111) for the shared GSAP scroll choreography. **No client `<script>`** (unlike FeaturedGallery L150–152).

---

### `src/i18n/pages.json` — add `reviews` key (website repo)

**Analog:** the existing `teaser`/`gallery`/`emptyState` keys (L39–67 ES, L184–212 EN). Registration is automatic — `pages.json` is already imported and typed in `src/i18n/ui.ts` (L10 `import pagesDict`, L39 `pages: pagesDict`); no `ui.ts` change needed, just add the key under both `es` and `en`. Per UI-SPEC L91–95:
```jsonc
// under "es":
"reviews": {
  "tag": "Reseñas",
  "title": "Lo que dicen nuestros clientes",
  "anonymous": "Anónimo"
},
// under "en":
"reviews": {
  "tag": "Reviews",
  "title": "What our clients say",
  "anonymous": "Anonymous"
}
```

---

### `src/pages/[lang]/index.astro` — wire the section (website repo)

**Analog:** the `FeaturedGallery` import + landing composition (`[lang]/index.astro` L13, L82–91). NOTE `src/pages/index.astro` is only the language-redirect shim — the real landing is `src/pages/[lang]/index.astro`. Add:
```astro
import Reviews from '../../components/sections/Reviews.astro';
```
and place `<Reviews lang={lang} />` in the composition. **Placement is Claude's discretion** (UI-SPEC L112) but must preserve the ink↔paper alternation documented at L82–91 (current order: FeaturedGallery ink → About paper → PackagesSummary ink → Teaser gallery paray → closing ink). Choose `.section` vs `.section--surface` by its neighbors; keep `.section--rule` edges.

---

## Shared Patterns

### Staff trust boundary (bot)
**Source:** `cogs/gallery.py` L41–47 (`_is_staff`), gated in `on_raw_reaction_add` L128–133 and reconcile L449–459.
**Apply to:** every publish/unpublish path in `cogs/reviews.py`. Swap `GALLERY_STAFF_ROLE_IDS` → `REVIEWS_STAFF_ROLE_IDS`. Bot/non-staff reactions never trigger a commit; fail-closed on unresolved members.

### Atomic single-JSON commit + typed failure (bot)
**Source:** `core/github_publish.py` — `_commit_with_retry` L214–246, `GitHubPublishError` L72–76, `_http` L100–119, `_commit_lock` L69.
**Apply to:** the reviews transport. One commit = one Pages rebuild; retries/backoff on 409/422; PAT only ever in the `Authorization` header, never logged.

### Idempotent + reconciling publish (bot)
**Source:** `cogs/gallery.py` `_is_published` L83–101, dedupe in transport L288–290, `_reconcile_orphans` L386–420.
**Apply to:** reviews — keyed by `entry["id"] == str(message.id)` (no filename regex). A re-✅ republishes cleanly; a delete or missed-delete reconciles by id.

### Failure UX ⚠️ + retry (bot)
**Source:** `cogs/gallery.py` `_surface_failure` L280–300, `_clear_warning` L302–311.
**Apply to:** reviews publish/unpublish — copy verbatim, change only the Spanish verb ("publicar la reseña" / "quitar la reseña").

### Build-time localized section (web)
**Source:** `FeaturedGallery.astro` L24–55/L77–83 + `useTranslations` (`src/i18n/ui.ts`).
**Apply to:** `Reviews.astro` — JSON import, newest-first sort+slice, localized chrome via `pages.reviews`, Astro auto-escaping for user text (never `set:html`).

### Editorial hairline card grid (web CSS)
**Source:** `src/styles/sections.css` — `.about-features`/`.cards` L99–107 & L280–291, `.card` L295–310, `.card::before` red hover rule L311–326, `.card-divider` L416–421, `.section-header`/`.section-tag`/`.section-title` L13–41, `.section--surface`/`.section--rule` L60–90.
**Apply to:** the Reviews card grid. Reuse the `gap:1px` on `--color-border` idiom, `--color-ink-raised` (ink) / `--color-paper` (paper surface) card fill, 0px radius, hairline border, and the single red accent (`.section-tag` + one quote glyph + optional `::before` scaleX rule). No new tokens/hex/px (UI-SPEC L28).
```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 1px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
}
.card { background: var(--color-ink-raised); padding: var(--space-xl) var(--space-lg); position: relative; }
.card::before { /* hairline red top rule, scaleX(0)→scaleX(1) on hover */ }
```
UI-SPEC L109 asks for `minmax(min(300px,100%),1fr)` for reviews (vs 280px here) — planner may tune within the idiom.

---

## No Analog Found

| File / Unit | Repo | Role | Data Flow | Reason |
|-------------|------|------|-----------|--------|
| `ReviewModal` (`discord.ui.Modal` + `discord.ui.TextInput`) | bot | UI modal | event-driven | The bot repo has **zero** `discord.ui.Modal` usage (only `discord.ui.View` + `@discord.ui.button` in `cogs/forum.py`). The single-field review modal (~500-char cap, CONTEXT L38) must be written from discord.py conventions, not copied. Use `discord.ui.Modal(title=...)`, one `discord.ui.TextInput(style=discord.TextStyle.paragraph, max_length=500)`, and `on_submit` that posts the formatted bot message into the reviews channel (named → `interaction.user.display_name`; anonymous → no name anywhere). |
| Persistent (`timeout=None`) collection View | bot | UI view | event-driven | `cogs/forum.py` views are transient/timed. A restart-surviving collection embed needs `custom_id`s + `bot.add_view(...)` re-registration — pattern exists nowhere in the repo. |
| Reviews backfill cursor in `core/db.py` | bot | store | — | Gallery uses one cursor (`db.init_gallery_state`/`get_cursor`/`set_cursor`). A second watched channel likely needs its own cursor row — verify `core/db.py` and extend; no reviews-specific analog exists yet. |

---

## Metadata

**Analog search scope (bot):** `cogs/` (gallery, forum, meeting, help, encoding), `core/` (github_publish, db), `config.py`, `bot.py`, `tests/`.
**Analog search scope (web):** `src/components/sections/`, `src/components/`, `src/pages/`, `src/i18n/`, `src/data/`, `src/styles/`.
**Files scanned:** ~20 across both repos.
**Pattern extraction date:** 2026-07-08.
