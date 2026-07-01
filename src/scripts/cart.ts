/**
 * cart.ts — Catalog Configurator cart logic (stub).
 *
 * This module is forward-referenced by ServicesPage.astro (Plan 03.1-04).
 * Full implementation is added in Plan 03.1-05.
 *
 * Stub exports initCart() as a no-op so the build succeeds during Wave 2b.
 */

// Module-level guard: initCart runs once per page navigation
let _cartInitialized = false;

export function initCart(): void {
  if (_cartInitialized) return;
  _cartInitialized = true;
  // Full implementation in Plan 03.1-05
}

// Auto-invoke on module load (Astro scoped <script> import)
initCart();
