---
created: 2026-07-03T17:16:25.902Z
title: Reviews channel → website publishing system
area: general
files:
  - nocturna-bot/cogs/gallery.py (pattern to mirror)
  - nocturna-bot/core/github_publish.py (transport to reuse)
  - src/data/gallery.json (contract analog — reviews would get reviews.json)
---

## Problem

Clients leave post-ticket reviews in the Discord reviews channel (ID `1453534905706221600`), but those reviews never reach the website. The user wants them integrated so the site shows real client testimonials, keeping the same "staff curates in Discord, site auto-updates, no code changes" model as the Phase-5 photo gallery.

Two designs were compared (user's own proposal, 2026-07-03):
- (a) Command + button flow: a cachorabot command posts a thank-you embed with a button that pre-fills the review command for the client.
- (b) Reaction-based, mirroring the photos channel: bot adds a reaction to each review message; a staff reaction publishes it to the site.

**User prefers (b)** — less client friction; the client just writes a normal message. Optional add-on: a ticket-close invite embed pointing the client to the reviews channel.

**Update 2026-07-07 (pre-Phase-6 feedback):** the user now describes the collection side as a **staff command that posts an embed with 2 buttons: one for an anonymous review, one for a normal (named) review**. This revises/extends the earlier design-(a)-vs-(b) discussion — the button flow is back, with anonymity as the new requirement. Reconcile in discuss-phase: whether the 2-button embed replaces the reaction-based collection or complements it (e.g. embed collects, staff reaction still gates publication to the site).

## Solution

Candidate future phase (after current milestone work). Sketch:
- New `ReviewsCog` in the nocturna-bot repo, structurally mirroring Phase-5's `GalleryCog`: listen on the reviews channel, bot adds pending reaction, staff-role reaction gate approves.
- Reuse `core/github_publish.py` cross-repo transport as-is; write entries to a `reviews.json` in the website repo (author display name, message text, date) instead of `gallery.json`.
- Website: reviews/testimonials section that renders `reviews.json` (ES/EN aware).
- Same removal/unpublish semantics as gallery (staff reaction to unpublish, delete → auto-unpublish) likely wanted; confirm in discuss-phase.
- Optional: ticket-close invite embed (design a) as a low-priority companion feature.
