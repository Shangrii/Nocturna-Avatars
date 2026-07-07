# Phase 6: Asset Store - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-07
**Phase:** 6-asset-store
**Areas discussed:** Checkout & fulfillment provider, Store page & product display, store.json product schema, Purchase cart vs cotización

---

## Checkout & fulfillment provider

| Option | Description | Selected |
|--------|-------------|----------|
| Hosted per-product | Payhip/Jinxxy/Gumroad-style: free, % fee, provider hosts files + delivery | (superseded by freeform) |
| Cart-integrated (Snipcart/Foxy) | Real multi-item checkout from own cart; ~$20-25/mo | |
| Hybrid — decide after research | Lock requirement, researcher recommends provider | |

**User's choice:** Freeform — revealed the multi-vendor business model: several editors sell their own assets, owner takes 30%; priority 1 = automatic sales tracking, priority 2 = low fees; candidates seen: SellAuth, Payhip, Ko-fi; requested deep research.

Clarifiers asked before research:
- **Reparto 30%:** prefers automatic splits; manual acceptable only if splits impossible (would want a plan, maybe Discord bot).
- **Pagos:** both PayPal + cards required.
- **NSFW:** yes, store will include NSFW. User noted mid-research: platforms "prohibit" NSFW but tolerate SFW listings with the content in the file.
- **Productos:** digital files only.
- **País:** México.

Research (gsd-advisor-researcher): compared Jinxxy, Payhip, SellAuth, Booth.pm, itch.io; eliminated Gumroad/Ko-fi/Lemon Squeezy (NSFW bans), Booth (no PayPal/cards on R-18), itch.io (paid NSFW suspended), Shopify+adult processor (cost). Key finding: Jinxxy banned explicit content Mar 2, 2026 (suggestive/mature still allowed). Jinxxy uniquely offers native per-product collaborator splits + Creator API/webhooks.

Follow-up questions answered (Jinxxy split mechanics, fees 5%+~3%+$1.50/payout ≈ 92% net, integration = links out but full storefront on-domain + Jinxxy shared cart).

| Final option | Description | Selected |
|--------|-------------|----------|
| Jinxxy, agnóstico en el código | Generic checkoutUrl in store.json, migratable without code changes | ✓ |
| Jinxxy, integración a fondo | + Creator API price sync now | |
| Payhip | On-domain overlay checkout, but manual 30% accounting + NSFW freeze risk | |

**Notes:** User torn between Jinxxy's native split ("demasiado bueno") and Payhip's on-domain checkout ("me encantaría poder manejar todo desde mi página"); splits won.

---

## Store page & product display

| Option | Description | Selected |
|--------|-------------|----------|
| Grid + quick-view | Modal with gallery/description/buy button, reuses modal pattern | ✓ |
| Solo grid | Cards link straight to Jinxxy | |
| Grid + página por producto | Per-product URLs, better SEO, more work | |

**Card contents:** foto + nombre + precio + **editor credit** ✓ (vs no credit / rich card)
**Images:** **hotlink Jinxxy CDN** ✓ (vs public/store/ in repo — accepted broken-image risk, placeholder fallback at Claude's discretion)
**NSFW on site:** **blur + reveal per card** ✓ (chose per-card over global toggle w/ confirmation and separate 18+ section)
**Categories:** flat grid now, `category` field in schema for later ✓
**Nav:** top-level "Tienda"/"Store" item ✓ (vs highlighted item)
**Ordering:** featured pinned + rest newest-first ✓ (combined two options)

---

## store.json product schema

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt draft schema | id, name{es,en}, description{es,en}, price, images[], checkoutUrl, editor, category, nsfw, featured, date | ✓ |
| Adjust fields | — | |

**Discounts:** none — single price field ✓ (vs optional oldPrice strikethrough)
**Bilingual:** both es+en REQUIRED ✓ (vs ES-with-fallback)
**Editor credit:** plain text ✓ (vs link to Jinxxy profile)

---

## Purchase cart vs cotización

| Option | Description | Selected |
|--------|-------------|----------|
| Carrito local + multi-add si existe | Reuse 3.1 engine; planning verifies Jinxxy add-to-cart-via-URL; fallback = per-product links in drawer | ✓ |
| Sin carrito local | Buy buttons only; multi-item on Jinxxy's own cart | |
| Carrito local siempre por-link | Local cart, never research multi-add | |

**Coexistence:** two fully separate carts ✓ (vs single pill w/ two contexts) — /servicios = quote → "Abrir Ticket"; /tienda = purchase → "Pagar en Jinxxy".
**Persistence:** store cart in localStorage ✓ (quote cart stays reset-on-refresh).

---

## Claude's Discretion

- Broken-CDN-image placeholder fallback
- NSFW blur treatment + reveal microinteraction (reduced-motion aware)
- Add-to-cart placement (card vs quick-view vs both)
- Technical cart-separation strategy
- Store i18n strings + empty state
- Jinxxy fee tier (account-level; assume Standard 5%)

## Deferred Ideas

- Discord bot × Jinxxy Creator API/webhooks (sales notifications/accounting)
- Creator API price sync with store.json
- Watch Jinxxy's announced "alternative" for adult creators
- Category filters on the grid
- Reviewed todos → each to become its own phase via /gsd-phase add: bot reminders command; Carrd-style template editor; reviews channel → website publishing
