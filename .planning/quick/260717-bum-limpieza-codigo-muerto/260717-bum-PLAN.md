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

### Fase 1 — Sitio legado de la raíz  [ ]
- [ ] `git rm` de: `index.html`, `functions.js`, `styles.css`, `favicon.png` (dup raíz), `assets/`
- [ ] `npm run build` verde
- [ ] commit atómico

### Fase 2 — Componentes/scripts muertos  [ ]
- [ ] Confirmar `AudioPlayer.astro` no renderizado en ningún layout/página
- [ ] `git rm` `src/components/editor-shell/AudioPlayer.astro`
- [ ] Confirmar `editor/audio.ts` queda huérfano → `git rm`
- [ ] `npm run build` verde
- [ ] commit atómico

### Fase 3 — CSS sin uso  [ ]
- [ ] Archivos `.css` no importados por ningún `.astro`/`.ts`
- [ ] Reglas/selectores sin uso dentro de CSS vivo (conservador)
- [ ] `npm run build` verde
- [ ] commit atómico

### Fase 4 — Claves i18n sin uso  [ ]
- [ ] Claves en `src/i18n/*.json` nunca referenciadas
- [ ] `npm run build` verde
- [ ] commit atómico

### Fase 5 — Exports/imports y comentarios obsoletos  [ ]
- [ ] Exports de `lib`/`i18n` nunca importados
- [ ] Imports sin uso dentro de archivos
- [ ] Comentarios que referencian archivos legado ya borrados
- [ ] `npm run build` verde
- [ ] commit atómico

### Fase 6 — Deps npm + assets public/  [ ]
- [ ] Deps en `package.json` no importadas (imagesloaded, etc.)
- [ ] Assets en `public/` no referenciados (galería/store/editors/fonts)
- [ ] `npm run build` verde
- [ ] commit atómico

### Cierre  [ ]
- [ ] `npm run build` final verde
- [ ] Actualizar `README.md` (refleja el revamp Astro)
- [ ] SUMMARY.md + STATE.md + commit de docs

## Log de progreso

- 2026-07-17 — Análisis completo; plan creado; iniciando Fase 1.
