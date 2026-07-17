/**
 * spotify.ts — the static Spotify vinyl mini-player (SpotifyVinyl.astro).
 *
 * The page carries only the track URL. This:
 *   1. resolves album art + title via Spotify's CORS-open oEmbed (no auth) and reveals
 *      the card only on success (a dead/removed track stays hidden),
 *   2. drives real playback through Spotify's official IFrame API — a custom play
 *      button calls togglePlay(); the vinyl spins only while playing.
 * Graceful degradation: if the IFrame API never loads, the play button opens the track
 * on Spotify instead (the "Abrir" link is always there too). No secrets, no bundler dep.
 */

interface SpotifyController {
  play(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  addListener(event: 'playback_update', cb: (e: { data: { isPaused: boolean } }) => void): void;
}
interface SpotifyIFrameAPI {
  createController(
    el: HTMLElement,
    opts: { uri: string; width: string | number; height: string | number },
    cb: (controller: SpotifyController) => void,
  ): void;
}

const TRACK_RE = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]+)/;

/** Load the Spotify IFrame API once; resolve all callers with the shared instance. */
let apiPromise: Promise<SpotifyIFrameAPI> | null = null;
function loadApi(): Promise<SpotifyIFrameAPI> {
  const w = window as unknown as {
    __spotifyApi?: SpotifyIFrameAPI;
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
  };
  if (w.__spotifyApi) return Promise.resolve(w.__spotifyApi);
  if (!apiPromise) {
    apiPromise = new Promise<SpotifyIFrameAPI>((resolve, reject) => {
      w.onSpotifyIframeApiReady = (api: SpotifyIFrameAPI) => {
        w.__spotifyApi = api;
        resolve(api);
      };
      const s = document.createElement('script');
      s.src = 'https://open.spotify.com/embed/iframe-api/v1';
      s.async = true;
      s.onerror = () => reject(new Error('spotify iframe api failed'));
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

function initOne(root: HTMLElement): void {
  const url = root.dataset.spotifyUrl;
  if (!url) return;
  const match = url.match(TRACK_RE);
  if (!match) return;
  const uri = `spotify:track:${match[1]}`;

  const artEl = root.querySelector<HTMLElement>('[data-spotify-art]');
  const titleEl = root.querySelector<HTMLElement>('[data-spotify-title]');
  const playBtn = root.querySelector<HTMLButtonElement>('[data-spotify-play]');

  // 1. Album art + title via oEmbed (CORS-open). Reveal only once resolved.
  fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return;
      if (artEl && data.thumbnail_url) artEl.style.backgroundImage = `url("${data.thumbnail_url}")`;
      if (titleEl && data.title) titleEl.textContent = data.title;
      root.hidden = false;
    })
    .catch(() => {
      /* leave hidden — no error text */
    });

  // 2. Playback via the IFrame API. The hidden player host is appended to <body>
  //    (NOT inside the widget) and kept RENDERED off-screen — no display:none,
  //    no opacity:0, no clipping — or the browser/Spotify suspends its audio.
  let controller: SpotifyController | null = null;
  let apiFailed = false;
  let pendingPlay = false;
  // Ask for a one-time seek-to-0 the first time AUTOPLAY starts, so a full track
  // begins at 0:00 (harmless no-op if it already did). Only autoplay sets this — a
  // manual resume after pausing keeps its position. (Spotify's 30s PREVIEW, shown to
  // visitors without a Spotify session, is a fixed mid-song clip we can't reposition.)
  let wantRestart = false;
  const setPlaying = (playing: boolean): void => {
    root.dataset.playing = playing ? 'true' : 'false';
    playBtn?.setAttribute('aria-pressed', String(playing));
  };

  loadApi()
    .then((api) => {
      const host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      // Off-screen but fully rendered (playback keeps working; nothing visible).
      host.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:80px;pointer-events:none;';
      document.body.appendChild(host);
      api.createController(host, { uri, width: '100%', height: 80 }, (ctrl) => {
        controller = ctrl;
        ctrl.addListener('playback_update', (e) => {
          setPlaying(!e.data.isPaused);
          if (wantRestart && !e.data.isPaused) {
            wantRestart = false;
            ctrl.seek(0);
          }
        });
        if (pendingPlay) {
          pendingPlay = false;
          ctrl.play();
        }
      });
    })
    .catch(() => {
      apiFailed = true;
    });

  // Autoplay on ENTER: the splash dismissal (`editor:enter`) is the user gesture that
  // unlocks autoplay, so the track starts the moment the visitor clicks into the page.
  let started = false;
  const startOnEnter = (): void => {
    if (started) return;
    started = true;
    wantRestart = true; // force the full track to begin at 0:00
    if (controller) controller.play();
    else pendingPlay = true; // plays as soon as the controller is ready
  };
  document.addEventListener('editor:enter', startOnEnter, { once: true });

  playBtn?.addEventListener('click', () => {
    if (controller) controller.togglePlay();
    else if (apiFailed) window.open(url, '_blank', 'noopener');
    else pendingPlay = true; // controller still loading — play as soon as it's ready
  });
}

document.querySelectorAll<HTMLElement>('[data-spotify]').forEach(initOne);
