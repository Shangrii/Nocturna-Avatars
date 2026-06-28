# Nocturna Avatars — Website Revamp · Design Spec

**Date:** 2026-06-28
**Status:** Approved (brainstorming)
**Author:** Shangri + Claude

---

## 1. Purpose & Principles

Rebuild the Nocturna Avatars site as a **highly aesthetic, "máximo experimental" street/graffiti portfolio** that also **sells** (packages + opening a Discord ticket) and **auto-updates** (avatar photos published via the existing Discord bot).

Three pillars, in priority order:

1. **Visual impact** — experiential, animated, distinctive street aesthetic.
2. **Clear conversion** — the path to "Abrir Ticket" / Discord is always reachable.
3. **Zero maintenance friction** — content (catalog, gallery, copy) updates without touching code; photos publish automatically.

The current visual identity is kept and elevated — this is a rebuild of the implementation, not a reinvention of the brand.

---

## 2. Tech Stack & Architecture

- **Framework:** **Astro** — static output. Stays free on **GitHub Pages**; existing `CNAME`/custom domain preserved.
- **Motion layer ("2D rich + punctual WebGL"):**
  - **Lenis** — smooth scroll.
  - **GSAP + ScrollTrigger** — scroll-driven animations and reveals.
  - **Astro View Transitions** — animated transitions between pages.
  - **One WebGL shader** in the hero (noise/distortion) — not a full 3D scene.
  - **Cursor effects** and micro-interactions throughout.
  - **3D (Three.js) is explicitly deferred** to a possible later phase.
- **Data layer:** versioned JSON in the website repo:
  - `services.json` — service catalog (packages + modular catalog).
  - `gallery.json` — gallery entries (the bot writes here).
  - i18n dictionaries — UI/copy strings per language.
- **Deploy:** GitHub Action builds Astro on every push. The bot's commit triggers an automatic rebuild → photos go live.

---

## 3. Internationalization (ES + EN)

Bilingual from launch; English is strategically important (planned transition to a US/American audience, possibly becoming primary later).

- **Astro i18n routing:** language-prefixed routes (`/es/...`, `/en/...`) + a **language switcher** in the nav.
- **Content dictionaries:** all UI, catalog, and Terms text comes from per-language JSON so ES/EN stay in sync and are editable without touching components.
- **Default:** Spanish for now; switching the default later is trivial.
- **Caveats:**
  - **Terms** are legal text → the EN translation must be human-reviewed/validated by the team.
  - **Gallery captions** come from Discord staff in a single language (usually ES) → not auto-translated; shown as written.

---

## 4. Site Structure (hybrid: landing + pages)

- **`/` Landing** — hero with WebGL shader, taglines, featured services, the 3 packages summarized, gallery teaser, "about/process" section, Discord CTA. The "wow" experience.
- **`/servicios`** — the 3 packages in detail + the **modular catalog** by category.
- **`/galeria`** — full visual wall (masonry + lightbox), data-driven from `gallery.json`.
- **`/terminos`** — full Terms (migrated, translated).
- **Persistent CTA:** "Abrir Ticket" in the nav + a stylized floating CTA on every page — conversion always reachable, even in experimental mode.

---

## 5. Design System (visual DNA)

Keep and formalize the current identity into reusable tokens / Astro components.

- **Colors:** red `#c0192c` / dark `#7a0f1a` / glow `#e8223b`; navy `#0a0c14` / `#10131e` / `#181c2e`; off-white `#f0eae4`; dim `#9a9198`.
- **Fonts:** `A Another Tag` (graffiti) + `Permanent Marker` (display) + `Inter` (body) + `Space Mono` (mono/labels).
- **Texture:** film-grain overlay (already present); add spray/stencil texture, glows, "tape" borders.
- **Font sizing note:** `A Another Tag` renders **small** — bump its type scale and reserve it for **display/accents** (titles, brand, tags), **never body**. Body stays Inter.

---

## 6. Service Catalog (data-driven)

`services.json` with two blocks:

- **Packages:** Penumbra ($40) / Umbra ($60) / Eclipse ($90) — migrated from the current site, editable without code. Names fit the nocturnal/shadow theme.
- **Modular catalog** by category:
  - *Edición Unity*
  - *Blender / malla* (refit, weight paint, quimeras, blendshapes nuevos)
  - *Texturas*
  - *Accesorios*
  - *Extras / NSFW*
- Each item: name + description + price `desde $X` **or** `"Cotizar"` for prices not yet agreed. Team still needs to agree on modular prices; until then they render as "Cotizar". Editing prices = editing JSON, not code.

---

## 7. Gallery + Data Layer

- `gallery.json` = list of `{ file, caption?, date }` entries.
- `/galeria` renders them as a **masonry wall with lightbox**.
- Optimized images live in the website repo (final path — `assets/gallery/` vs `public/gallery/` — decided in Phase 1).
- The landing shows a **featured subset**.

---

## 8. Automation — New Bot Cog (in the `nocturna-bot` repo)

The photo-publishing cog lives **100% inside `nocturna-bot`** (its own repo, following the existing cogs structure). **No bot code in the website repo, no site code in the bot.** It pushes to the website repo **cross-repo** via a GitHub PAT/deploy key.

**Flow:**

1. The cog watches channel **`1416329356426481717`**. When staff post 1+ photos, the bot reacts **✅** to the message (acts as an approve "button").
2. A staff member confirms with **✅** → the bot downloads **all attachments** of that message (Discord allows up to 10), **optimizes them with Pillow** (resize + compression, unique filenames), takes the message text as an optional `caption`, and **commits + pushes** images + a `gallery.json` entry to the website repo.
3. GitHub Pages rebuilds → photos go live.
4. A **🗑️** reaction on an already-published message → the bot removes those images from `gallery.json` and commits the removal.

- **Credentials:** GitHub PAT/deploy key in the bot's `.env`, alongside existing vars.
- **Batch semantics:** one ✅ approves the whole message (1 or many photos); reactions live at message level, not per-attachment.

---

## 9. Phasing (each phase planned & executed separately via GSD)

1. **Foundation** — Astro scaffold, design system/tokens, layout/nav/footer, i18n skeleton, deploy pipeline, migrate current content into components.
2. **Experimental layer** — hero WebGL shader, Lenis/GSAP, View Transitions, signature effects, landing polish.
3. **Catalog** — `services.json` + package pages + modular catalog (ES/EN).
4. **Gallery** — `gallery.json` + masonry/lightbox page + featured subset on landing.
5. **Bot cog** — new cog in `nocturna-bot` (✅ approve / 🗑️ remove / Pillow optimize / cross-repo commit).

Ordering note: Phases 1–4 are website-repo work; Phase 5 is bot-repo work and depends on the `gallery.json` schema being finalized in Phase 4.

---

## 10. Open Items (do not block start)

- **Modular catalog prices** — team to agree; render as "Cotizar" meanwhile.
- **Image storage path** — `assets/gallery/` vs `public/gallery/`, decided in Phase 1.
- **3D (Three.js)** — optional future phase if desired.
- **Terms EN translation** — needs human/legal review before publishing.

---

## 11. Workflow / Skills Mapping

This revamp is driven through the installed skill suite (user priority):

- **context-mode** — kept active to keep context lean.
- **superpowers:brainstorming** — produced this spec.
- **claude-mem** + local memory — persist decisions across sessions.
- **gsd-new-project** — initialize roadmap with the phases above.
- **gsd-discuss-phase → gsd-plan-phase / gsd-ultraplan-phase** — per phase.
- **gsd-ui-phase + frontend-design** — design contract for visual phases.
- **gsd-execute-phase** — atomic-commit execution.
- **gsd-code-review · gsd-secure-phase · gsd-verify-work** — phase close-out.
