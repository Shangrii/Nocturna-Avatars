---
created: 2026-07-18T09:17:09.742Z
title: Editor page shows ES/EN toggle but only English renders
area: ui
files:
  - src/pages/e/[slug].astro
---

## Problem

UAT of Phase 10.1 (2026-07-18) found that the guns.lol-style editor page (`/e/<slug>`) still shows "español"/"inglés" text-box controls in the theme editor, but the published page only ever renders one language (English) regardless of selection.

**Decided (2026-07-18):** `/e/<slug>` pages are NOT meant to be bilingual anymore — Phase 10.1's standalone-identity-per-editor redesign made the ES/EN toggle obsolete. This is a cleanup, not a bilingual-rendering fix.

## Solution

**INVESTIGATED (2026-07-18) — the confusing ES/EN inputs live in the ADMIN APP, not this repo.** Findings on the website side:

- The editor page (`src/pages/e/[slug].astro`) is already single-language by design (D-13): one page per editor, rendered in `editor.lang`. The top-level `Editor` fields (`tagline`, etc.) are already plain strings.
- BUT the block content schema is still bilingual: `EditorBlock` variants `bio`/`heading`/`text`/`quote` and `PortfolioExtra.caption` are typed `Bilingual {es,en}` (`src/lib/editorTypes.ts:38-46`). Each block component resolves `block.text?.[lang] ?? .es ?? .en` (BioBlock:18, QuoteBlock:19, PortfolioBlock:115), so the PAGE renders correctly (single language w/ fallback) — nothing is visibly broken on the site.
- Real bilingual block data still exists in `editors.json` (e.g. lines 67-68, 129-130).

So the website render is NOT broken. The dual "español"/"inglés" text boxes the user sees are in the **admin theme/block editor app** on the `cinema` host — a SEPARATE repo (alongside `nocturna-bot`), NOT in this workspace. That is where the cleanup must happen.

**DONE (2026-07-18) — both repos, verified, legacy-tolerant. Only a manual cinema redeploy remains.**

Website repo (`Coding/Website`):
- `src/lib/editorTypes.ts`: removed `Bilingual`; block `text`/`caption` → `string`.
- new `src/lib/editorText.ts`: `blockText(value, lang)` helper (string, or collapses a legacy `{es,en}` — prefers `lang`, then es, then en).
- BioBlock/HeadingBlock/TextBlock/QuoteBlock/PortfolioBlock → use `blockText`.
- `src/data/editors.json`: 2 quote blocks migrated to single strings (shangri=en, impyh=es).
- `astro build` green; verified both editor pages render the migrated quotes.

Bot repo (`Coding/nocturna-bot`):
- `core/editors_model.py`: `Locale` removed; block text/caption use `BlockText = Annotated[str, BeforeValidator(...)]` (collapses a legacy `{es,en}` on input, no 422 during rollout).
- `app/templates/editor.html`: dual ES/EN inputs → single field; portfolio caption single; dropped the preview ES/EN toggle + orphan `loc()`/`lang` state; `asLoc`→`asText` (legacy-tolerant).
- `app/main.py`: new-editor seed tagline `{es,en}` → `""`.
- tests updated; `pytest` 562 pass (3 FAILS are PRE-EXISTING and unrelated — see below).

**REMAINING — manual, user-owned:** redeploy the admin app to the `cinema` host (`git pull` + restart the FastAPI service) so it serves the single-field template + new model. Until then the website already renders correctly (legacy-tolerant); after deploy, new saves write single strings. Deploy order does not matter (both sides tolerate the legacy shape).

**Pre-existing bot test failures (NOT caused by this work, worth a separate todo):**
- `test_app_editor.py::test_save_valid_body_...` and `::test_save_ignores_body_supplied_discord_id_and_slug` — their `fake_sync` mocks predate the real `sync_editors(..., prune=False)` param (github_publish.py:1128). Stale mocks, not a prod bug.
- `test_editors_model.py::test_editor_page_rejects_unknown_badge` — stale after badges were loosened to free-text (`_badges_free_text`).
