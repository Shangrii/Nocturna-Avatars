---
created: 2026-07-07T06:11:37.885Z
title: Carrd-style template editor for Nocturna editors
area: bot
files: []
---

## Problem

Pre-Phase-6 feedback (2026-07-07): the user wants a template/profile-page editor in the style of commission-artist tools like carrd or guns.lol, so each Nocturna editor (staff member) can have their own page/card. Hard requirement: **only Nocturna's own editors can create/edit these pages** — access must be restricted to them.

This is a large feature and its home is undecided: it could be bot-driven (editors configure via Discord commands, bot commits JSON to the website repo — matching the gallery model, which keeps the "no backend" constraint) or something else. The static-hosting/no-backend constraint rules out a live web editor with auth unless a new approach is chosen.

## Solution

TBD — needs its own brainstorm/phase. Sketch of the gallery-model approach:
- Bot command(s) in nocturna-bot, gated to the editor role, letting each editor set their template fields (name, avatar, portfolio links, styles, etc.).
- Bot publishes `editors.json` (or one file per editor) to the website repo via the existing `core/github_publish.py` transport.
- Website renders a page per editor from that data, styled like carrd/guns.lol profile cards.
Auth question ("asegurarse que sólo ellos puedan hacerlas") is naturally solved by Discord role gating if the bot is the write path.
