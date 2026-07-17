---
quick_id: 260717-bum
slug: limpieza-codigo-muerto
title: Limpieza de código muerto exhaustiva (máxima profundidad)
date: 2026-07-17
mode: inline-phased
status: in-progress
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

### Fase 3 — CSS sin uso  [x] VERIFICADO — SIN BORRADOS SEGUROS
- [x] Los 13 archivos `.css` están **todos importados** → 0 archivos huérfanos
- [x] 0 selectores globales de cosas borradas (audio-player, marquee, teaser)
- [~] Pruning por regla: **NO ejecutado a propósito**. `cart.ts`/`store.ts` generan DOM
      con clases que el análisis estático marca "sin uso" pero están vivas; Tailwind v4
      ya purga utilidades. Riesgo de rotura > payoff. (Sweep automatizado bloqueado por
      caída del clasificador de seguridad de la herramienta.)

### Fase 4 — Claves i18n sin uso  [~] DIFERIDO (riesgo dinámico)
- [~] i18n se accede por propiedad computada (`pages[concept]`, `useTranslations` devuelve
      el dict completo) → poda estática de claves puede romper runtime. Bajo payoff.
      Requiere sweep computacional (bloqueado por clasificador). Diferido.

### Fase 5 — Exports/imports y comentarios obsoletos  [~] PARCIAL
- [x] Comentarios "obsoletos" revisados: los de provenance (`Footer`/`About`/`chrome.ts`
      "portado de index.html/functions.js") y el de `choreography.ts` (teaser removido)
      son **historial útil intencional**, NO cruft → se conservan.
- [~] Imports sin uso / exports muertos: sweep automatizado **bloqueado** por caída del
      clasificador (comandos `node` no ejecutables esta sesión). PENDIENTE de reanudar.

### Fase 6 — Deps npm + assets public/  [x] VERIFICADO — SIN BORRADOS
- [x] `astro`, `gsap`, `lenis`, `imagesloaded` + 3 devDeps: **todas en uso**
- [x] Assets `public/`: `gallery/`+`editores/` gestionados por bot/admin (auto-galería,
      objetivo del proyecto) → NO podar; `store/` deferido; `fonts/`/`favicon`/`CNAME`
      infra; `hero-fallback.avif` referenciado. 0 assets podables.

### Cierre  [ ]
- [x] `npm run build` final verde (tras Fase 2)
- [ ] Actualizar `README.md` (refleja el revamp Astro)
- [ ] SUMMARY.md + STATE.md + commit de docs

## Resultado neto

- **Borrado (código muerto real):** sitio legado raíz (index.html, functions.js,
  styles.css, favicon dup, assets/ 16MB) + `AudioPlayer.astro` + `audio.ts`.
- **Verificado limpio:** archivos CSS, deps npm, assets public/ → nada más que borrar.
- **Diferido por riesgo/bajo valor:** poda de reglas CSS y claves i18n (acceso dinámico).
- **Pendiente (bloqueo de herramienta):** sweep de imports/exports sin uso — reanudar
  cuando el clasificador de seguridad de Bash/context-mode vuelva a estar disponible.

## Log de progreso

- 2026-07-17 — Análisis completo; plan creado.
- 2026-07-17 — Fase 1 (ec291aa) y Fase 2 (964d74d) ejecutadas, build verde.
- 2026-07-17 — Fases 3/6 verificadas sin borrados seguros; 4/5 diferidas.
- 2026-07-17 — Sweep computacional (imports/CSS/i18n) bloqueado por caída del clasificador.
