# Editable Editor Slug — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Nocturna editor type the name of their public link (`/e/<slug>`) instead of it being locked to their Discord username, renameable anytime, with the old link 404-ing and uploaded media never breaking.

**Architecture:** `discordId` stays the immutable, session-forced identity key. `slug` becomes an editor-typed field validated server-side on save (normalize + reserved-word + uniqueness). Uploaded media moves off the slug and onto a stable, server-assigned per-editor `mediaId`, so a rename never moves a file or breaks an image URL. The static site regenerates `/e/<slug>` from `editors.json` (keyed by `discordId`), so the old slug simply stops being generated → 404, with zero redirect machinery.

**Tech Stack:** Python 3 · Pydantic v2 · FastAPI + Starlette TestClient · pytest 9 (bot repo `nocturna-bot`); Astro 7 static (website repo). Alpine.js in the admin template.

## Global Constraints

- `discordId` is the immutable 1:1 identity key and is ALWAYS force-set from the session on every write (D-08 IDOR guard) — never taken from the request body.
- `slug` is editor-chosen but always passes `resolve_slug`: normalized to `[a-z0-9-]` (Pitfall 5, no traversal), not in `RESERVED_SLUGS`, and not owned by a different `discordId`. The caller's own current slug always passes.
- `mediaId` is stable, immutable, and server-assigned — never read from the client body. Media commit paths use `mediaId` (fallback to `slug` when absent), never a client value.
- Rename model: editable anytime; old `/e/<oldslug>` 404s (no redirect). View count resets on rename (accepted).
- Validation is on save only — no live availability endpoint (YAGNI).
- `RESERVED_SLUGS` = `{"e", "api", "static", "assets", "admin", "editor", "editors", "auth", "login", "logout", "me", "favicon"}`.
- Error copy is bilingual `ES · EN`. Reason→HTTP map: `invalid`→422, `reserved`→422, `taken`→409.
- All bot paths are relative to the `nocturna-bot` repo; website paths to the `Website` repo. Run pytest from the `nocturna-bot` repo root.

---

### Task 1: `mediaId` field + `resolve_slug` gate (`core/editors_model.py`)

**Files:**
- Modify: `core/editors_model.py` (add `RESERVED_SLUGS`, `SlugRejected`, `resolve_slug` after `normalize_slug` ~line 167; add `mediaId` field + validator to `EditorPage` ~line 427)
- Test: `tests/test_editors_model.py`

**Interfaces:**
- Consumes: existing `normalize_slug(raw) -> str` (raises `ValueError` on empty result).
- Produces:
  - `RESERVED_SLUGS: frozenset[str]`
  - `class SlugRejected(ValueError)` with attribute `reason: str` ∈ `{"invalid","reserved","taken"}`
  - `resolve_slug(requested: str, *, self_discord_id: str, editors: list) -> str`
  - `EditorPage.mediaId: str` (default `""`, `[a-z0-9-]`-only when non-empty)

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_editors_model.py` (update the import at line 12):

```python
from core.editors_model import (
    EditorPage, ThemeModel, normalize_slug, resolve_slug, SlugRejected, RESERVED_SLUGS,
)


def test_resolve_slug_normalizes_free_input():
    assert resolve_slug("My Cool Name!", self_discord_id="1", editors=[]) == "my-cool-name"


def test_resolve_slug_rejects_empty_result_as_invalid():
    with pytest.raises(SlugRejected) as ei:
        resolve_slug("../..", self_discord_id="1", editors=[])
    assert ei.value.reason == "invalid"


def test_resolve_slug_rejects_reserved_word():
    with pytest.raises(SlugRejected) as ei:
        resolve_slug("api", self_discord_id="1", editors=[])
    assert ei.value.reason == "reserved"


def test_resolve_slug_rejects_slug_taken_by_another_editor():
    editors = [{"discordId": "2", "slug": "aria"}]
    with pytest.raises(SlugRejected) as ei:
        resolve_slug("Aria", self_discord_id="1", editors=editors)
    assert ei.value.reason == "taken"


def test_resolve_slug_allows_callers_own_current_slug():
    editors = [{"discordId": "1", "slug": "aria"}]
    assert resolve_slug("aria", self_discord_id="1", editors=editors) == "aria"


def test_editorpage_accepts_and_defaults_media_id():
    assert EditorPage(**_base_page()).mediaId == ""
    assert EditorPage(**_base_page(mediaId="a1b2c3d4e5f6a7b8")).mediaId == "a1b2c3d4e5f6a7b8"


def test_editorpage_rejects_traversal_media_id():
    with pytest.raises(ValidationError):
        EditorPage(**_base_page(mediaId="../evil"))
```

- [ ] **Step 2: Run to verify they fail**

Run: `python -m pytest tests/test_editors_model.py -k "resolve_slug or media_id" -v`
Expected: FAIL with `ImportError`/`cannot import name 'resolve_slug'`.

- [ ] **Step 3: Implement `RESERVED_SLUGS` + `SlugRejected` + `resolve_slug`**

In `core/editors_model.py`, immediately after `normalize_slug` (after line 167):

```python
RESERVED_SLUGS = frozenset(
    {
        "e", "api", "static", "assets", "admin", "editor", "editors",
        "auth", "login", "logout", "me", "favicon",
    }
)


class SlugRejected(ValueError):
    """Raised by ``resolve_slug`` when a requested slug is invalid, reserved, or taken.

    ``reason`` is one of ``"invalid"`` / ``"reserved"`` / ``"taken"`` so the HTTP layer
    maps it to a status + localized copy without string-matching the message.
    """

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def resolve_slug(requested: str, *, self_discord_id: str, editors: list) -> str:
    """Return the normalized, non-reserved, unique slug for ``requested`` — or raise.

    The slug is now editor-chosen (no longer session-derived), so this is the load-bearing
    gate: (1) ``normalize_slug`` to ``[a-z0-9-]`` (empty result → ``SlugRejected("invalid")``,
    e.g. ``"../.."`` or ``"!!!"``); (2) reject a reserved route word; (3) reject a slug already
    owned by a DIFFERENT ``discordId`` (the caller's own current slug always passes). ``editors``
    is the full ``editors.json`` array; ``self_discord_id`` is the caller's identity key.
    """
    try:
        slug = normalize_slug(requested)
    except (ValueError, TypeError):
        raise SlugRejected("invalid")
    if slug in RESERVED_SLUGS:
        raise SlugRejected("reserved")
    sid = str(self_discord_id)
    for entry in editors:
        if str(entry.get("discordId")) != sid and entry.get("slug") == slug:
            raise SlugRejected("taken")
    return slug
```

- [ ] **Step 4: Add the `mediaId` field + validator to `EditorPage`**

In `class EditorPage`, add the field right after `discordId: str` (line 427):

```python
    discordId: str
    # Stable, server-assigned per-editor media namespace (decoupled from the mutable slug so
    # a rename never moves a committed file). Empty on pre-feature entries — the transport and
    # save path fall back to the slug until the first save backfills it.
    mediaId: str = Field(default="", max_length=_SLUG_MAX)
```

And add this validator inside `class EditorPage` (e.g. directly after the field block, before the class ends at line 438):

```python
    @field_validator("mediaId")
    @classmethod
    def _media_id_charset(cls, v: str) -> str:
        if v != "" and not re.fullmatch(r"[a-z0-9-]+", v):
            raise ValueError("mediaId must be empty or match [a-z0-9-]")
        return v
```

(`re` and `field_validator` are already imported at the top of the module.)

- [ ] **Step 5: Run to verify they pass**

Run: `python -m pytest tests/test_editors_model.py -v`
Expected: PASS (all existing + 7 new).

- [ ] **Step 6: Commit**

```bash
git add core/editors_model.py tests/test_editors_model.py
git commit -m "editors: add resolve_slug gate + stable mediaId field"
```

---

### Task 2: Media keyed by `mediaId` in the commit transport (`core/github_publish.py`)

**Files:**
- Modify: `core/github_publish.py` — `_sync_editors_sync` (~lines 1016, 1027, 1047)
- Test: `tests/test_github_publish_editors.py`

**Interfaces:**
- Consumes: `entry` dict now optionally carries `mediaId` (Task 1).
- Produces: image blobs commit under `{WEBSITE_EDITORS_IMAGE_DIR}/<mediaId or slug>/<filename>`; prune targets the same dir. Commit message + return value stay keyed on `slug`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_github_publish_editors.py`:

```python
def test_sync_editors_images_land_under_media_id_not_slug(wire):
    # With a mediaId, blobs commit under public/editors/<mediaId>/ — NOT the slug dir —
    # so a later slug rename never orphans the media.
    fake = wire(FakeGitHub(base_editors=[]))
    entry = _editor(slug="aria-nueva", discord_id="AAA", mediaId="tok123abc")
    asyncio.run(github_publish.sync_editors(entry, images=[("pic.webp", b"BYTES")]))
    blob_paths = [t["path"] for t in fake.blob_tree_entries()]
    assert "public/editors/tok123abc/pic.webp" in blob_paths
    assert not any("/aria-nueva/" in p for p in blob_paths)


def test_sync_editors_falls_back_to_slug_when_no_media_id(wire):
    # Backward-compat: a pre-feature entry with no mediaId still commits under the slug dir.
    fake = wire(FakeGitHub(base_editors=[]))
    entry = _editor(slug="aria", discord_id="AAA")  # no mediaId
    asyncio.run(github_publish.sync_editors(entry, images=[("pic.webp", b"BYTES")]))
    blob_paths = [t["path"] for t in fake.blob_tree_entries()]
    assert "public/editors/aria/pic.webp" in blob_paths
```

- [ ] **Step 2: Run to verify they fail**

Run: `python -m pytest tests/test_github_publish_editors.py -k "media_id or falls_back" -v`
Expected: FAIL — the blob path still uses the slug (`public/editors/aria-nueva/pic.webp`).

- [ ] **Step 3: Implement the media-key switch**

In `core/github_publish.py`, `_sync_editors_sync`, find line 1016:

```python
    slug = entry["slug"]
```

Replace with:

```python
    slug = entry["slug"]
    # Media lives under a STABLE key so a slug rename never moves a committed file. Fall
    # back to the slug for pre-feature entries that have no mediaId yet.
    media_key = entry.get("mediaId") or slug
```

Then change the image blob path (line ~1027) from `f"{image_dir}/{slug}/{filename}"` to:

```python
            "path": f"{image_dir}/{media_key}/{filename}",
```

And the prune dir (line ~1047) from `slug_dir = f"{image_dir}/{slug}"` to:

```python
        slug_dir = f"{image_dir}/{media_key}"
```

Leave the commit message (`f"editors: publish {slug}"`, line ~1035) and the return `"slug": slug` (line ~1072) UNCHANGED — the human-facing commit + API contract stay keyed on the slug.

- [ ] **Step 4: Run to verify they pass**

Run: `python -m pytest tests/test_github_publish_editors.py -v`
Expected: PASS (all existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add core/github_publish.py tests/test_github_publish_editors.py
git commit -m "editors: commit uploaded media under stable mediaId dir"
```

---

### Task 3: Seed `mediaId` on first-login draft (`app/auth.py`)

**Files:**
- Modify: `app/auth.py` — add `import secrets`; seed `mediaId` in `ensure_draft` (~line 155)
- Test: `tests/test_app_auth.py`

**Interfaces:**
- Consumes: `EditorPage` (now has a `mediaId` field, Task 1).
- Produces: a new draft entry carries `mediaId = secrets.token_hex(8)` (16 lowercase hex chars — passes the `[a-z0-9-]` validator and is collision-free by construction).

- [ ] **Step 1: Write the failing test**

Append to `tests/test_app_auth.py` (add `import re` at the top if not present):

```python
def test_ensure_draft_seeds_random_media_id(monkeypatch):
    import asyncio
    from app import auth

    captured = {}

    async def fake_fetch_editors():
        return []

    async def fake_sync(entry, *a, **k):
        captured["entry"] = entry
        return {"committed": True, "commit_sha": "x", "slug": entry["slug"], "files": []}

    monkeypatch.setattr(auth, "_fetch_editors", fake_fetch_editors)
    monkeypatch.setattr(auth.github_publish, "sync_editors", fake_sync)

    result = asyncio.run(auth.ensure_draft("999888777", "NewEditor"))

    assert re.fullmatch(r"[0-9a-f]{16}", result["mediaId"])
    assert captured["entry"]["mediaId"] == result["mediaId"]
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_app_auth.py -k seeds_random_media_id -v`
Expected: FAIL — `KeyError: 'mediaId'` (draft has no mediaId yet).

- [ ] **Step 3: Implement the seed**

In `app/auth.py`, add to the imports at the top of the file:

```python
import secrets
```

In `ensure_draft`, change the `EditorPage(...)` construction (line ~155) to pass a fresh `mediaId`:

```python
    entry = EditorPage(
        slug=slug,
        discordId=target,
        mediaId=secrets.token_hex(8),
        published=False,
        name=(username or slug)[:100],
        lang="es",
    ).model_dump()
```

- [ ] **Step 4: Run to verify it passes**

Run: `python -m pytest tests/test_app_auth.py -v`
Expected: PASS (all existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add app/auth.py tests/test_app_auth.py
git commit -m "editors: seed a stable random mediaId on first-login draft"
```

---

### Task 4: Wire the editable slug through the save + upload endpoints (`app/main.py`)

**Files:**
- Modify: `app/main.py` — import (`line 56`); add `_SLUG_REJECT` copy map (near line 85); `_apply_session_identity` (lines 598-609); `save_editor` (lines 612-644); the three upload endpoints' return-path key (lines 444/461, 522/539, 576/594)
- Test: `tests/test_app_editor.py`

**Interfaces:**
- Consumes: `resolve_slug`, `SlugRejected` (Task 1); `github_publish._fetch_json` (existing); `_fetch_current_entry` (existing).
- Produces: `POST /editor/save` honors the body's `slug` (validated), forces `discordId`/`mediaId` from the server, refreshes `request.session["slug"]`, and maps `SlugRejected` to 422/409. Upload endpoints return paths under the entry's `mediaId`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_app_editor.py`:

```python
def _valid_page_body(slug="mi-link", **overrides):
    body = {"name": "Aria", "lang": "es", "slug": slug}
    body.update(overrides)
    return body


def test_save_honors_typed_slug_and_forces_identity(monkeypatch, client):
    import app.main as main
    editors = [{"discordId": "555", "slug": "aria", "mediaId": "tok999"}]
    monkeypatch.setattr(main.github_publish, "_fetch_json", lambda *a, **k: editors)

    captured = {}

    async def fake_sync(entry, images=(), *, message=None, prune=False):
        captured["entry"] = entry
        return {"committed": True, "commit_sha": "x", "slug": entry["slug"], "files": []}

    monkeypatch.setattr(main.github_publish, "sync_editors", fake_sync)

    resp = client.post("/editor/save", json=_valid_page_body(slug="Mi Nuevo Link!"))

    assert resp.status_code == 200
    assert captured["entry"]["slug"] == "mi-nuevo-link"   # typed slug, normalized
    assert captured["entry"]["discordId"] == "555"        # identity forced from session
    assert captured["entry"]["mediaId"] == "tok999"       # mediaId preserved from entry


def test_save_rejects_slug_taken_by_another_editor(monkeypatch, client):
    import app.main as main
    editors = [
        {"discordId": "555", "slug": "aria", "mediaId": "tokme"},
        {"discordId": "999", "slug": "taken-name", "mediaId": "tokother"},
    ]
    monkeypatch.setattr(main.github_publish, "_fetch_json", lambda *a, **k: editors)

    sync_calls = []

    async def fake_sync(*a, **k):
        sync_calls.append(1)
        return {}

    monkeypatch.setattr(main.github_publish, "sync_editors", fake_sync)

    resp = client.post("/editor/save", json=_valid_page_body(slug="taken-name"))

    assert resp.status_code == 409
    assert sync_calls == []  # nothing committed


def test_save_rejects_reserved_slug(monkeypatch, client):
    import app.main as main
    editors = [{"discordId": "555", "slug": "aria", "mediaId": "tokme"}]
    monkeypatch.setattr(main.github_publish, "_fetch_json", lambda *a, **k: editors)

    sync_calls = []

    async def fake_sync(*a, **k):
        sync_calls.append(1)
        return {}

    monkeypatch.setattr(main.github_publish, "sync_editors", fake_sync)

    resp = client.post("/editor/save", json=_valid_page_body(slug="api"))

    assert resp.status_code == 422
    assert sync_calls == []


def test_upload_image_returns_path_under_media_id(monkeypatch, client):
    import app.main as main
    monkeypatch.setattr(main, "optimize_to_webp", lambda raw: (b"WEBP", 10, 10))

    async def fake_current(discord_id):
        return {"slug": "aria", "discordId": "555", "mediaId": "tok777",
                "published": True, "name": "Aria", "avatar": "", "links": [], "blocks": []}

    async def fake_sync(entry, images=(), *, message=None, prune=False):
        return {"committed": True, "commit_sha": "x", "slug": entry["slug"], "files": []}

    monkeypatch.setattr(main, "_fetch_current_entry", fake_current)
    monkeypatch.setattr(main.github_publish, "sync_editors", fake_sync)

    resp = client.post("/editor/image", files={"file": ("a.png", b"x", "image/png")})

    assert resp.status_code == 200
    assert "/editors/tok777/" in resp.json()["path"]
```

- [ ] **Step 2: Run to verify they fail**

Run: `python -m pytest tests/test_app_editor.py -k "typed_slug or taken or reserved or under_media_id" -v`
Expected: FAIL — save still overrides the slug from the session (`_IDENT["slug"] == "aria"`), no 409/422 path exists, and the image path uses `aria` not `tok777`.

- [ ] **Step 3: Update the import + add the reason→copy map**

In `app/main.py` line 56, extend the import:

```python
from core.editors_model import EditorPage, resolve_slug, SlugRejected
```

Add this constant near the other copy constants (after `_PUBLISH_SUCCESS_COPY`, ~line 90):

```python
# Slug-rejection copy, keyed by SlugRejected.reason → (HTTP status, bilingual message).
_SLUG_REJECT = {
    "invalid": (422, "Elige un nombre de link válido (letras, números y guiones). · "
                     "Choose a valid link name (letters, numbers, hyphens)."),
    "reserved": (422, "Ese nombre de link está reservado, elige otro. · "
                      "That link name is reserved — choose another."),
    "taken": (409, "Ese nombre de link ya está en uso. · That link name is already taken."),
}
```

- [ ] **Step 4: Rewrite `_apply_session_identity`**

Replace the function (lines 598-609) with:

```python
def _apply_session_identity(payload: dict, ident: dict, *, slug: str,
                            media_id: str, published: bool) -> dict:
    """Merge a client save payload with SERVER-controlled identity fields (never the body's).

    ``discordId`` is forced from the trusted session (D-08 IDOR guard). ``slug`` is the
    ALREADY-VALIDATED editor-chosen value from ``resolve_slug`` (not the session's stale
    copy). ``mediaId`` is the server-side stable media key. A body attempting to smuggle any
    of these is silently overridden, not merely rejected (Pitfall 1).
    """
    merged = dict(payload)
    merged["discordId"] = str(ident["discord_id"])
    merged["slug"] = slug
    merged["mediaId"] = media_id
    merged["published"] = published
    return merged
```

- [ ] **Step 5: Rewrite `save_editor`**

Replace the body of `save_editor` (lines 621-643, from `try: body = await request.json()` through the final `return`) with:

```python
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # Fetch the full array ONCE: it feeds both the uniqueness check and the current entry.
    editors = await run_in_threadpool(
        github_publish._fetch_json,
        config.WEBSITE_REPO, config.WEBSITE_BRANCH, config.WEBSITE_EDITORS_JSON)
    current = next(
        (e for e in editors if str(e.get("discordId")) == str(ident["discord_id"])), None)

    # The slug is now editor-chosen — validate it server-side (normalize + reserved + unique).
    try:
        slug = resolve_slug(
            body.get("slug", ""), self_discord_id=ident["discord_id"], editors=editors)
    except SlugRejected as exc:
        status, copy = _SLUG_REJECT[exc.reason]
        return JSONResponse(status_code=status, content={"error": copy})

    # mediaId is stable: reuse the entry's; backfill a pre-feature entry to its CURRENT slug
    # (where its media already lives); brand-new-with-no-draft falls back to the new slug.
    media_id = (current or {}).get("mediaId") or (current or {}).get("slug") or slug

    merged = _apply_session_identity(body, ident, slug=slug, media_id=media_id, published=True)

    try:
        entry = EditorPage(**merged).model_dump()
    except ValidationError as exc:
        return JSONResponse(status_code=422, content={"error": str(exc)})

    try:
        # prune=True: at Save the entry is the complete source of truth, so orphaned
        # media in this editor's mediaId dir is cleaned up (never on the upload commits).
        await github_publish.sync_editors(entry, prune=True)
    except github_publish.GitHubPublishError:
        log.exception("editor save commit failed")
        return JSONResponse(status_code=502, content={"error": _SAVE_FAILED_COPY})

    # Keep the session slug consistent after a rename (used by the editor GET fallback).
    request.session["slug"] = slug
    return {"message": _PUBLISH_SUCCESS_COPY, "published": True}
```

- [ ] **Step 6: Point the three upload return-paths at `mediaId`**

In each of `upload_image`, `upload_media`, `upload_audio`: delete the early `slug = ident["slug"]` line, and after the `current is None` guard add a media-key line, then use it in the returned `path`.

`upload_image` (lines ~444-461): delete `slug = ident["slug"]` (line 444). After the `if current is None:` guard (line 448) add:

```python
    media_key = current.get("mediaId") or current["slug"]
```

Change the final path line (461) to:

```python
    path = f"/{url_dir.lstrip('/')}/{media_key}/{out_name}"
```

Apply the exact same three edits to `upload_media` (delete line 522, add `media_key` after its `current is None` guard at line 526, change line 539) and `upload_audio` (delete line 576, add `media_key` after its guard at line 581, change line 594).

- [ ] **Step 7: Fix any pre-existing save test that now hits the network**

The OLD `save_editor` did no fetch; the new one calls `github_publish._fetch_json`. Any pre-existing `POST /editor/save` test that mocked only `sync_editors` will now hit the real network and fail. For each such test, add:

```python
    monkeypatch.setattr(main.github_publish, "_fetch_json",
                        lambda *a, **k: [{"discordId": "555", "slug": "aria", "mediaId": "tok"}])
```

and make sure the posted body carries a `slug` (e.g. `"aria"`) so `resolve_slug` passes. Do NOT weaken any existing assertion — only add the mock + slug so the test reaches the same code path it did before.

- [ ] **Step 8: Run to verify they pass**

Run: `python -m pytest tests/test_app_editor.py -v`
Expected: PASS (all existing — with the added `_fetch_json` mock — plus the 4 new). The existing upload test `test_upload_image_valid_commits_reencoded_webp_under_session_slug` still passes because its mocked entry has no `mediaId`, so `media_key` falls back to `slug == "aria"`.

- [ ] **Step 9: Commit**

```bash
git add app/main.py tests/test_app_editor.py
git commit -m "editors: honor typed slug on save; return upload paths under mediaId"
```

---

### Task 5: Slug field in the admin editor form (`app/templates/editor.html`)

**Files:**
- Modify: `app/templates/editor.html` — add the slug field after the name input (line 52); add `normalizeSlug`/`normalizeSlugLive` + `linkBase` to the Alpine component (~line 864 data / near the methods); add `slug` to `serialize()` (line 1213)
- Test: `tests/test_app_editor.py` (render smoke test)

**Interfaces:**
- Consumes: `page.slug` (already initialized at line 864 `slug: initial.slug || ''`); the `MEDIA_BASE` const (line 658); `POST /editor/save` (Task 4) which now reads `body.slug`.
- Produces: the save payload carries `slug`; the field live-normalizes to `[a-z0-9-]`.

- [ ] **Step 1: Write the failing render test**

Append to `tests/test_app_editor.py`:

```python
def test_editor_page_renders_slug_field(monkeypatch, client):
    import app.main as main

    async def fake_current(discord_id):
        return {"slug": "aria", "discordId": "555", "mediaId": "tok",
                "published": True, "name": "Aria", "avatar": "", "tagline": "",
                "links": [], "blocks": []}

    monkeypatch.setattr(main, "_fetch_current_entry", fake_current)

    resp = client.get("/editor")
    assert resp.status_code == 200
    assert 'id="f-slug"' in resp.text
```

- [ ] **Step 2: Run to verify it fails**

Run: `python -m pytest tests/test_app_editor.py -k renders_slug_field -v`
Expected: FAIL — no `id="f-slug"` in the rendered HTML.

- [ ] **Step 3: Add the slug field markup**

In `app/templates/editor.html`, immediately after the name input (line 52, `<input id="f-name" ... />`), insert:

```html
          <label class="label" for="f-slug">Tu link · Your link</label>
          <input id="f-slug" type="text" x-model="page.slug"
                 @input="page.slug = normalizeSlugLive(page.slug)"
                 @blur="page.slug = normalizeSlug(page.slug)"
                 maxlength="64" spellcheck="false" autocapitalize="off" autocomplete="off" />
          <p class="field-hint">
            <span x-text="linkBase + (page.slug || '…')"></span><br />
            Cambiar el nombre cambia tu link público: el link anterior deja de funcionar y
            el contador de vistas se reinicia. · Renaming changes your public link — the old
            link stops working and the view count resets.
          </p>
```

- [ ] **Step 4: Add the normalizer helpers + `linkBase`**

In the Alpine component's returned data object, next to `slug: initial.slug || ''` (line 864), add:

```javascript
        linkBase: (MEDIA_BASE || '') + '/e/',
```

In the component's methods (anywhere among the other methods, e.g. next to `socialKey`), add:

```javascript
        // Live-normalize as the user types: lowercase + collapse invalid runs to '-', but
        // KEEP a trailing '-' so typing "my-name" isn't fought mid-word. Full normalize (with
        // leading/trailing '-' stripped) runs on blur; the server re-normalizes as source of truth.
        normalizeSlugLive(raw) {
          return String(raw || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        },
        normalizeSlug(raw) {
          return String(raw || '').toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        },
```

- [ ] **Step 5: Send `slug` in the save payload**

In `serialize()` (line 1213), add `slug` as the first key of the returned object:

```javascript
          return {
            slug: this.page.slug,
            name: this.page.name,
```

- [ ] **Step 6: Run the render test + full endpoint suite**

Run: `python -m pytest tests/test_app_editor.py -v`
Expected: PASS (all existing + the render test).

- [ ] **Step 7: Commit**

```bash
git add app/templates/editor.html tests/test_app_editor.py
git commit -m "editors(admin): editable link-name field with live slug normalization"
```

---

### Task 6: Website — type + build verification (`Website` repo)

**Files:**
- Modify: `src/lib/editorTypes.ts` (add optional `mediaId?: string` to the `Editor` interface)
- Verify: `src/pages/e/[slug].astro`, `src/pages/[lang]/[concept]/[slug].astro`

**Interfaces:**
- Consumes: `editors.json` written by the bot (now carries `mediaId`).
- Produces: no runtime change — the site reads `slug` only; this task documents the new field in the type and proves the build stays green.

- [ ] **Step 1: Add the optional field to the Editor type**

In `src/lib/editorTypes.ts`, find the `Editor` interface (the one with `slug: string; discordId: ...`) and add, next to `discordId`:

```typescript
  /** Stable server-assigned media namespace (bot-written). Not read by the site. */
  mediaId?: string;
```

- [ ] **Step 2: Confirm no route pins an old slug**

Run: `grep -rn "redirect\|301\|302" src/pages/e/ src/pages/\[lang\]/`
Expected: no redirect that maps a hard-coded old slug to a new one. Both `getStaticPaths` build purely from `editors.json[].slug`, so a renamed entry drops its old path automatically (the intended 404). If a redirect map surfaces here that pins a specific slug, STOP and report it — it would resurrect a renamed-away link.

- [ ] **Step 3: Build the site**

Run: `npm run build`
Expected: `Complete!` with 22 page(s) built, no type error on the new `mediaId` field.

- [ ] **Step 4: Commit**

```bash
git add src/lib/editorTypes.ts
git commit -m "editors: document optional mediaId on the Editor type"
```

---

## Notes for the executor

- **Two repos, two commit streams.** Tasks 1-5 commit in `nocturna-bot`; Task 6 commits in `Website`. Do not cross the streams.
- **The website repo's `revamp` branch auto-deploys on push;** the bot repo does NOT (manual `git pull` + `sudo systemctl restart nocturna-editor-admin` on cinema). Flag both at the end so the human deploys each.
- **No live migration runs.** Existing editors (shangri, impyh) keep their current media URLs; their `mediaId` is backfilled to their then-current slug on their next save (Task 4, `media_id` fallback). No script touches their committed files.
- **Run the whole bot suite once at the end:** `python -m pytest -q` from the `nocturna-bot` root — nothing outside these files should change.
