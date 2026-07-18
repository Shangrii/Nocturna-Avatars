---
created: 2026-07-18T09:17:09.742Z
title: Decide Terms & Conditions structure for store vs commissions
area: terms
files:
  - src/components/sections/TermsPage.astro
  - src/i18n/pages.json
---

## Problem

UAT of Phase 01 (2026-07-18): final terms & conditions copy was never finished. Now that the store (product sales) is the primary offering rather than commissions, the user is unsure whether to write per-product terms, or split into "store terms" vs "commission-service terms", or keep one unified document.

## Solution

Recommendation (pending user decision): keep ONE `/terminos` page with two clearly labeled sections — "Compras en la tienda" (digital-goods sale terms: delivery, refund policy, licensing) and "Servicios de comisión" (custom-work terms: scope, revisions, avatar-ban disclaimer already added 2026-07-07) — rather than per-product terms. Per-product terms don't scale (one legal doc per store item to maintain) and there's no product-specific legal variance here; a category split (store vs commission) covers the real difference in transaction type. Deep-link each flow's checkout/quote confirmation to the relevant anchor (`#tienda` / `#comisiones`).
