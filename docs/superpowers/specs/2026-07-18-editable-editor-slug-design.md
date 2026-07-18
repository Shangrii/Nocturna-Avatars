# Editable Editor Slug — Design Spec

**Date:** 2026-07-18
**Repos:** `nocturna-bot` (admin app — primary), `Website` (static consumer — mostly unaffected)
**Status:** Approved design, pending spec review → implementation plan.

## Goal

Let a Nocturna editor choose the name of their public page link (`/e/<slug>`) by
typing it in the admin editor, instead of the slug being permanently derived from
their Discord username. The editor can rename at any time; the old link 404s.

## Background — how the slug works today

- **Identity vs. slug are currently the same thing.** The true identity key is
  `discordId` (1:1 per editor in `core/editors_model.py`; `_fetch_current_entry`
  looks entries up by `discordId`). The `slug` is *derived* from the Discord
  username at first login (`app/auth.py`, `normalize_slug` + `_unique_slug`) and
  then **force-set from the session on every save** (`app/main.py::_apply_session_identity`
  overrides `slug`/`discordId` from the trusted session — the D-08 IDOR guard).
- **The slug is also the media folder.** Uploaded images/audio commit to
  `/{mediaDir}/{slug}/<file>` (`app/main.py` upload endpoints, path built from
  `ident["slug"]`), and those absolute URLs are baked into the block data.
- **The website generates pages from `editors.json`.** `src/pages/e/[slug].astro`
  keys each page off `editor.slug`. One editor = one entry, keyed by `discordId`.

## Decisions (locked)

1. **Rename model:** editable **anytime**; the old `/e/<oldslug>` **404s** (no
   redirect). Because the site is generated from `editors.json` and the entry is
   keyed by `discordId`, changing the slug in place means the old slug simply stops
   being generated on the next build — the 404 is automatic, no redirect machinery.
2. **Media keying:** media is keyed by a **stable, immutable per-editor `mediaId`**,
   NOT the slug. Renaming therefore never moves a file or breaks an image URL. This
   removes the entire media-migration problem. Cost accepted: media URLs are opaque
   (`/media/<mediaId>/pic.png`) rather than pretty — irrelevant on a portfolio page.
   *(Rejected alternative: keep media under the slug and physically move files +
   rewrite every block URL on each rename. More code, more failure surface per
   rename, for prettier URLs. Not worth it.)*
3. **View counter:** the per-slug view count **resets on rename** (the counter DB
   keys on slug). Accepted trade of a fresh link; the form notes it.
4. **Validation timing:** slug is validated **on save** (server-side). No live
   availability endpoint this pass (YAGNI — can add the guns.lol green-check later).

## Architecture

### Identity model (`core/editors_model.py`)

- `discordId` stays the immutable identity key — unchanged.
- Add `mediaId: str` — stable, immutable, server-assigned. Seeded once and never
  changed by client input.
- `slug` becomes a **mutable, user-chosen** field (still normalized/validated).

### `mediaId` assignment & backfill

- **New editors** (`app/auth.py` seed): `mediaId = secrets.token_hex(8)` (a random
  16-char token — globally unique by construction, never collides).
- **Existing editors** (shangri, impyh — already have media under `/{mediaDir}/{slug}/`):
  lazy backfill. On the first save under the new code, if the entry has no `mediaId`,
  set `mediaId = <the entry's current slug>`. Their existing image URLs stay valid
  because the folder they already live in *is* that value. This is frozen forever
  after — a later rename does not change it.
- **Collision analysis:** existing↔existing frozen mediaIds equal their currently-unique
  slugs → unique. New editors always get random tokens → never collide with a frozen
  slug-based id or with each other. No collision path exists.

### Save path (`app/main.py`)

`_apply_session_identity(payload, ident, *, published)` changes:

- **Still force `discordId` from the session** (IDOR guard intact — the editor can
  never write another editor's entry).
- **Stop force-setting `slug` from the session.** Instead read the slug from the
  request body, then run it through `resolve_slug()` (below).
- **Force `mediaId`** from the server (the existing entry's `mediaId`, or a freshly
  seeded/backfilled one) — never from the client body.
- After a successful save with a changed slug, **update `request.session["slug"]`**
  so later requests in the same session stay consistent.

`resolve_slug(requested: str, *, self_discord_id: str) -> str` (new helper):

1. `normalize_slug(requested)` → `[a-z0-9-]`, lowercased, length-capped, traversal-safe
   (reuse existing; raises on empty result → 422).
2. Reject if in the **reserved set** → 422. Reserved: `e`, `api`, `static`, `assets`,
   `admin`, `editor`, `editors`, `auth`, `login`, `logout`, `me`, `favicon`.
3. **Uniqueness:** load editors; if any entry with a *different* `discordId` already
   owns this slug → 409 (`"Ese nombre ya está en uso · That name is taken"`). The
   caller's own current slug always passes.

### Media upload endpoints (`app/main.py`)

The three upload handlers currently build the commit path from `ident["slug"]`. Change
them to use the **entry's `mediaId`** (fetched server-side via
`_fetch_current_entry(ident["discord_id"])`, with the lazy backfill applied). The path
`/{mediaDir}/{mediaId}/<file>` is entirely server-derived — never a client value — so
the T-10.1-11-02 / D-08 path-injection guard is preserved.

### Admin form (`app/templates/editor.html`)

- A **"Tu link · Your link"** field: a read-only `…/e/` prefix + an editable slug input
  bound to `page.slug`, live-normalized in JS as the user types (mirror the server
  `normalize_slug` charset so what they see is what saves).
- A short hint: renaming changes your public link; the **old link stops working** and
  the **view count resets**.
- On save, surface the server's 409/422 message inline next to the field.

### Website (`Website`)

- `src/pages/e/[slug].astro` already keys off `editor.slug` → works once the bot writes
  the new slug. **Action:** verify no legacy-route/redirect map pins an old slug; if one
  exists, confirm it doesn't resurrect a renamed-away slug.

## Data flow (rename)

1. Editor types a new slug → Save. Body carries the new slug.
2. `_apply_session_identity` forces `discordId` + `mediaId` from server; `resolve_slug`
   normalizes + checks reserved + checks uniqueness (excluding self).
3. On pass: the editor's single `editors.json` entry (keyed by `discordId`) is written
   with the new `slug`; `mediaId` unchanged; media files untouched.
4. `core/github_publish.py` commits `editors.json` to the site repo → site rebuilds →
   `/e/<newslug>` generated, `/e/<oldslug>` no longer generated (404).
5. Session slug updated so the editor's next request is consistent.
6. On fail: 409/422 returned; nothing committed; form shows the message.

## Error handling

| Case | Result |
|------|--------|
| Empty/all-invalid-chars slug | 422, "Elige un nombre válido (letras, números, guiones)" |
| Reserved word | 422, "Ese nombre está reservado" |
| Taken by another editor | 409, "Ese nombre ya está en uso · That name is taken" |
| Unchanged slug (same as own) | passes, no-op |
| Malformed body | existing validation path (unchanged) |

## Security

- **IDOR guard intact:** `discordId` is still force-set from the session; a client can
  never write to another editor's entry.
- **Slug validation is now load-bearing** (it used to be safe by being session-derived).
  All three gates — normalize/traversal, reserved, uniqueness — run server-side on
  every save. The uniqueness check is what prevents one editor from hijacking another's
  live `/e/<slug>`.
- **Media path stays server-controlled:** the commit path uses the server-side
  `mediaId`, never a client-supplied slug/path.

## Testing

- `resolve_slug`: normalizes; rejects empty, reserved, and traversal (`../`) inputs;
  rejects a slug owned by another `discordId`; accepts the caller's own current slug;
  accepts a free slug.
- `mediaId`: new seed is a fresh token; lazy backfill sets it to the current slug when
  absent and never overwrites an existing value; a rename leaves `mediaId` unchanged.
- Save: body slug is honored (not overridden by session); `discordId`/`mediaId` are
  forced from server even if the body lies; session slug updates after a rename.
- Media endpoints: commit path uses `mediaId`, unaffected by a slug change.

## Out of scope

- Redirects from old slugs (decision 1 — old link 404s).
- Live availability check as-you-type (decision 4).
- Preserving the view count across a rename (decision 3).
- Auto-deploy of the admin service (tracked separately).
