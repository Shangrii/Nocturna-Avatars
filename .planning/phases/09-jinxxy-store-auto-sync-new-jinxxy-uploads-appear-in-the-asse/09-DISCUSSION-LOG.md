# Phase 9: Jinxxy Store Auto-Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
**Areas discussed:** Sync trigger & mechanism, Publish gate (auto vs staff ✅), Field mapping & bilingual gap, Updates & removals

---

## Todo Cross-Reference

| Option | Description | Selected |
|--------|-------------|----------|
| Jinxxy auto-sync todo | 2026-07-07-jinxxy-auto-sync-to-asset-store.md — the phase's origin | ✓ (folded) |
| Carrd-style template editor todo | Matched on generic keywords only (0.2); Phase 10 scope | |

---

## Sync trigger & mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Bot cog in nocturna-bot | Reuses github_publish transport, SQLite idiom, Phase-8 scheduler precedent | ✓ |
| GitHub Action in website repo | No bot involvement; secrets in public repo, no Discord UX | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Scheduled poll + manual command | Background poll plus staff /sync to force a check | ✓ |
| Scheduled poll only | Fully hands-off | |
| Manual command only | Staff run /sync after each upload | |

| Option | Description | Selected |
|--------|-------------|----------|
| Every ~30–60 minutes | Within-the-hour appearance | |
| Every ~5–10 minutes | Near-real-time, noisy | |
| A few times a day (6–12h) | Light touch; /sync covers urgency | ✓ |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Scrape the public storefront | Fallback if API can't list products | |
| Staff paste product URL in Discord | Semi-automatic per-product | |
| API or nothing | If Creator API can't list products, pause the phase and reconsider | ✓ |
| You decide | | |

**Notes:** User chose to continue with more questions in this area (reporting behavior below).

| Option | Description | Selected |
|--------|-------------|----------|
| Resumen solo cuando hay cambios | Embed summary only on change; silent otherwise | ✓ |
| Reportar cada sync | Every run posts | |
| Solo errores | | |
| Tú decides | | |

**User's free-text (channel question):** "No quiero que publique errores, quiero que el bot sólo de actualizaciones de la tienda" — errors never posted to Discord (logs only); bot posts store updates only. A follow-up question on audience (staff vs public channel) was declined ("KEEP WORKING") → resolved as env-var-configurable channel, user decides at deploy time.

**Mid-discussion user message:** "Pero me gustaría que la tienda en la web, el catálogo de productos también se actualice con la tienda de Jinxxy" → confirmed full-mirror intent (fed the Updates & removals area).

---

## Publish gate (auto vs staff ✅)

| Option | Description | Selected |
|--------|-------------|----------|
| Directo a la web | Uploading to Jinxxy IS the approval | ✓ |
| Aprobación staff con ✅ | Gallery/reviews-style gate | |
| Híbrido: directo pero oculto si falta info | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Flag de contenido maduro de Jinxxy | Map Jinxxy's mature flag → nsfw:true | ✓ |
| Default nsfw:true | Safe-by-default blur | |
| Default nsfw:false | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Derivar de Jinxxy + defaults | editor/category mapped where possible | |
| Obligatorio de Jinxxy | | |
| Tú decides | Claude defines field-by-field mapping during research | ✓ |

---

## Field mapping & bilingual gap

| Option | Description | Selected |
|--------|-------------|----------|
| Traducción automática en el sync | DeepL/LLM translation at sync time | |
| Mismo texto en ambos idiomas | Verbatim copy to es+en; staff polishes later | ✓ |
| Tú decides | | |

---

## Updates & removals

| Option | Description | Selected |
|--------|-------------|----------|
| Espejo completo | Adds, updates (price/images), and removals all propagate | ✓ |
| Solo productos nuevos | | |
| Nuevos + updates, sin bajas automáticas | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Campos con dueño + snapshot | Sync owns price/images/checkoutUrl/nsfw; staff owns license/details/updates/storefronts/featured and edited translations; SQLite snapshot detects changes | ✓ |
| Jinxxy siempre gana | | |
| Tú decides | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Importar todo + vincular existentes | First run mirrors the whole storefront, linking by checkoutUrl | ✓ |
| Solo de aquí en adelante | | |
| Tú decides | | |

---

## Claude's Discretion

- editor/category field mapping and defaults
- Exact poll interval within 6–12h; /sync command name/registration
- Announcement embed design and copy; channel env var naming
- Ownership-boundary details and snapshot/merge implementation
- API-key/env config names; sync commit message format; rate-limit handling

## Deferred Ideas

- Machine translation of listings (rejected for now; revisit if hand-translation becomes a burden)
- Jinxxy sales/webhook notifications (carried from Phase 6 deferral)
- Richer public "new product" marketing embed as its own polish task
