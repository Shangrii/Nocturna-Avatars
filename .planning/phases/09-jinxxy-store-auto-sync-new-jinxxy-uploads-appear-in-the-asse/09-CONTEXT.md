# Phase 9: Jinxxy Store Auto-Sync - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

The website's asset store catalog (`src/data/store.json`) stays synchronized with Nocturna's Jinxxy storefront automatically: a **JinxxyCog** in the `nocturna-bot` repo reads the store via the **Jinxxy Creator API** on a schedule (plus a manual staff `/sync` command), and commits catalog changes to the website repo through the existing cross-repo publish transport. New Jinxxy uploads appear on the web store, price/image changes propagate, and delisted products are removed — a **full mirror**, with staff hand-edits in `store.json` protected by a field-ownership merge model. Staff never edit JSON for anything Jinxxy already knows.

In scope: JinxxyCog (poll loop + `/sync` command + store-update announcements), Creator API client, field-ownership merge + SQLite snapshot state, cross-repo `store.json` commits, first-run full import with linking of existing entries.
Out of scope: any change to the store UI/components (Phase 6 shipped them; the schema is locked), scraping fallbacks, translation services, sales/webhook notifications.

**Feasibility gate:** this phase is **API or nothing** (D-04). If research finds the Creator API cannot enumerate the storefront's products with the needed fields, the phase pauses for user reconsideration — do NOT build a scraper.

</domain>

<decisions>
## Implementation Decisions

### Sync trigger & mechanism
- **D-01:** The sync lives as a **bot cog in `nocturna-bot`** (JinxxyCog alongside gallery/reviews) — reuses the cross-repo commit transport (`core/github_publish.py`), the SQLite state idiom (`core/db.py`), and the Phase-8 scheduler precedent. Respects the repo-separation constraint.
- **D-02:** Trigger = **scheduled poll + manual command**: a background loop plus a staff command (e.g. `/sync`) to force an immediate check after uploading.
- **D-03:** Poll interval: **a few times a day (every 6–12h)**. Uploads are infrequent; the manual command covers "I want it now". Keeps Jinxxy requests and Pages rebuilds sparse.
- **D-04:** Data source is the **Jinxxy Creator API only — no scraping fallback**. If the API can't list products, pause the phase and reconsider with the user ("API or nothing").

### Discord reporting
- **D-05:** The bot **only announces store updates** (products added/updated/removed). **Errors are never posted to Discord** — they go to logs only (user explicit: "No quiero que publique errores, quiero que el bot sólo de actualizaciones de la tienda").
- **D-06:** Syncs with no changes are silent. The announcement channel is configurable via env var (e.g. `JINXXY_ANNOUNCE_CHANNEL_ID`); the user decides at deploy time which channel (staff or public) it points to. Announcement embed format is Claude's discretion (branded, Spanish-first, consistent with existing cogs).

### Publish gate & field sourcing
- **D-07:** **Direct publish — no staff approval gate.** Uploading to Jinxxy IS the approval; the product appears on the web store on the next sync. (Deliberate departure from the gallery/reviews ✅ pattern.)
- **D-08:** `nsfw` maps from **Jinxxy's mature-content flag** on the listing (research must confirm the API exposes it). Staff can still hand-correct in `store.json` afterwards.
- **D-09:** `editor` and `category` mapping is **Claude's discretion** — derive from the API where possible, otherwise sensible defaults staff can edit later (grid has no filters yet, so `category` is low-stakes).

### Bilingual gap (D-15 of Phase 6)
- **D-10:** On sync, the Jinxxy listing's name/description is copied **verbatim into BOTH `es` and `en`** — no machine translation, no translation service dependency. Staff polish translations by hand in `store.json` afterwards; the ownership model (D-12) guarantees the sync never overwrites those edits.

### Mirror scope, merge model & first run
- **D-11:** **Full mirror**: new products are added, price/image changes are updated, and products delisted on Jinxxy are removed from the web store automatically.
- **D-12:** **Field ownership + snapshot merge**: the sync only writes fields it owns (price, images, checkoutUrl, nsfw, date …) and only when the Jinxxy value changed vs. the last-synced snapshot (stored in the bot's SQLite). Name/description become staff-owned once edited (three-way compare against the snapshot detects staff edits). `license`, `details`, `updates`, `storefronts`, and `featured` are **100% staff-owned — the sync never touches them**.
- **D-13:** **First run imports the entire Jinxxy storefront**, linking products already present in `store.json` (match by `checkoutUrl`) so nothing duplicates and existing hand-edits survive. The web store is a complete mirror from day one.

### Claude's Discretion
- `editor`/`category` field mapping and defaults (D-09).
- Exact poll interval within 6–12h, `/sync` command name/registration style (follow repo's Spanish app-command conventions).
- Announcement embed design and copy (D-06).
- Exact ownership boundary per field and snapshot/merge implementation (within D-12's guarantees), including how a "staff edited this field" state is detected/stored.
- API-key/env configuration names (`JINXXY_API_KEY` etc.) following `config.py` patterns; commit message format for sync commits.
- Rate-limit/backoff handling for the Creator API.

### Folded Todos
- **`2026-07-07-jinxxy-auto-sync-to-asset-store.md`** — the phase's origin. Problem: staff upload a product to Jinxxy but must hand-edit `store.json` for it to appear on the site; wanted the gallery-pipeline pattern applied to the store catalog. Fully absorbed: this phase delivers the automation (bot cog + Creator API + cross-repo commit). Close the todo when the phase ships.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition & origin
- `.planning/todos/pending/2026-07-07-jinxxy-auto-sync-to-asset-store.md` — the originating request (mirror-the-gallery-pipeline sketch; notes the API-vs-scrape research question, resolved here as API-only per D-04)
- `.planning/phases/06-asset-store/06-CONTEXT.md` — Phase 6 store decisions this phase must respect: locked `store.json` schema (D-13 there), platform-agnostic `checkoutUrl` (D-02), es+en required (D-15), NSFW blur (D-10), Jinxxy platform rationale (D-01)

### Jinxxy platform (external — load-bearing for feasibility gate D-04)
- https://support.jinxxy.com/hc/en-us/articles/28052364650637-How-can-I-access-the-Creator-API — Creator API access. NOTE: Zendesk returns 403 to plain fetches — use a browser user-agent workaround when verifying.
- https://jinxxy.com/about/selling — storefront/seller model context
- Research MUST establish: whether the Creator API lists all products of a store with name, description, price, images, listing URL, and mature-content flag; auth model (API key?); rate limits. This determines D-04's go/no-go.

### Website repo (data contract — read, do not redesign)
- `src/data/store.json` — the live catalog INCLUDING the staff-facing `_comment` documenting the extended schema (optional `license`/`details`/`updates` bilingual sections + `storefronts` array). These extensions are staff-owned fields per D-12.
- `.github/workflows/deploy.yml` — Pages rebuild triggered by commits (each sync commit = one deploy; motivates D-03's sparse interval)

### Bot repo (external — the cog lives HERE; local clone at `../nocturna-bot`)
- `../nocturna-bot/core/github_publish.py` — cross-repo commit transport (blob/tree/commit/update-ref with retry). Phase 7 generalized/reused it for reviews.json; extend the same way for store.json — do not fork a new transport.
- `../nocturna-bot/core/db.py` — SQLite idiom (`CREATE TABLE IF NOT EXISTS`, per-feature `init_*`) — home of the sync snapshot state (D-12)
- `../nocturna-bot/config.py` — env-driven constants pattern (`JINXXY_API_KEY`, `JINXXY_ANNOUNCE_CHANNEL_ID`, poll interval, staff role IDs for `/sync`)
- `../nocturna-bot/cogs/gallery.py` + `../nocturna-bot/cogs/reviews.py` — cog conventions, staff-role gating for the `/sync` command, publish/reconcile philosophy
- `../nocturna-bot/cogs/reminders.py` — the Phase-8 scheduler loop precedent (background loop lifecycle, `cog_unload` cancellation)
- `../nocturna-bot/bot.py` — cog loading list + fail-fast env validation
- `../nocturna-bot/requirements.txt` — pinned deps; any HTTP client addition must be justified (aiohttp likely already present via discord.py)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `core/github_publish.py` (bot) — the proven cross-repo JSON-commit path; Phase 7 already parametrized it beyond gallery.json.
- `core/db.py` (bot) — snapshot/state table home; mirrors `gallery_state`/`reviews_state` cursors.
- Scheduler-loop pattern from `cogs/reminders.py` (Phase 8) — first background loop in the repo; this cog is the second.
- Staff-role gating helpers (`gallery.py`/`reviews.py`) — reuse for the `/sync` command permission check.
- Website side needs **zero component work**: `ProductCard.astro`, `QuickViewModal.astro`, store cart, NSFW blur all consume `store.json` as-is.

### Established Patterns
- Bot commits to `src/data/*.json` → GitHub Pages rebuild → site updates. No backend, ever.
- Bot testing idiom: module-level pure helpers unit-tested with `SimpleNamespace` + `asyncio.run` (no pytest-asyncio). The merge/ownership logic (D-12) and API-response mapping are ideal pure-function territory.
- Spanish-first staff-facing commands and embeds; env-driven config with fail-fast validation.
- Resilience philosophy (Phases 5/7/8): startup reconvergence — on_ready should reconcile snapshot vs. live store.json vs. Jinxxy so restarts converge.

### Integration Points
- New `cogs/jinxxy.py` (or similar) added to `bot.py`'s cog list; new `config.py` entries; new SQLite table via `core/db.py`; `.env` additions on the cinema host documented for the user's manual deploy (git pull + systemd restart — human step, not phase scope).
- Website repo: only `src/data/store.json` is written, by the bot, cross-repo. The schema `_comment` key must survive sync writes (serializer must preserve it).
- `cogs/help.py` (`/ayuda`) may need the new command listed (check during planning).

</code_context>

<specifics>
## Specific Ideas

- The user's framing (2026-07-10, Spanish): "me gustaría que la tienda en la web, el catálogo de productos también se actualice con la tienda de Jinxxy" — the catalog should track the Jinxxy store, not just receive new items. This drove the full-mirror decision (D-11).
- On reporting, verbatim: "No quiero que publique errores, quiero que el bot sólo de actualizaciones de la tienda" — Discord is for store news only; operational noise stays in logs (D-05).
- The user rejected scraping outright ("API or nothing") — feasibility research is the phase's first task, not an afterthought.

</specifics>

<deferred>
## Deferred Ideas

- **Machine translation of listings** (DeepL/LLM) — considered for the bilingual gap, rejected in favor of verbatim copy + hand-polish (D-10). Could revisit if hand-translation becomes a burden.
- **Jinxxy sales/webhook notifications** (sales pings, accounting) — already deferred from Phase 6; still separate from catalog sync.
- **Public "new product" marketing embeds vs staff-only reports** — the channel env var leaves this open; a richer public announcement format could be its own polish task later.

### Reviewed Todos (not folded)
- `2026-07-07-carrd-style-template-editor-for-nocturna-editors.md` — matched on generic keywords only (score 0.2); it is Phase 10's scope.

</deferred>

---

*Phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse*
*Context gathered: 2026-07-10*
