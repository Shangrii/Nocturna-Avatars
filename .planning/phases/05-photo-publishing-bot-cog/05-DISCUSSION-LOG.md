# Phase 5: Photo-Publishing Bot Cog - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 5-photo-publishing-bot-cog
**Areas discussed:** Approval flow & permissions, Removal (🌙) behavior, Image processing policy, Publish target & resilience

---

## Approval flow & permissions

### Who can approve with ✅? (channel is public)

| Option | Description | Selected |
|--------|-------------|----------|
| Specific staff role(s) (Recommended) | Role ID list in cog config/.env; only role holders trigger publish | ✓ |
| Discord permission check | Anyone with e.g. Manage Messages in the channel | |
| Hardcoded user allowlist | Specific user IDs in config | |

**User's choice:** Specific staff role(s)

### Can a staff member approve their own post?

| Option | Description | Selected |
|--------|-------------|----------|
| Self-approval OK (Recommended) | Any staff ✅ publishes, including the poster's own | ✓ |
| Second staff member required | Four-eyes review before photos go live | |

**User's choice:** Self-approval OK

### Success confirmation in channel?

| Option | Description | Selected |
|--------|-------------|----------|
| Reply embed (Recommended) | Persistent reply with count + gallery link | |
| Reactions only | Status reaction swaps, zero channel noise | |
| Reply, then auto-delete | Confirmation reply deletes itself after ~1 min | ✓ |

**User's choice:** Reply, then auto-delete

### Already-published / duplicate ✅ handling?

| Option | Description | Selected |
|--------|-------------|----------|
| Marker reaction + silent no-op (Recommended) | Persistent 🟢-style marker after publish; extra ✅s ignored | ✓ |
| Silent no-op only | Internal tracking, no visible marker | |
| Auto-delete 'already published' notice | Brief self-deleting reply on duplicates | |

**User's choice:** Marker reaction + silent no-op

---

## Removal (🌙) behavior

### When should the remove reaction act?

| Option | Description | Selected |
|--------|-------------|----------|
| Unpublish + dismiss (Recommended) | Removes published photos; dismisses pending posts | ✓ |
| Unpublish only | Only acts on published messages (strict BOT-05) | |

**User's choice:** Unpublish + dismiss

### Who can trigger removal?

| Option | Description | Selected |
|--------|-------------|----------|
| Same staff roles as ✅ (Recommended) | One trust level, one role list | ✓ |
| Stricter role for removal | Separate smaller list (e.g. leads only) | |

**User's choice:** Same staff roles as ✅

### Feedback after unpublish?

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror the publish feedback (Recommended) | Auto-delete reply + marker off; re-✅ can republish | ✓ |
| Marker change only | No reply; marker removed/swapped | |

**User's choice:** Mirror the publish feedback

### Published message deleted from Discord?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-unpublish on delete (Recommended) | Channel = source of truth; delete removes from site | ✓ |
| Photos stay live | Orphans removable only by manual gallery.json edit | |

**User's choice:** Auto-unpublish on delete

### Remove emoji (USER-RAISED)

> User (free text, ES): the 🗑️ trash can on an art post in a public channel could be
> perceived as "the photo is ugly" — wants a different emoji.

| Option | Description | Selected |
|--------|-------------|----------|
| ↩️ Undo arrow (Recommended) | Reads as revert/take-back, universally understood | |
| 🗃️ Archive box | Neutral "stored away" | |
| 🌙 Moon | On-brand for Nocturna — "send it back to the night" | ✓ |

**User's choice:** 🌙 Moon — supersedes BOT-05's 🗑️ literal (behavior unchanged)

---

## Image processing policy

### Output format?

| Option | Description | Selected |
|--------|-------------|----------|
| Convert all to WebP (Recommended) | ~25–35% smaller than JPEG, one consistent format | ✓ |
| Convert all to JPEG | Most familiar/compatible | |
| Keep original format | Least processing; PNGs stay heavy | |

**User's choice:** Convert all to WebP

### Max published size?

| Option | Description | Selected |
|--------|-------------|----------|
| Max 1920px long edge (Recommended) | Sharp in lightbox, ~10× lighter than raw 4K | ✓ |
| Max 2560px long edge | Extra sharpness for QHD/4K, heavier | |
| Max 1280px long edge | Lightest, visibly soft full-screen | |

**User's choice:** Max 1920px long edge

### Non-image attachments in an approved message?

| Option | Description | Selected |
|--------|-------------|----------|
| Publish images, note skips (Recommended) | Confirmation enumerates skipped files | |
| Publish images, skip silently | No mention of skipped files | ✓ |
| Reject the whole message | Forces photo-only posts | |

**User's choice:** Publish images, skip silently

### Filename convention?

| Option | Description | Selected |
|--------|-------------|----------|
| date + message ID + index (Recommended) | Message→files mapping baked into the name; stateless removal | ✓ |
| date + caption slug + hash | Prettier URLs, needs a state mapping | |
| You decide | Claude's discretion during planning | |

**User's choice:** date + message ID + index

---

## Publish target & resilience

### Target branch?

| Option | Description | Selected |
|--------|-------------|----------|
| Configurable via .env (Recommended) | e.g. WEBSITE_BRANCH=revamp; flip at cutover, zero code changes | ✓ |
| Hardcode 'revamp' | Matches today's deploy trigger; code edit to change | |
| Always the default branch | Wouldn't deploy until cutover | |

**User's choice:** Configurable via .env

### Failure visibility?

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent error reply + ⚠️ (Recommended) | Not auto-deleting; doubles as retry to-do | ✓ |
| Auto-delete error reply | Can scroll away unseen | |
| DM the approver | Private, invisible to the team | |

**User's choice:** Persistent error reply + ⚠️

### Auto-retry?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-retry, then report (Recommended) | Backoff retries for transient failures, then ⚠️ | ✓ |
| No auto-retry | Report immediately; staff re-✅ to retry | |

**User's choice:** Auto-retry, then report

### Downtime handling?

| Option | Description | Selected |
|--------|-------------|----------|
| Backfill on startup (Recommended) | Scan history, add missed prompts, process missed reactions | ✓ |
| Live events only | Missed events require manual re-✅ | |

**User's choice:** Backfill on startup

### Backfill window? (extra round requested by user)

| Option | Description | Selected |
|--------|-------------|----------|
| Since last processed message (Recommended) | Persisted last-message-ID marker; nothing ever missed | ✓ |
| Fixed window (e.g. last 100 messages) | Simpler; long outages could exceed it | |
| You decide | Claude's discretion | |

**User's choice:** Since last processed message

### Whose posts get the ✅ prompt?

| Option | Description | Selected |
|--------|-------------|----------|
| Staff posts only (Recommended) | Prompt only on staff-role image posts; gallery stays 100% Nocturna | ✓ |
| Any image post | Staff could approve community photos (broader than BOT-01) | |

**User's choice:** Staff posts only

### Commit message format?

| Option | Description | Selected |
|--------|-------------|----------|
| Descriptive + message ID (Recommended) | "gallery: publish 3 photos (discord msg …)" — audit log | ✓ |
| Include approver name too | Discord usernames in public repo history | |
| Minimal | "gallery: update" every time | |

**User's choice:** Descriptive + message ID

### Batch rapid approvals?

| Option | Description | Selected |
|--------|-------------|----------|
| One commit per message (Recommended) | 1:1 audit mapping; deploy concurrency coalesces builds | ✓ |
| Debounce into batches | Fewer commits, murkier mapping | |

**User's choice:** One commit per message

---

## Claude's Discretion

- Git transport mechanics (GitHub REST contents API vs local clone+push), queueing internals, on-disk location of the last-processed marker
- Exact retry counts/backoff timing and the ~60s auto-delete delay
- Exact status/marker emoji (🟢 or similar) and bot message wording (Spanish-first natural)
- Exact WebP quality within ~80–85 and Pillow resampling filter
- Cog file/class structure following nocturna-bot's existing cog conventions
- EXIF/metadata stripping policy

## Deferred Ideas

- Cart → bot ticket integration (carried from Phase 3.1's deferred list) — post-Phase-5 candidate
- Enumerating skipped non-image attachments in confirmations — rejected for now, revisit if staff get confused
- Approver name in commit messages — rejected to keep usernames out of public repo history
