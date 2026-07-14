# Phase 10: Editor Profile Pages - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

A carrd/guns.lol-style **profile page per Nocturna editor** (staff member who does avatar-editing work), publicly reachable on the website, built freeform via a block system. Editing happens through a **new Discord-OAuth-gated web admin app** (not pure Discord bot commands — see D-05/D-06, a mid-discussion pivot from the original bot-only sketch). Only the owning editor can edit their own page. Publishes to the website repo the same way the bot does today (cross-repo commit), so the public site itself stays 100% static.

This is a genuinely new mechanic for the project: every prior bot-driven feature (gallery, reviews, store, reminders) is Discord-command-driven with no web auth surface. This phase introduces the project's first authenticated web interface.

</domain>

<decisions>
## Implementation Decisions

### Page content & template
- **D-01:** Each page has core bio fields (name, avatar, tagline/bio) + multiple custom (label, url) social/external links, editor-managed. No commission/availability status badge — contact still routes through the site's existing "Abrir Ticket" Discord CTA.
- **D-02:** Pages are built from a **modular block system** (bio, links, portfolio grid, quote, image, divider, etc.) — editor adds/removes/reorders/edits blocks. This is the resolution of "true carrd-like freeform": NOT raw CSS/HTML (XSS/moderation risk, no live preview mechanism), but a fixed Astro component library rendering an ordered, editor-defined block list. Extend with brand-constrained per-block styling (colors within the red/navy/off-white + accent palette) if scope allows — full arbitrary theming is out.
- **D-03:** A **portfolio block** auto-pulls work credited to the editor from `store.json` (existing `editor` field, Phase 9) and `gallery.json` (**new** `editor` field this phase adds — see D-11). Editors can ALSO hand-populate additional custom portfolio/work-sample items in the same block (auto-pulled items aren't the only source).
- **D-04:** NSFW-flagged portfolio items (store products marked `nsfw`, or NSFW gallery photos) are **excluded entirely** from the auto-pulled portfolio — profile pages are SFW-only, no blur/gate needed (unlike the store).
- **D-11:** `gallery.json` gets a new `editor` (credited creator) field, mirroring the Phase 9 store field. It's assigned by **extending the existing gallery ✅ approve flow** (captured at approval time) — no separate reassignment command in this phase's baseline scope.
- **D-12:** Matching a credited work item to an `editors.json` entry is by **exact slug** — the `editor` field's value (in both `store.json` and the new `gallery.json` field) must BE the editor's slug going forward. Staff set it via slug-autocomplete on `/tienda editar` (existing) and the extended gallery approve flow (D-11). This re-tags any existing free-text `editor` values in `store.json`.
- **D-13:** A new/edited page **publishes immediately** on editor save — no staff ✅ approval gate. Access is already restricted to verified editors via Discord OAuth + role check, so the extra gallery/reviews-style review step is redundant here.
- **D-14:** The admin app shows a **live/near-live preview** while an editor arranges blocks — worth the extra build cost for a page-builder-style tool.

### Creation & edit flow (the auth pivot)
- **D-05 (PIVOT — locks project architecture beyond this phase):** Editing happens through a **new authenticated web admin app**, not Discord slash commands/modals. Rationale surfaced mid-discussion: true block-based freeform editing (reordering, live preview, image upload with a real UI) doesn't fit Discord's modal constraints (max 5 fields, no drag-reorder). The bot's only remaining role is optional — e.g. a slash command that DMs the editor their admin-page link.
- **D-06:** The OAuth/admin backend lives **on the bot's existing always-on host ("cinema", same systemd host as `nocturna-bot`)** — NOT a new serverless service, NOT bot-only. It commits to the website repo the same way the bot does (reuses or ports the `core/github_publish.py`-style GitHub Data API transport). **The public website stays 100% static on GitHub Pages — PLAT-02 is unaffected.** This is a new, separate editor-only tool alongside the bot, not a change to site hosting.
- **D-07:** Login is **Discord OAuth2 + a live guild role check** (admin app verifies the editor role via the bot token/API at login) — same trust boundary as every other staff-gated feature in this project, just enforced via OAuth instead of a slash-command gate.
- **D-08:** An editor can **only ever edit their own page** — 1:1 Discord ID → page, no staff/admin override to edit someone else's page. Matches the original hard requirement ("only Nocturna's own editors can create/edit these pages") literally.
- **D-09:** First login **auto-creates an empty draft page** for any Discord user holding the editor role — no separate staff provisioning step.
- **D-10:** When an editor loses the editor role, their page is **auto-unpublished on next sync** (periodic check / role-change detection) — not left live indefinitely.
- **D-15:** The editor role for admin-app access **reuses the existing moderator/staff role** (same one gating gallery/reviews/store) — no new dedicated Discord role created in this phase.
- **D-16:** Editors **can self-unpublish** their own page at any time (not just staff, not just via offboarding). Custom link URLs accept **any `https://` URL**, no domain allowlist — trusts verified editors, consistent with how the site already trusts staff-entered URLs (e.g. store `storefronts`).
- **D-17:** Avatar and block images are uploaded **through the web admin app** (standard file-upload widget, optimized, committed to the repo — e.g. `public/editors/<slug>/`) — not via Discord attachment/bot command. This keeps the whole editing surface in one place (D-05).

### Identity, URLs & directory
- **D-18:** Data schema is **one `editors.json` array**, mirroring `gallery.json`/`reviews.json` — each element holds `slug`, `name`, `avatar`, `blocks[]`, `links[]`, etc. Not one file per editor.
- **D-19:** Slug is **derived from the editor's Discord username on first login**, staff-editable afterward if needed. Routes: `/es/editores/<slug>` · `/en/editors/<slug>`.
- **D-20:** A **public `/editores` (`/editors`) directory page** lists all published editors (avatar + name + tagline, linking to each profile) — reachable from nav or the about/team area. Without it, individual pages would be undiscoverable/orphaned.

### Claude's Discretion
- Exact block type list beyond the ones named in discussion (bio, links, portfolio grid, quote, image, divider) — researcher/planner can propose a reasonable initial set.
- Whether per-block brand-constrained color/background options ship in this phase's v1 or are deferred — discussion left this as "if scope allows" (see D-02).
- Technical shape of the admin app (framework/stack) hosted on the `cinema` host, and how it reuses vs. ports the bot's GitHub commit transport — a technical/architecture call for research + planning, not a vision decision.
- Exact mechanism for role-change detection driving D-10 auto-unpublish (polling vs. webhook vs. periodic bot-side check).

### Folded Todos
- **`2026-07-07-carrd-style-template-editor-for-nocturna-editors.md`** — "Carrd-style template editor for Nocturna editors" (2026-07-07). Original problem: the user wants a carrd/guns.lol-style template/profile page per Nocturna editor, restricted so only that editor can create/edit their own. This todo's rough sketch (bot commands → JSON → per-editor page, gallery-model) was the starting point for this discussion; it evolved into the D-05/D-06 web-admin-app architecture once the "freeform" requirement proved incompatible with Discord-modal-only editing.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase origin
- `.planning/todos/pending/2026-07-07-carrd-style-template-editor-for-nocturna-editors.md` — the original problem statement and rough gallery-model sketch this phase is based on (see Folded Todos above)

### Prior bot-driven publishing pipelines (pattern to extend, not replace)
- `.planning/phases/09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse/09-CONTEXT.md` — the `editor` (credited creator) field added to `store.json` in Phase 9-12; this phase's D-03/D-11/D-12 build directly on it
- `.planning/phases/05-photo-publishing-bot-cog/05-CONTEXT.md` — the cross-repo GitHub Data API commit transport (`core/github_publish.py` in `nocturna-bot`) this phase's admin app reuses/ports for D-06
- `.planning/phases/07-reviews-publishing-pipeline-discord-reviews-channel-to-websi/07-CONTEXT.md` — staff-role-gate pattern (`*_STAFF_ROLE_IDS`) this phase's D-07/D-15 mirror via OAuth instead of a slash-command gate

### Data schemas this phase touches
- `src/data/store.json` — existing `editor` field (currently free plain text) that D-12 changes to require exact-slug matching
- `src/data/gallery.json` — gets the new `editor` field per D-11

### Project constraints (unaffected but load-bearing for D-06)
- `CLAUDE.md` — "Tech stack: Astro (static output) — must stay deployable to GitHub Pages and preserve the CNAME/domain" and "Hosting/Cost: free static hosting; no backend/DB. The bot publishes by committing to the repo." — D-06 places the new OAuth backend on the bot's existing host specifically to keep these constraints intact for the *public site*.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/[lang]/[page].astro` — singleton "concept" resolver (terms, store, etc.) used for all current dedicated pages. **Does NOT fit this phase** — editor pages are per-item (one route per editor), a new dynamic-routing shape the site doesn't have yet (closest existing per-item UI is the store's quick-view modal, not a full page).
- `src/i18n/routes.ts` — central route map pattern; the new `/es/editores/<slug>` · `/en/editors/<slug>` routes should register here alongside the existing bilingual route entries.
- `src/data/{gallery,reviews,store}.json` + their bot-side `core/github_publish.py` transport (in `nocturna-bot`) — the direct precedent for `editors.json`'s array-of-entries shape and cross-repo commit mechanism (D-18, D-06).
- Phase 9's `editor` field + `/tienda editar` slug-autocomplete pattern (09-12) — direct precedent for D-12's exact-slug matching and D-11's gallery-side equivalent.

### Established Patterns
- NSFW blur/gate pattern on the store (`nsfw: true` → blurred card) — explicitly NOT reused here (D-04: profiles are SFW-only, items excluded rather than blurred).
- Staff-role Discord gating (`*_STAFF_ROLE_IDS` config, role-membership check before any write) — the trust-boundary pattern D-07/D-15 carry into OAuth-based access instead of a slash-command check.

### Integration Points
- Nav / about-team area needs a link to the new `/editores` directory (D-20).
- The gallery bot cog's ✅ approve flow (`cogs/gallery.py` in `nocturna-bot`) needs extending to capture editor credit (D-11) — touches an already-live, frequently-modified cog.
- `nocturna-bot`'s existing GitHub PAT / cross-repo commit setup is the natural reuse target for the new admin app's write path (D-06) — whether it's literally the same process or a sibling service on the same host is a planning-time call.

</code_context>

<specifics>
## Specific Ideas

- Reference points named directly by the user/prior todo: **carrd.co** and **guns.lol** — link-in-bio / creator-profile tools. The block-system resolution (D-02) is meant to approximate that experience within this project's safety constraints (no raw HTML/CSS).
- The auth pivot (D-05) was explicitly the user's own proposal mid-discussion: *"it'd be convenient to add Discord OAuth to the page or bot or some type of login to access certain parts of the page, we can't do everything with the bot, it is also needing an admin page or authentication login for the cards"* — i.e., they recognized Discord slash commands/modals can't carry a real page-builder UX and asked for OAuth + an admin page directly.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (the auth-app architecture is a HOW decision within this phase, not a new capability added beyond it).

### Reviewed Todos (not folded)
- **`2026-07-07-jinxxy-auto-sync-to-asset-store.md`** — matched at low confidence (0.2, keyword "phase" only) during todo cross-reference. Not relevant: this was already fully implemented and completed in Phase 9. Reviewed and correctly excluded.

</deferred>

---

*Phase: 10-editor-profile-pages-carrd-style-template-editor-for-nocturn*
*Context gathered: 2026-07-14*
