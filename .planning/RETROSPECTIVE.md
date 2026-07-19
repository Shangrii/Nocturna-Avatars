# Retrospective — Nocturna Avatars

## Milestone: v1.0 — Website Revamp

**Shipped:** 2026-07-19
**Phases:** 13 | **Plans:** 77 | **Tasks:** 141

### What Was Built
The full public site revamp: an Astro static, bilingual (ES/EN) "máximo experimental"
street/editorial portfolio — convertible landing with a persistent Discord CTA, a motion
layer (Lenis + GSAP + WebGL hero) re-skinned into a Refined Street Editorial system,
data-driven service catalog + configurator cart, a night-evidence-board gallery, an asset
store with Jinxxy checkout, a reviews/testimonials pipeline, and per-editor guns.lol/carrd
`/e/<slug>` profile pages. Plus the cross-repo `nocturna-bot` half: photo-publishing,
reviews, reminders, Jinxxy auto-sync cogs, and the project's first authenticated web
surface — a Discord-OAuth FastAPI admin app on the cinema host.

### What Worked
- **Ship-early, slice-by-slice**: each phase was end-to-end deployable with the conversion
  path intact, so the site was live and useful from Phase 1.
- **Cross-repo transport reuse**: the atomic GitHub Git Data API commit core (blobs→tree→
  commit→ref) built in Phase 5 was reused verbatim by reviews, store, and editors — new
  publishers were thin, low-regression additions.
- **Security-load-bearing design up front**: the editor admin app established its trust
  boundary (OAuth CSRF, IDOR session-only identity, image/SVG rejection, closed block union,
  theme-injection validation) before any editing UI.
- **Subagent-driven execution + review gates** on the later features kept quality high with
  fast iteration.

### What Was Inefficient
- **Two production-deploy incidents** in Phase 5 (a single Pages environment; Actions
  deploy-pages flakiness) forced a pivot to a gh-pages force-push topology mid-cutover.
- **Live human-verification lag**: Phases 9/10 sat "code-complete but not live-verified"
  because deploying to cinema was a manual step — and the admin app was mistakenly left as a
  hand-started orphaned uvicorn, so it silently ran stale code (a lingering `Locale` bug)
  until it was serviced properly on 2026-07-19.
- **Config sprawl**: bot configuration accumulated across `.env` / code / JSON, which became
  the motivation for the next milestone.

### Patterns Established
- Data-file-driven content (JSON as the staff-editable source of truth; the site never needs
  code changes to update content).
- Cross-repo bot-commits as the "backend" for a static site.
- `EnvironmentFile`-free systemd units: apps self-load `.env` via `config.py` load_dotenv, so
  systemd's non-comment-stripping parser can't corrupt values.
- Auto-deploy via a polling systemd timer (`nocturna-deploy.timer` → `autodeploy.sh`) that
  restarts all bot services on a new `origin/main`.

### Key Lessons
- A `git pull` never reloads a running Python service — long-lived processes must be systemd
  services covered by the deploy script, or they silently run stale code.
- "Manual human verify" gaps accumulate; wiring the live deploy so the code actually runs is
  worth doing before declaring a phase done.
- Reusing a single audited transport core beats re-implementing per-feature publishers.

### Cost Observations
- Model mix (v1.0 execution): predominantly sonnet for implementation, opus for
  architecture/final reviews, haiku for mechanical transcription tasks.
- Notable: the subagent-driven model (fresh implementer + reviewer per task) caught
  spec/security issues early on the editable-slug feature at low controller-context cost.

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 13 |
| Plans | 77 |
| Tasks | 141 |
| Repos spanned | 2 (Website + nocturna-bot) |
| Production incidents | 2 (both Phase-5 deploy, resolved) |
