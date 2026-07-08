# Phase 7: Reviews Publishing Pipeline - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Mode:** Autonomous smart discuss — recommended answers auto-accepted (user not present); grounded in the user's recorded preferences from `.planning/todos/pending/2026-07-03-reviews-channel-to-website-publishing-system.md`

<domain>
## Phase Boundary

Client reviews written in the Discord reviews channel (ID `1453534905706221600`) reach the public website as curated testimonials, with zero code changes per review: a `ReviewsCog` in `nocturna-bot` collects and gates reviews (staff-curated, mirroring the Phase-5 gallery pipeline), publishes them to `src/data/reviews.json` in the website repo via the existing `core/github_publish.py` transport, and the website renders a bilingual-aware testimonials section from that file.

In scope: ReviewsCog (collection embed + reaction gate + unpublish + backfill), reviews.json contract, transport reuse/generalization, website testimonials section.
Out of scope (deferred): ticket-close invite embed, bot auto-ticket creation.

</domain>

<decisions>
## Implementation Decisions

### Collection flow (Discord side)
- Staff command posts a collection embed with **2 buttons: "Reseña con nombre" and "Reseña anónima"** (user's 2026-07-07 feedback). Each button opens a Discord modal with a single review text field; on submit the bot posts the review as a formatted bot message in the reviews channel (author display name, or "Anónimo").
- The 2-button embed **complements** the reaction flow (the todo's open question, resolved for lowest friction both ways): plain client messages typed directly in the reviews channel ALSO get the bot's ✅ pending reaction and are publishable the same way.
- **Staff ✅ reaction gates publication** to the site — identical role-gated semantics to `GalleryCog` (`_reaction_by_staff`).
- Published marker 🟢 and visible unpublish control 🌙, message delete → auto-unpublish, ⚠️ failure surface + retry — all mirror gallery semantics (D-05 / 05-05 UX).

### Data contract
- New file `src/data/reviews.json` in the website repo: array of `{ "id": "<discord message id>", "author": "<display name>" | null, "text": "<review text>", "date": "<ISO 8601>" }`. `author: null` means anonymous.
- Transport: reuse `core/github_publish.py`. The module is currently gallery-specific (`_fetch_gallery`, `WEBSITE_GALLERY_JSON`); generalize the JSON-commit path minimally (parametrize target JSON path) WITHOUT changing gallery behavior — or add a thin parallel entry point if generalization risks regression. Planner decides the safer cut.
- Config follows the Phase-5 env pattern in `config.py`: `REVIEWS_CHANNEL_ID` (default `1453534905706221600`), `REVIEWS_STAFF_ROLE_IDS` (default: fall back to `GALLERY_STAFF_ROLE_IDS`), `WEBSITE_REVIEWS_JSON` (default `src/data/reviews.json`).

### Website rendering
- Testimonials section on the **landing page** (social proof adjacent to the conversion path), rendering `reviews.json` at build time like `FeaturedGallery.astro` renders `gallery.json`.
- Review text is user-generated: render **verbatim in its original language** (no translation); section labels/headings localized ES/EN via the existing i18n dictionary system.
- Show the most recent ~8–10 reviews; section renders nothing (or collapses) when `reviews.json` is empty — follow the existing `EmptyState`/conditional-section patterns.
- Visual language: Refined Street Editorial (Phase 2.1 system) — detail governed by the phase UI-SPEC.

### Safety / robustness
- Modal text input capped (~500 chars); reviews rendered as text (Astro escapes by default — no `set:html`).
- `on_ready` backfill + orphan reconcile mirroring `GalleryCog._backfill` / `_reconcile_orphans` so bot restarts converge state.
- No PII beyond Discord display name; anonymous reviews store `author: null` and never leak the submitter's identity into the repo.

### Claude's Discretion
- Exact command name/registration style (prefix vs app command — follow repo conventions in `cogs/`), embed copy (Spanish-first), section heading copy, exact review count cap, and whether generalizing `github_publish.py` vs parallel function is safer.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `nocturna-bot/cogs/gallery.py` — `GalleryCog`: the structural template (on_message pending ✅, on_raw_reaction_add staff gate, _publish/_unpublish, _surface_failure ⚠️, on_raw_message_delete auto-unpublish, on_ready _backfill/_reconcile_orphans, _reaction_by_staff role check).
- `nocturna-bot/core/github_publish.py` — cross-repo commit transport (blob/tree/commit/update-ref with `_commit_with_retry`); currently hardwired to gallery.json in `_fetch_gallery`/`_serialize_gallery`.
- `nocturna-bot/config.py` — env-driven constants pattern (lines 55–70) to extend for reviews.
- Website: `src/components/sections/FeaturedGallery.astro` (build-time JSON import pattern), `EmptyState.astro`, i18n dictionaries, Refined Street Editorial tokens.

### Established Patterns
- Cog conventions: `commands.Cog` subclass, `@commands.Cog.listener()`, `import config`, module `log`, `async def setup(bot)` (documented in gallery.py header, mirrors `cogs/forum.py`).
- Publish pipeline is idempotent + reconciling; failures surface as ⚠️ reaction with retry.
- Website data files are staff-editable JSON in `src/data/` consumed at build time; bot commits trigger the Pages rebuild.

### Integration Points
- Bot: new `cogs/reviews.py` loaded in `bot.py`'s cog list; `config.py` additions; possible `core/github_publish.py` parametrization.
- Website: new `src/components/sections/Reviews*.astro` wired into the landing composition (`src/pages/index.astro` + `[lang]` variants); new `src/data/reviews.json` (committed empty `[]` initially so builds never break).
- Deployment: production bot runs on Linux host "cinema" via systemd — code lands in the `nocturna-bot` repo; the user pulls + restarts the unit manually (same as Phase 5). This is a human deployment step, not phase scope.

</code_context>

<specifics>
## Specific Ideas

- User compared two designs on 2026-07-03 and preferred reaction-based (b) for low client friction; the 2026-07-07 update adds the 2-button (named/anonymous) embed. Resolution here: **embed collects, reaction gates** — both inputs coexist.
- Anonymity is a hard requirement of the 2-button flow: the anonymous path must not expose the client's name anywhere public (site or bot's posted message).

</specifics>

<deferred>
## Deferred Ideas

- Ticket-close invite embed pointing clients to the reviews channel (design (a) companion) — low priority, own quick task later.
- Bot auto-ticket creation (already deferred at milestone level per services-quote-vs-store-cart decision).

</deferred>
