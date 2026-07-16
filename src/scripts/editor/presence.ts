/**
 * presence.ts — client-side Lanyard live Discord status (D-05).
 *
 * Fetches the PUBLIC Lanyard instance (A4) and reveals a status dot only on a
 * successful read. Any failure — network error, non-200, 404 (editor not in the
 * Lanyard guild), or a missing/unknown status — leaves the dot hidden with NO
 * user-facing error text (Copywriting Contract graceful-degrade). The optional
 * activity name is written via `textContent` ONLY, never `innerHTML`, because it
 * is untrusted third-party string data (XSS discipline, T-10.1-04-01).
 */

/** Fixed semantic Discord status colours (the ring uses --theme-accent). */
const STATUS_COLORS: Record<string, string> = {
  online: '#3ba55d',
  idle: '#faa81a',
  dnd: '#ed4245',
  offline: '#747f8d',
};

interface LanyardActivity {
  type?: number;
  name?: string;
}

function initPresence(el: HTMLElement): void {
  const discordId = el.dataset.discordId;
  if (!discordId) return; // no id → stay hidden, no error text

  fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(discordId)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      const status: string | undefined = json?.data?.discord_status;
      if (!status || !(status in STATUS_COLORS)) return; // hidden — no error text

      const dot = el.querySelector<HTMLElement>('[data-presence-dot]');
      if (dot) dot.style.setProperty('--presence-color', STATUS_COLORS[status]);
      el.dataset.status = status;

      // Optional activity label — skip custom-status (type 4). textContent ONLY.
      const activities: LanyardActivity[] = Array.isArray(json?.data?.activities)
        ? json.data.activities
        : [];
      const activity = activities.find((a) => a && a.type !== 4 && a.name);
      const label = el.querySelector<HTMLElement>('[data-presence-activity]');
      if (label && activity?.name) {
        label.textContent = activity.name; // XSS-safe — plain text only
        label.hidden = false;
      }

      el.hidden = false; // reveal ONLY on success
    })
    .catch(() => {
      /* graceful degrade — leave the dot hidden, no error text (D-05) */
    });
}

function boot(): void {
  document.querySelectorAll<HTMLElement>('[data-presence]').forEach(initPresence);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
