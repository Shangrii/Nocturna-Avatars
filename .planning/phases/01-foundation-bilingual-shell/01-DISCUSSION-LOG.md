# Phase 1: Foundation & Bilingual Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 1-Foundation & Bilingual Shell
**Areas discussed:** i18n URL strategy, Language detection, Launch strategy, Landing & content fidelity

---

## i18n URL strategy

| Option | Description | Selected |
|--------|-------------|----------|
| ES at root + EN prefixed | Spanish at `/`, `/servicios`; English at `/en/...`. Preserves current URLs/SEO. | |
| Both prefixed (`/es/` and `/en/`) | Symmetric; root redirects. Easier future flip to EN-primary; changes current URLs. | ✓ |
| You decide | Defer to Claude per SEO/transition plan. | |

**User's choice:** Both prefixed (`/es/` and `/en/`)
**Notes:** Accepted that current unprefixed URLs change → Claude adds legacy→`/es/` redirects to preserve SEO/links. ES stays the default/fallback.

---

## Language detection

| Option | Description | Selected |
|--------|-------------|----------|
| ES default + manual switch, remembers choice | Everyone lands in ES; switch to EN manually; preference remembered. | |
| Auto-detect browser + redirect | English browsers land directly in EN. | ✓ |

**User's choice:** Auto-detect browser + redirect
**Notes:** Root `/` detects language and redirects. Claude's discretion folded in: remember the visitor's manual override so detection only applies to the first un-chosen visit; switcher preserves the current page.

---

## Launch strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Branch + preview, cutover at end | Live site untouched on production; build Astro on a `revamp` branch with preview; switch Pages at parity. | ✓ |
| Build in main, replace at parity | Single branch, simpler, but live site/history mixed during migration. | |

**User's choice:** Branch + preview, cutover at end
**Notes:** Zero risk to production during the multi-phase build. CNAME must survive the cutover.

---

## Landing & content fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Restructure landing + polish copy, faithful data | Re-compose landing for the experiential redesign; refine marketing copy; keep hard data (prices, features, Terms) faithful. | ✓ |
| Keep current order + verbatim copy | Same sections/text; minimal change. | |

**User's choice:** Restructure landing + polish copy, faithful data
**Notes:** Landing becomes a curated summary linking to dedicated pages. Fix known typo ("dolor de cabezar"→"dolor de cabeza"). EN Terms = Claude draft, flagged for the user's later human/legal review.

---

## Claude's Discretion

- Astro project layout, i18n implementation mechanism (content collections vs JSON dictionaries), GitHub Actions deploy specifics, responsive breakpoints.
- Static asset convention (`public/` vs `src/assets`); brand-token carry-over from `styles.css`; `A Another Tag` scale bump (display/accents only).
- Nav model for multi-page (page links + Discord CTA).

## Deferred Ideas

- 3D viewer (Three.js), music player, gallery filters → v2.
- Motion/animation → Phase 2. Data-driven catalog/gallery → Phases 3–4. Bot → Phase 5.
