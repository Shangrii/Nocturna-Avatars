---
created: 2026-07-07T22:45:00.000Z
title: Jinxxy auto-sync — new Jinxxy uploads appear in the asset store automatically
area: automation
files:
  - src/data/store.json
---

## Problem

Phase 6 checkpoint feedback (2026-07-07): the user wants that when staff upload a product to Jinxxy, it also shows up in the website's asset store automatically — today `src/data/store.json` is edited by hand (staff-editable JSON committed to the repo).

Phase 6 already covers *purchase* linking (every product has a `checkoutUrl` to Jinxxy; quick-view and cart link out per-product), but NOT *catalog* sync from Jinxxy.

## Solution

An automation that mirrors the gallery pipeline: something (bot cog in `nocturna-bot`, or a scheduled GitHub Action) reads the Jinxxy storefront (API/scrape/manual command) and commits updated `store.json` entries to the website repo via PAT/deploy key — same cross-repo publish pattern as the Discord photo cog. Needs research: whether Jinxxy exposes an API or feed. Deserves its own phase/discussion.
