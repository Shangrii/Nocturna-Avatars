<!-- GSD:project-start source:PROJECT.md -->
## Project

**Nocturna Avatars — Website Revamp**

A revamp of the public website for **Nocturna Avatars**, a team that does professional VRChat avatar editing (outfits, accessories, dances, textures, 3D/Blender work). The new site is a highly aesthetic, "máximo experimental" street/graffiti portfolio that showcases work, sells service packages, and drives visitors to open a Discord ticket — and it **auto-updates its gallery** from photos staff post in Discord, with no code changes needed.

**Core Value:** A visitor lands, is visually impressed by the work, and reaches "Abrir Ticket" on Discord — while staff keep the gallery and catalog current without touching code.

### Constraints

- **Tech stack**: Astro (static output) — must stay deployable to GitHub Pages and preserve the CNAME/domain.
- **Hosting/Cost**: free static hosting; no backend/DB. The bot publishes by committing to the repo.
- **Repo separation**: the photo cog must live in the `nocturna-bot` repo, not the website repo — pushes cross-repo via a GitHub PAT/deploy key.
- **i18n**: ES + EN required from launch; Terms EN translation needs human/legal review.
- **Brand**: keep red `#c0192c` / navy `#0a0c14` / off-white `#f0eae4`, graffiti font "A Another Tag" + Permanent Marker + Inter + Space Mono, film-grain texture.
- **Performance**: experimental but must load fast and not bury the conversion path.
- **Workflow**: driven via the installed skill suite (GSD, superpowers, claude-mem, context-mode) per user request.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
