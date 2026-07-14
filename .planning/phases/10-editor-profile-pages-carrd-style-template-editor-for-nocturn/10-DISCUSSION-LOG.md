# Phase 10: Editor Profile Pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 10-editor-profile-pages-carrd-style-template-editor-for-nocturn
**Areas discussed:** Page content & template, Creation & edit flow, Identity/URLs & directory, Access control & moderation

---

## Page content & template

| Option | Description | Selected |
|--------|-------------|----------|
| Carrd-style link/bio card | Minimal: name, avatar, tagline, bio, links, commission-status badge | |
| + Auto-pulled portfolio | Same, plus a portfolio grid auto-populated from gallery/store `editor` credits | ✓ |
| + Manually curated portfolio | Editor manually uploads work samples via bot command | |

**User's choice:** Auto-pulled portfolio.

| Option | Description | Selected |
|--------|-------------|----------|
| One fixed template | Everyone shares the same layout/colors | |
| Limited theme choices | Small preset list (accent color, avatar frame) | |
| Freeform (true carrd-like) | Editor picks background/colors/layout blocks — a real mini page-builder | ✓ |

**User's choice:** Freeform (true carrd-like).
**Notes:** This choice created a real tension: "freeform" implies a visual builder, but the project's constraint (bot-only editing, no live preview surface) doesn't support that. Follow-up question below resolved it.

**Commission/availability status:** No — routes through the existing "Abrir Ticket" CTA.
**External/social links:** Multiple custom (label, url) pairs, editor-managed.

### Follow-up: how does "freeform" work without a live web editor?

| Option | Description | Selected |
|--------|-------------|----------|
| Modular blocks | Ordered list of typed blocks (bio, links, portfolio, quote, image...) via bot commands, rendered by fixed components | (superseded, see below) |
| Blocks + brand-constrained styling | Same, plus per-block color/background from the brand palette | (superseded, see below) |
| Raw custom CSS/HTML | True freedom, high XSS/moderation risk, no live preview | |

**User's response (free text, not a listed option):** *"I think we hit a wall here, so it'd be convenient to add Discord OAuth to the page or bot or some type of login to access certain parts of the page, we can't do everything with the bot, it is also needing an admin page or authentication login for the cardds."*
**Notes:** This is the pivot point of the whole discussion — the user recognized Discord modals can't carry a real block/page-builder UX and proposed OAuth + a web admin page directly, rather than picking from the three offered options. This reframed "Creation & edit flow" before that area was formally reached.

### Follow-up: where does the OAuth backend live (public site must stay static, PLAT-02)?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin app on the bot's existing host | Web app on "cinema" (same systemd host as nocturna-bot), commits to repo like the bot does | ✓ |
| Serverless OAuth (Cloudflare Workers) | Free-tier serverless function handles OAuth + commit, separate from bot host | |
| Stay bot-only, drop OAuth | Revert to Discord-command-only editing | |

**User's choice:** Admin app on the bot's existing host.

Remaining Page content & template questions (all in follow-up rounds):

| Question | Selected answer |
|---|---|
| Bot's role vs. web app's role | Web app does everything; bot's role is optional (e.g. DM the admin link) |
| Portfolio auto-pull: store only, or gallery too? | Add editor-credit to `gallery.json` too (bigger footprint, touches the gallery cog) |
| Avatar/image upload mechanism | Via the web admin app (upload widget → optimize → commit), not Discord attachment |
| Manual portfolio items beyond auto-pull? | Yes — a hand-populatable portfolio block alongside auto-pulled items |
| Who sets the new gallery.json editor-credit field? | Extend the existing gallery ✅ approve flow (no separate command) |
| Live preview while block-editing? | Yes — live/near-live preview |
| NSFW items in the portfolio? | No — profiles are SFW-only, NSFW items excluded entirely (not blurred) |
| Staff review before a page goes live? | No — publishes immediately on editor save |

---

## Creation & edit flow

| Question | Selected answer |
|---|---|
| Login method | Discord OAuth + a live guild role check (not a manual allowlist) |
| Can staff/admins edit another editor's page? | No — own page only, no admin override |
| First-login behavior | Auto-creates an empty draft page (no staff provisioning step) |
| What happens when an editor loses the editor role? | Auto-unpublish on next sync |

---

## Identity, URLs & directory

| Question | Selected answer |
|---|---|
| Data schema | One `editors.json` array (mirrors gallery.json/reviews.json), not one file per editor |
| Slug/URL scheme | Derived from Discord username on first login, staff-editable; `/es/editores/<slug>` · `/en/editors/<slug>` |
| Public directory page? | Yes — a public `/editores` directory listing all editors |
| How does the portfolio auto-pull match store.json's free-text `editor` field? | Match by exact slug — `editor` field values must BE the slug going forward (re-tags existing free text) |

---

## Access control & moderation

| Question | Selected answer |
|---|---|
| Which Discord role counts as "editor"? | Reuse the existing moderator/staff role (no new dedicated role) |
| Can an editor self-unpublish their own page? Can links point anywhere? | Yes to both — self-unpublish allowed; links accept any https:// URL, no allowlist |

---

## Claude's Discretion

- Exact block-type list beyond bio/links/portfolio/quote/image/divider.
- Whether per-block brand-constrained color/background options ship in v1 or defer.
- Technical shape/stack of the admin app and how it reuses vs. ports the bot's GitHub commit transport.
- Mechanism for role-change detection driving auto-unpublish (poll vs. webhook vs. periodic check).

## Deferred Ideas

None — the discussion stayed within phase scope throughout; the auth-app architecture is a HOW decision, not a new capability beyond what was asked.

**Reviewed but not folded:** `2026-07-07-jinxxy-auto-sync-to-asset-store.md` (low-confidence todo match, 0.2 — already fully implemented in Phase 9, correctly excluded).
