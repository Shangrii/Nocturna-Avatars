---
created: 2026-07-18T08:25:00.000Z
title: Editor page link/slug should be a custom typed name, not the Discord name
area: bot
files:
  - ../nocturna-bot/app/auth.py
  - ../nocturna-bot/app/main.py
  - ../nocturna-bot/core/editors_model.py
  - ../nocturna-bot/app/templates/editor.html
---

## Problem

User request (2026-07-18, mid store-first execution): the guns.lol-style editor page URL
(`/e/<slug>`) should be changeable — the editor should be able to type the name/handle
they want for their link, instead of the slug being locked to their Discord username.

## Context / why it's non-trivial (needs its own brainstorm)

- Today the slug is derived from Discord identity and FORCED from the SESSION on every
  save, not taken from the request body — this is the D-08 IDOR guard
  (`app/main.py::_apply_session_identity` overrides `slug`/`discordId` from the session;
  `app/auth.py` seeds the entry with a `normalize_slug` of the Discord identity). The
  slug currently doubles as part of the trusted identity/commit-path key.
- Making the slug user-editable means it can no longer BE the identity key. The true key
  must stay `discordId` (already the 1:1 key in `editors_model.py`), and the slug becomes
  a separate, user-chosen, mutable field that must be:
  1. validated/normalized (`normalize_slug`, `[a-z0-9-]`, no traversal — already exists),
  2. UNIQUE across editors (collision check — two editors can't claim the same `/e/<slug>`),
  3. safe as a commit/filesystem path (it already flows into `core/github_publish.py`
     paths — the normalization guard must stay),
  4. handled on RENAME: changing a slug renames the published page — old `/e/<oldslug>`
     should redirect or be cleaned up, and the editor's committed media dir path may move.
- Website side: `src/pages/e/[slug].astro` already keys pages off `editor.slug` from
  `editors.json`, so it mostly "just works" once the bot writes the new slug — but any
  old-slug redirect (10.1 had legacy-route redirects) needs revisiting.

## Solution

TBD — deserves its own brainstorm/spec. Sketch: add a `slug` text field to the admin
editor form (`editor.html`), keep `discordId` as the immutable identity key, add a
server-side uniqueness check + normalization on save, and decide the rename story
(redirect old slug vs. hard cutover + media-dir move). Security review required (the slug
stops being session-forced, so the uniqueness + normalization gates become load-bearing).
