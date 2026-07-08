# Deferred Items — Phase 06 Asset Store

Out-of-scope discoveries logged during execution (SCOPE BOUNDARY rule). NOT fixed here.

## From Plan 06-03 (purchase cart)

### D1 — /servicios cotización chrome (pill + drawer + summary modal) does not render in the build

- **Discovered during:** 06-03 Task 2 verification (D-19 isolation checks).
- **Observation:** In `dist/es/servicios/index.html` (and every services route variant —
  `dist/en/services`, `dist/en/servicios`, `dist/es/servicios`) the cotización chrome is
  absent: `cart-fab` = 0, `cart-drawer` = 0, `data-cart-total` = 0, `data-lenis-prevent` = 0,
  `"Ver mi cotización"` = 0, `cartDrawerTitle` = 0, `"Continuar en Discord"` = 0. The
  ServicesPage BODY still renders fully (`catalog-row` = 144, `cart-add-trigger` = 14), so the
  `concept === 'services'` branch is matching and only the `chrome-bottom` cotización Fragment
  (`CartPill` + `CartDrawer` + `CartSummaryModal`) is missing from output.
- **Why pre-existing (not caused by 06-03):** The 06-03 diff vs base `19ffee2` touches none of
  the cotización dependency set — `src/pages/[lang]/[page].astro` services fragment is
  byte-identical (empty diff), and `CartPill.astro` / `CartDrawer.astro` / `CartSummaryModal.astro`
  / `ServicesPage.astro` / `routes.ts` are untouched. The only shared file changed (`pages.json`)
  only ADDS keys to the `tienda` object; services keys are unchanged. The rendering is therefore
  identical to base.
- **Likely root cause:** the still-open Phase 03.1 plan `03.1-06` (cart.ts modal/clipboard/focus-
  trap) has no SUMMARY yet — the cotización chrome integration appears incomplete at this repo
  state. Confirm and resolve inside the Phase 03.1 workstream, not the asset store.
- **06-03 impact:** none. D-19 (store cart vs cotización isolation) is satisfied on the store
  side — `store-cart-fab` = 0 on all services paths and = 1 on store pages. The store cart never
  leaks into services. The store slice is complete and correct regardless of the cotización's
  own rendering state.
