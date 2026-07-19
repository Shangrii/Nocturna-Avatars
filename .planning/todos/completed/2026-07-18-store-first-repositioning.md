---
created: 2026-07-18T09:17:09.742Z
title: Reposition site messaging from commissions-first to store-first
area: content
files:
  - src/components/Nav.astro
  - src/i18n/nav.json
  - src/i18n/home.json
  - src/pages/[lang]/index.astro
  - src/components/DiscordModal.astro
  - src/components/sections/About.astro
  - src/components/sections/PackagesSummary.astro
  - src/components/sections/StorePage.astro
---

## Problem

UAT feedback (2026-07-18): Nocturna's business focus has shifted — asset/product sales (the store) are now the primary offering, with custom commission services (the old "Servicios"/packages) secondary. Several pieces of copy and layout still read commissions-first from the original Phase 1-3 build:

1. The Discord ticket modal (`DiscordModal.astro`) is written entirely around commissioning avatar work — doesn't mention the store.
2. Navbar label "Servicios" should read "Comisiones" (to disambiguate from the store).
3. Hero CTAs below the title read "Open a Ticket" / "View Packages" — should become "View Store" / "View Commissions" (store leads).
4. The landing's "Our Story" section (`About.astro`) should be removed. Candidate replacement: a small store-teaser section, positioned ABOVE "Our Packages" (`PackagesSummary.astro`) in `[lang]/index.astro`'s section order (currently Hero → FeaturedGallery → About → PackagesSummary → Reviews).
5. New ask: light "glitch" UI sound effects on button/nav-link presses, to extend the site's existing glitch visual identity into audio.

## Solution

TBD — this is a coherent scope (messaging pivot + landing reorder + new SFX system), likely deserves its own phase (`/gsd:discuss-phase`) rather than one-off edits, since it touches copy in two languages, a section reorder, and a new interaction-feedback system with open design questions (which sounds, how loud, respects `prefers-reduced-motion`/mute state?).
