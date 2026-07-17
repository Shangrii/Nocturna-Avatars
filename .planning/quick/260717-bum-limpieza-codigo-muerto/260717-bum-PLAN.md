---
quick_id: 260717-bum
slug: limpieza-codigo-muerto
title: Limpieza de código muerto exhaustiva (máxima profundidad)
date: 2026-07-17
mode: inline-phased
status: complete
---

# Quick Task 260717-bum — Limpieza de código muerto exhaustiva

Limpieza máxima en todo el proyecto, ejecutada **por fases con commits atómicos**
y verificando `npm run build` en cada fase. Este archivo es el **tracker
resumible**: si se agota el presupuesto de tokens, se retoma por la primera fase
con casillas sin marcar.

## Alcance y decisiones (confirmadas con el usuario)

- **Borrar** el sitio legado pre-Astro en la raíz.
- Profundidad **máxima**: archivos muertos + reglas CSS + claves i18n +
  exports/imports/comentarios obsoletos + deps npm + assets `public/` sin uso.
- **NO tocar**: sistema de tienda (`StorePage`, `ProductCard`, `QuickViewModal`,
  `StoreCart*`, `store.ts`, `store-cart.ts`) — está ruteado (`/es/tienda`,
  `/en/store`) y deferido a propósito; `.planning/`; `docs/specs/`; cotización de
  servicios (`cart.ts` está vivo, lo usa ServicesPage).

## Hallazgos base (análisis read-only ya hecho)

- El build sale **solo** de `src/` + `public/` (`npm run build` → `dist/` →
  `gh-pages`). Archivos de la raíz NO entran al build.
- `public/favicon.png` es el favicon real; `favicon.png` de la raíz es duplicado.
- Único componente nunca importado: `AudioPlayer.astro` (+ su `editor/audio.ts`).

## Fases

### Fase 1 — Sitio legado de la raíz  [x] HECHO (commit ec291aa)
- [x] `git rm` de: `index.html`, `functions.js`, `styles.css`, `favicon.png` (dup raíz), `assets/` (16MB, 30 archivos)
- [x] Verificado: fuente graffiti vive en `public/fonts/`; favicon real en `public/favicon.png`
- [x] `npm run build` verde (19 páginas)
- [x] commit atómico

### Fase 2 — Componentes/scripts muertos  [x] HECHO (commit 964d74d)
- [x] Confirmado: `AudioPlayer.astro` nunca importado; el editor usa `SpotifyVinyl` + `spotify.ts`
- [x] `git rm` `AudioPlayer.astro` + `scripts/editor/audio.ts` (único consumidor)
- [x] Corregido comentario obsoleto en `e/[slug].astro` (AudioPlayer → SpotifyVinyl)
- [x] `npm run build` verde
- [x] commit atómico

### Fase 3 — CSS sin uso  [x] HECHO (commit 6e75aea)
- [x] Los 13 archivos `.css` están **todos importados** → 0 archivos huérfanos
- [x] Sweep de clases con 0 refs (contra `.astro`+`.ts`, que incluye literales JS) → 5
      candidatas, todas del bloque `.addons*` (feature add-ons nunca renderizada) → borradas
- [x] Re-sweep: **0 clases muertas** restantes; build verde

### Fase 4 — Claves i18n sin uso  [x] HECHO (commit 8807482)
- [x] Sweep con exclusión de acceso dinámico → borrado `packages.json` (namespace no
      registrado en `ui.ts`), `common.json` (sin uso), copy add-ons, y claves sueltas
- [x] `storefrontNames.jinxxy/payhip` CONSERVADO (falso positivo: acceso dinámico vivo)
- [x] JSON válidos, build verde

### Fase 5 — Exports/imports y comentarios obsoletos  [x] HECHO / VERIFICADO
- [x] Sweep: **0 imports sin uso, 0 exports muertos** en todo `src`
- [x] Comentarios de provenance (`Footer`/`About`/`chrome.ts`/`choreography.ts`)
      conservados (historial intencional). Corregidos los stale reales: `e/[slug].astro`
      (Fase 2) y `PackageCard.astro` (Fase 4).

### Fase 6 — Deps npm + assets public/  [x] VERIFICADO — SIN BORRADOS
- [x] `astro`, `gsap`, `lenis`, `imagesloaded` + 3 devDeps: **todas en uso**
- [x] Assets `public/`: `gallery/`+`editores/` gestionados por bot/admin (auto-galería,
      objetivo del proyecto) → NO podar; `store/` deferido; `fonts/`/`favicon`/`CNAME`
      infra; `hero-fallback.avif` referenciado. 0 assets podables.

### Fase 6 — Deps npm + assets public/  [x] VERIFICADO — SIN BORRADOS
(ver detalle arriba)

### Cierre  [x] HECHO
- [x] `npm run build` final verde (19 páginas)
- [x] `README.md` actualizado (refleja el revamp Astro)
- [x] SUMMARY.md + STATE.md + commit de docs

## Resultado neto (COMPLETO)

- **Borrado (código muerto real, 5 commits):** sitio legado raíz (16 MB) +
  `AudioPlayer.astro`/`audio.ts` + bloque CSS `.addons*` + `packages.json` +
  `common.json` + copy add-ons + claves i18n sueltas sin uso.
- **Verificado limpio:** imports (0), exports (0), CSS (0), deps npm (todas usadas),
  assets public/ (bot/deferido/infra) → nada más que borrar.
- **Conservado por diseño:** tienda deferida, `storefrontNames` (dinámico vivo),
  comentarios de provenance.

## Log de progreso

- 2026-07-17 — Análisis completo; plan creado.
- 2026-07-17 — Fase 1 (ec291aa) y Fase 2 (964d74d) ejecutadas, build verde.
- 2026-07-17 — Caída intermitente del clasificador bloqueó los sweeps Node temporalmente.
- 2026-07-17 — Clasificador recuperado; Fase 3 (6e75aea, CSS add-ons) y Fase 4 (8807482,
  i18n) ejecutadas. Fases 5/6 verificadas limpias. Cierre completo, build verde.
