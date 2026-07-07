---
created: 2026-07-07T06:11:37.885Z
title: Reuse gallery background on other pages
area: ui
files: []
---

## Problem

During pre-Phase-6 testing (2026-07-07) the user said the gallery page background is a standout ("me gustó demasiado") and wants it available on other pages of the site, not just the gallery.

## Solution

Extract the gallery page's background treatment into a reusable component/utility (Astro component or shared CSS layer) and apply it to other pages. Decide with the user which pages get it (all pages vs. selected ones) — likely a discuss-phase question for the visual work in Phase 6 / redesign phase. Watch performance: the background must not slow page load (project constraint).
