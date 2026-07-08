---
phase: 6
slug: asset-store
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-08
---

# Phase 6 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Audited:** 2026-07-08
**Disposition policy:** `block_on: high`
**Result:** SECURED — all declared threat mitigations verified present in implemented code.

This audit verifies each threat declared in the Phase 06 plan `<threat_model>` blocks
(06-01, 06-02, 06-03) by its stated disposition. Implementation files were treated as
read-only. Evidence is a located code reference, not documentation or intent.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| store.json → rendered HTML | Staff-authored JSON becomes page content + a JSON `<script>` island | Product names, descriptions, prices, URLs |
| Jinxxy CDN → `<img>` | Hotlinked third-party image URLs load in the visitor's browser | Third-party image bytes |
| store.json island → quick-view / drawer DOM | Staff-authored data injected into modal and drawer rows at runtime | Product names, descriptions, editor copy |
| checkoutUrl → `<a href>` | Staff-authored URL becomes a live outbound link (quick-view + per-item drawer rows) | Outbound navigation target |
| localStorage → cart state | Client-controlled storage rehydrated into the cart on load | `[id, qty]` pairs (untrusted) |
| store page → jinxxy.com | Visitor is sent to a third-party checkout in a new tab | Purchase intent (no payment data on-site) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-06-01 | Tampering (XSS) | store.json name/description in ProductCard | mitigate | `ProductCard.astro` renders every field via Astro `{...}` auto-escape (`{product.name}` L95, `{product.editor}` L98, `{featuredBadge}` L59); `grep set:html` = 0 | closed |
| T-06-01 | Tampering (XSS) | `data-store-products` JSON island | mitigate | `StorePage.astro` L107-124 + L167: island emitted via the `data-store-products` **attribute** (`data-store-products={islandJson}`); Astro auto-escapes the attribute value so a `</script>` in staff data stays in attribute-value parser state and cannot break out. Empty `<script>` body. See Deviation note below. | closed |
| T-06-01 | Tampering (XSS) | JS-populated quick-view rows | mitigate | `store.ts` uses `textContent` / `createElement` only (`setQvText` L124-127, `renderSections` L150-162, `renderStorefronts` L202-208); `grep innerHTML/outerHTML/insertAdjacentHTML/document.write` = 0 | closed |
| T-06-01 | Tampering (XSS) | JS-built drawer rows | mitigate | `store-cart.ts` `syncCartUI` builds every node via `createElement` + `textContent` (L270-314); `grep innerHTML…` = 0 | closed |
| T-06-02 | Tampering / Elevation | `checkoutUrl` → quick-view buy href | mitigate | `store.ts` L344 `url.startsWith('https://')` gate before `buy.setAttribute('href', url)` (L346); else disabled `aria-disabled` + `linkUnavailable` label (L350-355). Storefront links same gate: `store.ts` L196 | closed |
| T-06-02 | Tampering / Elevation | `checkoutUrl` → per-item drawer href | mitigate | `store-cart.ts` L288 `url.startsWith('https://')` gate; valid → `<a href>` (L290-297), else disabled `<span>` (L298-304) | closed |
| T-06-03 | Tampering (reverse tabnabbing) | `target="_blank"` buy link (quick-view) | mitigate | `QuickViewModal.astro` L111-112 `target="_blank" rel="noopener noreferrer"`; runtime storefront links `store.ts` L205-206 | closed |
| T-06-03 | Tampering (reverse tabnabbing) | `target="_blank"` per-item drawer links | mitigate | `store-cart.ts` L294-295 `a.target='_blank'; a.rel='noopener noreferrer'` | closed |
| T-06-04 | Tampering | localStorage cart contents (edited ids/prices) | mitigate | `store-cart.ts` persists `[id, qty]` pairs only (`persist` L117-124); `hydrateFromStorage` L152-163 drops unknown ids and rebuilds name/price/checkoutUrl from the canonical island (never trusts stored price/url); `reconcileInMemory` L169-184 re-refreshes and drops removed ids each load; corrupt storage caught → empty (L147-149) | closed |
| T-06-05 | DoS (broken UI) | Hotlinked Jinxxy CDN preview images | mitigate | `store.ts` `bindImageFallbacks` L34-55 swaps broken `[data-store-img]` to `/store/placeholder.svg` (handler self-removes to prevent loop); gallery img same fallback L271-277. CLS prevented by fixed aspect box (`ProductCard.astro` `.product-card__thumb { aspect-ratio: 1/1 }` L171-176; `QuickViewModal.astro` L221-230). `public/store/placeholder.svg` present. | closed |
| T-06-SC | Tampering (supply chain) | npm installs | accept | Verified zero dependency changes across the phase: `git diff 19ffee2..HEAD -- package.json package-lock.json` is empty. Last package.json commit predates Phase 06 (`ac84298`, phase 04-01). Documented in Accepted Risks Log (AR-06-01). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Distinct threat IDs:** 6 (T-06-01, T-06-02, T-06-03, T-06-04, T-06-05, T-06-SC) — all closed.

---

## Deviation Note — T-06-01 JSON island (intent preserved)

The plan's declared mitigation for the island was: *"serialize the JSON island with every
`<` escaped (e.g. `&lt;`) so `</script>` in data cannot break out."* The implementation
instead emits the JSON through the `data-store-products` **attribute** on an empty
`<script type="application/json">` element (`StorePage.astro` L167) and consumers read
`el.dataset.storeProducts` then `JSON.parse`.

This is a mechanism change, not a mitigation gap. The stated threat — a `</script>`
sequence in staff-authored data breaking out of the script element — is fully neutralized:
the payload lives in attribute-value parser state (Astro auto-escapes `&`, `"`, `<`, `>`),
never in script-data state, so a `</script>` string is inert. The alternative (escaped
text inside `<script>` body) would have required `set:html`, which the plan's own
acceptance gate forbids (`grep set:html` must be 0). The chosen channel satisfies both the
breakout-safety intent and the no-`set:html` constraint. Verified: `set:html` = 0 across all
five store components.

---

## New Attack Surface Introduced During Implementation (checkpoint fixes)

Post-checkpoint work added three runtime DOM-injection points not present in the original
plan text. All map to existing registered threats — no unregistered flag:

- **`renderSections()`** (`store.ts` L137-163) — injects optional `license`/`details`/`updates`
  staff copy under the quick-view photo. Covered by T-06-01: `textContent` only.
- **`renderStorefronts()`** (`store.ts` L181-210) — injects optional per-product extra
  storefront links. Covered by T-06-01 (`textContent`), T-06-02 (`https://` gate L196),
  T-06-03 (`rel="noopener noreferrer"` L206). No seed product defines `storefronts`; loop
  renders nothing today.
- **SR live region** (`StoreCartPill.astro` L54-60, written by `store-cart.ts` `announceAdded`
  L358-368) — writes `product.name` via `textContent`. Covered by T-06-01.

## Unregistered Flags

None. The 06-02 and 06-03 summaries' "Threat Surface Scan" sections both declare no new
security surface beyond the plan threat model, and the checkpoint-fix surface above resolves
to existing threat IDs.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-SC | No supply-chain scan performed for new npm packages this phase — Phase 06 added zero dependencies (verified: no `package.json`/`package-lock.json` diff since phase 04). If any install is later proposed, the RESEARCH Package Legitimacy Gate must run first. | Maintainer | 2026-07-08 |
| AR-06-02 | T-06-05 | Hotlinked Jinxxy CDN images (D-11) can 404 / be swapped by the third party. Accepted per plan D-11; degrades gracefully to a branded placeholder with no layout shift. The site holds no product files (D-05); Jinxxy is merchant of record and CDN host. | Maintainer | 2026-07-08 |
| AR-06-03 | — (transfer) | Checkout, payment, and fulfillment occur on jinxxy.com (D-01/D-06). Transferred to Jinxxy as merchant of record by design; the site only emits https-validated outbound links. No payment data touches this static site. | Jinxxy (vendor) | 2026-07-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-08 | 6 | 6 | 0 | gsd-security-auditor (opus) |

---

## Notes for Reviewers

- Implementation files were not modified by this audit.
- A pre-existing, out-of-scope observation is logged in the 06-03 summary: the `/servicios`
  cotización chrome (cart.ts) does not render in the current build. This is unrelated to
  Phase 06 threats (store-side isolation D-19 is satisfied — `store-cart-fab` = 0 on all
  services routes) and is tracked in `deferred-items.md` (D1), not here.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-08
