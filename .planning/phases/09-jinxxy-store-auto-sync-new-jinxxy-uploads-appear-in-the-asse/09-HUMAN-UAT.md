---
status: partial
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
source: [09-VERIFICATION.md]
started: 2026-07-11T15:05:00Z
updated: 2026-07-14T04:39:24Z
---

## Current Test

[awaiting human testing — Test 3 below]

## Tests

### 1. Live end-to-end sync on the cinema host

Run a real `/tienda sync` (or wait for the poll) against the live Jinxxy Creator API with a real `products_read` key on the cinema host, and confirm `store.json` commits + the announce embed posts correctly end-to-end.

expected: New/changed/removed Jinxxy products propagate to `src/data/store.json` on the deployed site within one poll cycle or an immediate `/tienda sync`, and the Discord announce embed renders correctly in `JINXXY_ANNOUNCE_CHANNEL_ID`
result: passed — user confirmed "Todo bien"; sync + announce work end-to-end

### 2. /tienda medios attach flow renders on the deployed site

Attach real images + description via `/tienda medios` to a freshly-synced product and confirm the card renders correctly on the deployed site (thumbnail, description, no layout shift).

expected: The product card shows the staff-uploaded WebP images and bilingual description instead of the branded placeholder, with no broken links or images
result: passed — user confirmed; two improvement gaps surfaced (below)

### 3. Live deploy of the gap-closure + review-fix code to the cinema production host

Deploy commits `a9d1a7b`..`3b1b29b` to the cinema production bot host (`git pull` + systemd restart `nocturna-bot`), then confirm in the live Discord guild: (a) `/tienda editar` appears in the command list with working product autocomplete and successfully sets an `editor` credit end-to-end, and (b) a real store change posts the new English/visual announce embed (title/description matching added-vs-updated-vs-removed, store link, per-product links, thumbnail when available) to `JINXXY_ANNOUNCE_CHANNEL_ID`.

expected: `/tienda editar` is usable end-to-end in the live guild; the announce embed renders English copy correct for the type of change, the store link, per-product links, and (when applicable) a thumbnail — matching the unit-tested behavior confirmed in 09-VERIFICATION.md's re-verification pass (13/13 truths).
result: pending

## Summary

total: 3
passed: 2
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

### GAP-1: No Discord command to set a product's `editor` (author/credited creator)
status: resolved
severity: minor

The `store.json` schema includes `editor` ("credited creator, plain text") but the Discord surface only lets staff attach `images[]` + `description{es,en}` via `/tienda medios`. Staff cannot set or change the credited author from Discord — it requires a JSON hand-edit, which the phase promised to avoid. Need a staff-gated command path (e.g. extend `/tienda medios` or a `/tienda editar` option) that sets `editor` for a synced product and commits it via the object-aware transport, respecting the D-12 field-ownership merge (editor must become/stay a staff-owned field so the Jinxxy sync never clobbers it).

**Resolved by plan 09-12** (`/tienda editar` command + `set_store_editor` transport, nocturna-bot commits `a9d1a7b`..`1530706`) — confirmed by code review and 09-VERIFICATION.md re-verification (13/13). Awaiting live-guild confirmation (Test 3 above).

### GAP-2: Announce embed is generic Spanish text — must be English, engaging, and visual
status: resolved
severity: minor

The current announce embed is `title="Tienda actualizada"` with ES bucket labels ("🆕 Nuevos", "✏️ Actualizados", "🗑️ Quitados") and footer "Nocturna · tienda" (`cogs/jinxxy.py::_announce`). The announce channel is PUBLIC and the target audience is now American/English — the bot (cachorabot) must announce in ENGLISH with engaging copy, e.g. "There's a new product on our webpage! Make sure to check it out". **User decision 2026-07-11: this overrides D-05's Spanish-first for store announcements.**

It must also be more visual, not plain text: include the store page link, the product link(s) (each product's `checkoutUrl` and/or the website store URL), and imagery where available (e.g. product thumbnail from `images[0]` once attached) so the embed looks appealing in a public channel.

**Resolved by plan 09-13** (English/engaging/visual `_build_announce_embed` rewrite, nocturna-bot commits `ba31f71`..`4aebadb`), with 5 additional defects found by 09-13-REVIEW.md's code review (false "New" headline on update/removal-only cycles, unrelated-product thumbnail leakage, mid-markdown-link truncation, `/tienda editar` claiming a rebuild on a no-op, Unicode BIDI/format chars not rejected) all fixed (commits `927e7ca`..`3b1b29b`) and confirmed by 09-VERIFICATION.md re-verification (13/13). Awaiting live-guild confirmation (Test 3 above).
