---
status: partial
phase: 01-foundation-bilingual-shell
source: [01-VERIFICATION.md]
started: 2026-06-28T16:30:00-06:00
updated: 2026-06-28T16:30:00-06:00
---

## Current Test

Awaiting human go-live: push `revamp` + GitHub Pages Source cutover + custom-domain survival check.

## Tests

### 1. Live deploy + domain survival (go-live)
expected: Push `revamp` → the GitHub Actions "deploy" workflow runs green → set Pages → Build and deployment → Source = "GitHub Actions" → `nocturna-avatars.site` stays bound and serves the new site (public/CNAME reasserts it each deploy; D-09 / PLAT-02 / T-01-02).
result: [pending — user's deliberate go-live action, intentionally deferred]

### 2. Browser language detection
expected: `/` routes Spanish browsers to `/es/` and others to `/en/`; remembered `nocturna-lang` choice overrides on return.
result: passed (user-approved at 01-01 / 01-03 checkpoints)

### 3. Discord modal behavior
expected: all `.dc-trigger` (nav CTA, floating CTA, hero CTA) open the same modal; Esc / backdrop / dismiss close it; "Abrir Discord" → discord.gg/DSMmwU35cs.
result: passed (user-approved at 01-02 checkpoint)

### 4. Mobile responsive layout
expected: no horizontal overflow at ~360px; hamburger drawer with ≥44px targets; floating CTA never covers footer links.
result: passed (user-approved at 01-04 checkpoint)

### 5. ReviewerBanner prominence
expected: prominent "pending legal review" banner on `/en/terms`; absent on `/es/terminos`.
result: passed (user-approved at 01-04 checkpoint)

### 6. Font loading + film-grain
expected: "A Another Tag" graffiti wordmark loads (not fallback); film-grain overlay visible over navy.
result: passed (user-approved at 01-01 checkpoint)

## Summary

total: 6
passed: 5
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

(none — the single pending item is a deferred user go-live action, not a defect)
