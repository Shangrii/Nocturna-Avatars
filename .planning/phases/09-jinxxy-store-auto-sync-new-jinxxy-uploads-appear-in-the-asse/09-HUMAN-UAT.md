---
status: partial
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
source: [09-VERIFICATION.md]
started: 2026-07-11T15:05:00Z
updated: 2026-07-11T15:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Live end-to-end sync on the cinema host

Run a real `/tienda sync` (or wait for the poll) against the live Jinxxy Creator API with a real `products_read` key on the cinema host, and confirm `store.json` commits + the announce embed posts correctly end-to-end.

**Precondition:** the cinema host still runs pre-09-11 code — `git pull` + systemd restart is required first to pick up bot commits `901d902`/`cf91348`.

expected: New/changed/removed Jinxxy products propagate to `src/data/store.json` on the deployed site within one poll cycle or an immediate `/tienda sync`, and the Discord announce embed renders correctly in `JINXXY_ANNOUNCE_CHANNEL_ID`
result: [pending]

### 2. /tienda medios attach flow renders on the deployed site

Attach real images + description via `/tienda medios` to a freshly-synced product and confirm the card renders correctly on the deployed site (thumbnail, description, no layout shift).

expected: The product card shows the staff-uploaded WebP images and bilingual description instead of the branded placeholder, with no broken links or images
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
