---
quick_id: 260717-bum
slug: limpieza-codigo-muerto
title: Limpieza de código muerto exhaustiva (máxima profundidad)
date: 2026-07-17
status: complete
---

# Summary — Quick Task 260717-bum

Limpieza de código muerto **exhaustiva (máxima)**, ejecutada inline por fases con
commits atómicos y `npm run build` verde tras cada una (19 páginas siempre).
Análisis computacional (imports/exports/CSS/i18n) hecho con scripts Node; se
verificó cada candidato contra acceso dinámico antes de borrar.

## Commits (código)

| Commit | Qué se borró / arregló |
|--------|------------------------|
| `ec291aa` | **Sitio legado pre-Astro (raíz):** `index.html`, `functions.js`, `styles.css`, `favicon.png` (dup; el vivo es `public/favicon.png`), `assets/` (16 MB, 30 archivos). No entraban al build. |
| `964d74d` | **`AudioPlayer.astro` + `scripts/editor/audio.ts`** (nunca importados; el editor usa `SpotifyVinyl`). Comentario obsoleto corregido en `e/[slug].astro`. |
| `6e75aea` | **Bloque CSS `.addons*`** en `sections.css` (feature add-ons nunca renderizada). |
| `8807482` | **i18n:** `packages.json` entero (namespace no registrado en `ui.ts`) + `common.json` entero (sin uso) + copy de add-ons (`addonsTitle`/`addons`/`addonsNote` en packages/pages/services) + claves sueltas (`navAbout`, `navEditors`, `langSwitchLabel`, `taglineDivider`, `emptyState.galleryCta`). Comentario `PackageCard` corregido. |

## Verificación final (todo verde)

- `npm run build`: 19 páginas, sin errores. Tienda `/es/tienda`·`/en/store` intacta.
- Unused imports: **0** · Dead exports (lib/i18n): **0** · Dead CSS classes: **0**.
- Deps npm: `astro`/`gsap`/`lenis`/`imagesloaded` + 3 devDeps → todas en uso.
- Assets `public/`: galería/editores gestionados por bot, tienda deferida, fuentes/favicon/CNAME infra, `hero-fallback.avif` referenciado → 0 podables.

## Decisiones clave

- **Tienda deferida NO tocada** (ruteada, "Coming Soon" a propósito).
- **`storefrontNames.jinxxy/payhip` conservado** — falso positivo: `QuickViewModal`
  lo serializa (`JSON.stringify(t.storefrontNames)`) y el cliente lo usa por clave de
  plataforma. Borrarlo habría roto la tienda. (Ejemplo de por qué se verificó cada
  candidato en vez de borrar en bloque.)
- **Copy add-ons borrado** por decisión del usuario (feature muerta; se re-escribe si vuelve).
- **Comentarios de provenance conservados** (`Footer`/`About`/`chrome.ts`/`choreography.ts`):
  son historial intencional, no cruft.

## Notas

- Las claves i18n sin referenciar **no se envían al HTML** del build, así que su
  eliminación es limpieza de fuente (sin impacto en peso/runtime).
- Durante la sesión hubo una caída intermitente del clasificador de seguridad de Bash
  que bloqueó temporalmente los sweeps Node; se reanudó y completó al recuperarse.
