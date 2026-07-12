---
status: diagnosed
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
source: [09-VERIFICATION.md]
started: 2026-07-11T15:05:00Z
updated: 2026-07-11T16:30:00Z
---

## Current Test

[complete — user tested live on 2026-07-11]

## Tests

### 1. Live end-to-end sync on the cinema host

Run a real `/tienda sync` (or wait for the poll) against the live Jinxxy Creator API with a real `products_read` key on the cinema host, and confirm `store.json` commits + the announce embed posts correctly end-to-end.

expected: New/changed/removed Jinxxy products propagate to `src/data/store.json` on the deployed site within one poll cycle or an immediate `/tienda sync`, and the Discord announce embed renders correctly in `JINXXY_ANNOUNCE_CHANNEL_ID`
result: passed — user confirmed "Todo bien"; sync + announce work end-to-end

### 2. /tienda medios attach flow renders on the deployed site

Attach real images + description via `/tienda medios` to a freshly-synced product and confirm the card renders correctly on the deployed site (thumbnail, description, no layout shift).

expected: The product card shows the staff-uploaded WebP images and bilingual description instead of the branded placeholder, with no broken links or images
result: passed — user confirmed; two improvement gaps surfaced (below)

## Summary

total: 2
passed: 2
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

### GAP-1: No Discord command to set a product's `editor` (author/credited creator)
status: failed
severity: minor

The `store.json` schema includes `editor` ("credited creator, plain text") but the Discord surface only lets staff attach `images[]` + `description{es,en}` via `/tienda medios`. Staff cannot set or change the credited author from Discord — it requires a JSON hand-edit, which the phase promised to avoid. Need a staff-gated command path (e.g. extend `/tienda medios` or a `/tienda editar` option) that sets `editor` for a synced product and commits it via the object-aware transport, respecting the D-12 field-ownership merge (editor must become/stay a staff-owned field so the Jinxxy sync never clobbers it).

### GAP-2: Announce embed is generic Spanish text — must be English, engaging, and visual
status: failed
severity: minor

The current announce embed is `title="Tienda actualizada"` with ES bucket labels ("🆕 Nuevos", "✏️ Actualizados", "🗑️ Quitados") and footer "Nocturna · tienda" (`cogs/jinxxy.py::_announce`). The announce channel is PUBLIC and the target audience is now American/English — the bot (cachorabot) must announce in ENGLISH with engaging copy, e.g. "There's a new product on our webpage! Make sure to check it out". **User decision 2026-07-11: this overrides D-05's Spanish-first for store announcements.**

It must also be more visual, not plain text: include the store page link, the product link(s) (each product's `checkoutUrl` and/or the website store URL), and imagery where available (e.g. product thumbnail from `images[0]` once attached) so the embed looks appealing in a public channel.
