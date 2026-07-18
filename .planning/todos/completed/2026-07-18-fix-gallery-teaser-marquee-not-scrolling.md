---
created: 2026-07-18T09:17:09.742Z
title: Fix gallery teaser marquee not scrolling horizontally
area: ui
files:
  - src/components/sections/FeaturedGallery.astro
  - src/scripts/motion/choreography.ts
---

## Problem

UAT of Phase 02 (2026-07-18): the landing's gallery teaser does not scroll horizontally on vertical scroll (02-VERIFICATION.md test 9 describes this effect). User flagged it as an unexpected bug.

**INVESTIGATED (2026-07-18) — NOT A BUG, it's a deliberate removal.** Root cause is documented in `src/scripts/motion/choreography.ts:9-13`: the horizontal marquee (decision D-14) targeted an OLD placeholder `Teaser` component (`[data-teaser]` hooks). In Phase 4 that placeholder was replaced by the real `FeaturedGallery.astro` — "a simple static CSS grid of tilted polaroids" (its own header comment, line 11). The marquee's target element ceased to exist, the effect was permanently inert (querySelector always null), and it was intentionally removed rather than re-wired since no new motion was requested. So the 02-VERIFICATION test 9 is STALE — it describes an effect that was cut by design.

## Solution

**RESOLVED (2026-07-18).** User chose to keep the effect removed and clean up dead references ("elimina el código que no sirva"). No executable dead code existed — the marquee code was already removed when the placeholder Teaser was replaced in Phase 4. Cleaned up the 3 remaining STALE COMMENTS that still referenced the removed marquee/parallax effects (which was misleading):
- `src/scripts/motion/index.ts:36` — "Landing marquee/tilt/parallax (D-14/15/16)" → "Landing package-card 3D tilt (D-15)"
- `src/scripts/motion/reveals.ts:105` — "choreo-marquee / choreo-parallax triggers" → "choreo-* triggers"
- `src/scripts/motion/choreography.ts` header — removed the D-14/D-16 removal paragraph and the "no marquee scrub / no parallax" clause; header now describes only the D-15 tilt it actually does.

The current static polaroid grid is the intended design. 02-VERIFICATION.md test 9 (which describes the removed marquee) is obsolete and can be struck if that file is ever revisited. Comment-only changes, uncommitted pending user's commit decision.
