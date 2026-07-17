---
quick_id: 260717-bum
slug: limpieza-codigo-muerto
title: Limpieza de código muerto exhaustiva (máxima profundidad)
date: 2026-07-17
status: incomplete
reason_incomplete: Sweep automatizado de imports/exports/CSS/i18n bloqueado por caída del clasificador de seguridad de Bash/context-mode (comandos `node` no ejecutables). Reanudable.
---

# Summary — Quick Task 260717-bum

Limpieza de código muerto ejecutada **inline, por fases, con commits atómicos** y
build verificado en cada fase (decidido así por presupuesto de tokens y para poder
pausar/reanudar; el análisis ya estaba en contexto, evitando el coste de subagentes).

## Ejecutado (borrados reales, build verde)

| Commit | Fase | Qué |
|--------|------|-----|
| `ec291aa` | 1 | Sitio legado pre-Astro en la raíz: `index.html`, `functions.js`, `styles.css`, `favicon.png` (duplicado; el vivo es `public/favicon.png`) y `assets/` (16 MB, 30 archivos — galería vieja + fuente duplicada). No entraban al build. |
| `964d74d` | 2 | `AudioPlayer.astro` (nunca importado; el editor usa `SpotifyVinyl`) + su único consumidor `scripts/editor/audio.ts`. Comentario obsoleto corregido en `e/[slug].astro`. |

Build tras cada fase: **19 páginas, verde** (tienda `/es/tienda`·`/en/store` intacta).

## Verificado limpio (sin nada más que borrar)

- **CSS (Fase 3):** los 13 archivos `.css` están importados; 0 selectores globales de
  cosas borradas.
- **Deps npm (Fase 6):** `astro`, `gsap`, `lenis`, `imagesloaded` + 3 devDeps → todas en uso.
- **Assets public/ (Fase 6):** `gallery/`+`editores/` gestionados por el bot/admin (auto-galería,
  núcleo del proyecto); `store/` deferido; `fonts/`/`favicon`/`CNAME` infra; `hero-fallback.avif`
  referenciado. 0 podables.

## Deferido a propósito (riesgo > payoff)

- **Reglas CSS por selector (Fase 3):** `cart.ts`/`store.ts` generan DOM con clases que
  el análisis estático marca "sin uso" pero están vivas. Tailwind v4 ya purga utilidades.
- **Claves i18n (Fase 4):** acceso por propiedad computada (`pages[concept]`,
  `useTranslations` devuelve el dict) → poda estática puede romper runtime.
- **Comentarios (Fase 5):** los de provenance y el de `choreography.ts` son historial útil
  intencional, no cruft → conservados.

## Pendiente (bloqueo de herramienta, reanudable)

- **Sweep de imports/exports sin uso (Fase 5):** requiere ejecutar `node` para el análisis;
  el clasificador de seguridad de Bash/context-mode estuvo caído durante la sesión. El script
  de análisis ya está escrito en el scratchpad; reanudar cuando la herramienta vuelva.

## Reanudar

`/gsd:quick resume limpieza-codigo-muerto` — o simplemente pedir "reanuda la limpieza";
retomar por la Fase 5 (imports/exports) y opcionalmente reconsiderar CSS/i18n con herramienta viva.
