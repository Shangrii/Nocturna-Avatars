---
phase: 09-jinxxy-store-auto-sync-new-jinxxy-uploads-appear-in-the-asse
reviewed: 2026-07-13T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - ../nocturna-bot/core/github_publish.py
  - ../nocturna-bot/cogs/jinxxy.py
  - ../nocturna-bot/tests/test_store_publish.py
  - ../nocturna-bot/tests/test_jinxxy_cog.py
  - ../nocturna-bot/tests/test_store_sync.py
  - ../nocturna-bot/config.py
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: fixed
---

# Phase 09: Code Review Report (scoped re-review — plans 09-12 / 09-13)

**Reviewed:** 2026-07-13T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Scoped re-review of ONLY the gap-closure diffs: `set_store_editor` / `_set_store_editor_sync`
(github_publish.py, plan 09-12), the `/tienda editar` command + validation + autocomplete
(cogs/jinxxy.py, plan 09-12), and the English rewrite of `_build_announce_embed`
(cogs/jinxxy.py, plan 09-13). Plans 01-11 were NOT re-reviewed (already covered by the
phase-level `09-REVIEW.md`).

The `set_store_editor` transport is solid: the commit message correctly references only the
validated `checkoutUrl` and never interpolates the raw `editor` string (T-09-22, confirmed by
`test_set_store_editor_commit_message_references_url_not_editor`); the no-op guard, `_comment`
preservation, and byte-identical pass-through of other products/fields are all covered by
tests and match the implementation. The `/tienda editar` command correctly gates staff first,
validates before `defer()`, and follows the established D-05 ephemeral-error contract.

The rewritten `_build_announce_embed` (09-13) introduces one genuine correctness bug (the
embed's headline text is hardcoded to "New" copy regardless of whether anything was actually
added — confirmed by diffing against the pre-09-13 version, where the title was the
change-agnostic "Tienda actualizada") plus two lesser embed-construction defects (an
unrestricted thumbnail fallback, and unsafe hard truncation of markdown-bearing field values).
`/tienda editar`'s success reply also ignores the transport's own no-op signal. None of these
are security or data-loss issues — they are all public-facing/UX correctness defects in the newly
written code, not present before, and worth fixing before this ships to the storefront's
"public conversion surface" (project value: visitors should trust what the announce embed says).

## Critical Issues

### CR-01: Announce embed headline always says "New" even when nothing was added

**File:** `../nocturna-bot/cogs/jinxxy.py:564-569`
**Issue:** `_build_announce_embed` hardcodes the embed's `title` and `description` to
`"New on the Nocturna store"` / `"There's a new product on our webpage — make sure to check it
out!"` unconditionally — regardless of which of `added` / `updated` / `removed` is actually
non-empty:

```python
embed = discord.Embed(
    title="New on the Nocturna store",
    description="There's a new product on our webpage — make sure to check it out!",
    color=_BRAND_RED,
    url=config.JINXXY_STORE_URL,
)
```

A sync cycle that only updates a price (`added=[]`, `updated=[key]`) or only removes a
delisted product (`added=[]`, `removed=[key]`) still posts this exact "New on the Nocturna
store" / "There's a new product" headline to the public announce channel — a false claim.
Before the 09-13 rewrite the title was the change-agnostic `"Tienda actualizada"` ("Store
updated"), which was correct for every bucket combination; the English rewrite regressed this.
None of the test suite's announce tests exercise an updated-only or removed-only `result`
(every `test_announce_*` fixture in `test_jinxxy_cog.py` sets `"added": [KEY]`), so this
regression has no test coverage.

**Fix:**
```python
added = result.get("added") or []
updated = result.get("updated") or []
removed = result.get("removed") or []
if added:
    title = "New on the Nocturna store"
    description = "There's a new product on our webpage — make sure to check it out!"
elif updated:
    title = "Nocturna store updated"
    description = "Some of our products just got updated — take a look!"
else:
    title = "Nocturna store updated"
    description = "The store catalog just changed — take a look!"
embed = discord.Embed(title=title, description=description, color=_BRAND_RED,
                       url=config.JINXXY_STORE_URL)
```
Add a regression test with `added=[]`, `updated=[KEY]` (and one with only `removed`) asserting
the title/description no longer claim "New".

## Warnings

### WR-01: Thumbnail fallback can pick an unrelated, unchanged product's image

**File:** `../nocturna-bot/cogs/jinxxy.py:583-591`
**Issue:**
```python
ordered = [by_key[k] for k in (result.get("added") or []) if k in by_key] + products
for p in ordered:
    images = p.get("images")
    ...
```
`products` here (line 534) is the FULL current store catalog from `result["products"]`
(confirmed by `store_sync.reconcile_store`'s contract in `test_store_sync.py`, e.g.
`test_reconcile_no_op` returns the whole unchanged catalog in `products`), not just the
added/updated/removed set. When no `added` product has a site-relative image, the loop falls
through to `products` and can select the thumbnail from ANY existing, completely unrelated,
unchanged product elsewhere in the store — e.g. a price-only update to "Product A" (no image)
could cause the public "store updated" announcement to show a thumbnail of unrelated
"Product Z" purely because it happens to be first in the catalog and has an `images[0]`. This
is new in 09-13 (there was no thumbnail feature before). No test exercises a multi-product
scenario where an unrelated product has an image and the actually-changed product doesn't, so
this behavior is untested.
**Fix:** Restrict the fallback candidates to the changed set (added + updated), not the whole
catalog:
```python
changed_keys = list(result.get("added") or []) + list(result.get("updated") or [])
ordered = [by_key[k] for k in changed_keys if k in by_key]
```

### WR-02: Hard `[:1024]` truncation can cut a markdown link mid-string

**File:** `../nocturna-bot/cogs/jinxxy.py:576-581`
**Issue:**
```python
lines = _render(keys)
embed.add_field(
    name=f"{label} ({len(keys)})",
    value="\n".join(lines)[:1024], inline=False)
```
Each line can now be a markdown link (`• [name](url)`), introduced by this rewrite. Slicing the
joined string at a fixed byte offset of 1024 can land inside a `[label](url)` span, leaving a
dangling `[`, an unterminated `(url`, or a bare, unescaped URL fragment rendered to the public
channel — previously (plain-text names only) a mid-string cut was cosmetically harmless.
**Fix:** Truncate at a line boundary and add an indicator instead of slicing mid-string, e.g.:
```python
out_lines = []
total_len = 0
for i, line in enumerate(lines):
    if total_len + len(line) + 1 > 1000:
        out_lines.append(f"...and {len(lines) - i} more")
        break
    out_lines.append(line)
    total_len += len(line) + 1
embed.add_field(name=f"{label} ({len(keys)})", value="\n".join(out_lines), inline=False)
```

### WR-03: `/tienda editar` claims a rebuild even when `set_store_editor` no-op'd

**File:** `../nocturna-bot/cogs/jinxxy.py:439-451`
**Issue:** The command discards the return value of `set_store_editor` entirely:
```python
try:
    await github_publish.set_store_editor(producto, cleaned)
except github_publish.GitHubPublishError:
    ...
await interaction.followup.send(
    f"Editor actualizado a «{cleaned}» — la web tarda un par de minutos.",
    ephemeral=True)
```
`set_store_editor` has a documented no-op guard (`{"committed": False, "commit_sha": None}`
when the requested `editor` already matches the current value — see
`test_set_store_editor_unchanged_is_a_noop_no_commit`). When staff re-run `/tienda editar`
with the value it already has, no commit happens, yet the staff member is unconditionally told
"la web tarda un par de minutos" (the website will take a couple minutes) implying a rebuild is
in flight, when none was triggered. `/tienda sync` already branches on `result["changed"]` for
exactly this reason (`"Sincronización lista..."` vs `"Sin cambios."`) — `/tienda editar` should
follow the same idiom. No test asserts the no-op reply text (all editar tests mock
`set_store_editor` to return `{"committed": True, ...}`).
**Fix:**
```python
try:
    result = await github_publish.set_store_editor(producto, cleaned)
except github_publish.GitHubPublishError:
    ...
if result["committed"]:
    msg = f"Editor actualizado a «{cleaned}» — la web tarda un par de minutos."
else:
    msg = f"El editor ya era «{cleaned}»; no hubo cambios."
await interaction.followup.send(msg, ephemeral=True)
```

## Info

### IN-01: `_EDITOR_BAD_CHARS` doesn't block Unicode bidi/format control characters

**File:** `../nocturna-bot/cogs/jinxxy.py:396`
**Issue:** `_EDITOR_BAD_CHARS = re.compile(r"[\x00-\x1f\x7f]")` blocks ASCII C0 control chars +
DEL (matching the stated intent "control chars + newlines", T-09-21) but not Unicode
bidirectional/format control code points (for example U+200B-U+200F zero-width/mark
characters, U+202A-U+202E BIDI embedding/override characters, or U+2066-U+2069 BIDI isolate
characters). Since `editor` is rendered verbatim on the public site
(`ProductCard.astro:98` — `{editorCredit} {product.editor}`, which Astro auto-escapes for HTML
so there's no XSS risk), a staff member (already a trust boundary) could still use a BIDI
override code point to visually spoof the credited name. Low severity given the staff-only
trust boundary, but worth a follow-up if this field is ever surfaced somewhere order-sensitive.
**Fix:** Reject by Unicode category instead of hand-picking ranges — more robust and avoids
embedding actual invisible/BIDI characters anywhere in the codebase or this report:
```python
import unicodedata

def _has_bad_char(s):
    return any(unicodedata.category(ch) in ("Cc", "Cf") for ch in s)
```
and extend the `editar` validation branch to reject when `_has_bad_char(cleaned)` is true.

---

## Fix Log

All 5 findings fixed in the `nocturna-bot` repo (`cogs/jinxxy.py` + `tests/test_jinxxy_cog.py`),
each committed atomically. Full bot suite green after every fix (baseline 360 → 370 passing).

| Finding | nocturna-bot commit | New/updated test(s) |
|---------|--------------------|---------------------|
| CR-01 — announce headline always says "New" | `927e7ca` | `test_announce_updated_only_does_not_claim_new`, `test_announce_removed_only_does_not_claim_new` |
| WR-01 — thumbnail fallback picks unrelated product | `fba4e03` | `test_announce_thumbnail_ignores_unrelated_unchanged_product_image`, `test_announce_thumbnail_uses_updated_product_image` |
| WR-02 — hard `[:1024]` cuts markdown link | `da930cf` | `test_announce_embed_truncates_long_bucket_at_line_boundary` |
| WR-03 — `/tienda editar` claims rebuild on no-op | `35bbf35` | `test_editar_noop_reply_does_not_claim_rebuild`, `test_editar_committed_reply_announces_rebuild` |
| IN-01 — `_EDITOR_BAD_CHARS` misses Unicode Cf/BIDI | `3b1b29b` | `test_editar_unicode_format_char_rejected` (parametrized: RLO / ZWSP / LRI) |

**Final bot suite:** 370 passed.

---

_Reviewed: 2026-07-13T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Fixed: 2026-07-13 — Claude (gsd-code-fixer), all 5 findings_
