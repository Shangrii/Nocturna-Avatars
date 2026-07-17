/**
 * presence.ts — live Discord status via Nocturna's OWN bot (native integration).
 *
 * The bot (in the guild, GUILD_PRESENCES intent) writes each editor's status to its
 * DB and serves it read-only at `<editor-app>/api/presence/<id>`. This polls that
 * endpoint and reveals the avatar-corner status dot ONLY on a real status. Any failure
 * — network error, non-200, unknown/absent status (editor not tracked) — leaves the dot
 * hidden with NO user-facing error text (Copywriting Contract graceful-degrade).
 *
 * No external dependency (Lanyard is gone); editors don't have to join anything. The
 * dot colour is a fixed semantic Discord status colour; the ring uses --theme-accent.
 */

/** Editor admin app origin (serves the read-only presence API cross-origin, CORS-allowed). */
const PRESENCE_API = 'https://editors.nocturna-avatars.site';

/** Re-poll interval so the dot tracks status changes while the page stays open. */
const POLL_MS = 60_000;

/** Fixed semantic Discord status colours (the ring uses --theme-accent). */
const STATUS_COLORS: Record<string, string> = {
  online: '#3ba55d',
  idle: '#faa81a',
  dnd: '#ed4245',
  offline: '#747f8d',
};

function apply(el: HTMLElement, status: string | null | undefined): void {
  if (!status || !(status in STATUS_COLORS)) {
    el.hidden = true; // untracked / unknown → stay hidden, no error text
    return;
  }
  const dot = el.querySelector<HTMLElement>('[data-presence-dot]');
  if (dot) dot.style.setProperty('--presence-color', STATUS_COLORS[status]);
  el.dataset.status = status;
  el.hidden = false; // reveal ONLY on a real status
}

function poll(el: HTMLElement, discordId: string): void {
  fetch(`${PRESENCE_API}/api/presence/${encodeURIComponent(discordId)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => apply(el, json?.status))
    .catch(() => {
      /* graceful degrade — leave the dot as-is, no error text (D-05) */
    });
}

function initPresence(el: HTMLElement): void {
  const discordId = el.dataset.discordId;
  if (!discordId) return; // no id → stay hidden, no error text
  poll(el, discordId);
  window.setInterval(() => poll(el, discordId), POLL_MS);
}

function boot(): void {
  document.querySelectorAll<HTMLElement>('[data-presence]').forEach(initPresence);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
