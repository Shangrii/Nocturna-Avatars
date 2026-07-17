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

/** Shared play/pause visual state (spins the vinyl + swaps the button icon). */
function playState(root: HTMLElement, playBtn: HTMLButtonElement | null) {
  return (playing: boolean): void => {
    root.dataset.playing = playing ? 'true' : 'false';
    playBtn?.setAttribute('aria-pressed', String(playing));
  };
}

/** MP3 path — same-origin <audio>, so autoplay on the enter gesture is reliable. */
function initMp3(root: HTMLElement): void {
  const src = root.dataset.audioSrc;
  if (!src) return;
  const startAt = Math.max(0, parseInt(root.dataset.spotifyStart ?? '0', 10) || 0);
  const playBtn = root.querySelector<HTMLButtonElement>('[data-spotify-play]');
  const setPlaying = playState(root, playBtn);

  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = 'auto';
  audio.addEventListener('play', () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));

  const play = (): void => {
    const go = (): void => {
      if (startAt > 0) {
        try {
          audio.currentTime = startAt;
        } catch {
          /* metadata not ready — starts at 0 */
        }
      }
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    if (audio.readyState >= 1) go();
    else audio.addEventListener('loadedmetadata', go, { once: true });
  };

  document.addEventListener('editor:enter', play, { once: true });
  playBtn?.addEventListener('click', () => (audio.paused ? play() : audio.pause()));
}

function initOne(root: HTMLElement): void {
  if (root.dataset.mode === 'mp3') {
    initMp3(root);
    return;
  }
  const url = root.dataset.spotifyUrl;
  if (!url) return;
  const match = url.match(TRACK_RE);
  if (!match) return;
  const uri = `spotify:track:${match[1]}`;
  const startAt = Math.max(0, parseInt(root.dataset.spotifyStart ?? '0', 10) || 0);

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
      // WRAPPER carries the hiding: createController REPLACES the inner node with an
      // iframe (dropping its styles), so hiding the inner node alone would leave the
      // iframe visible in flow. The wrapper is kept ON-SCREEN but clipped to 1px in a
      // corner (NOT off-screen, NOT opacity:0): a cross-origin iframe fully off-screen
      // gets its autoplay suspended by the browser, so it must stay rendered/on-screen.
      const wrap = document.createElement('div');
      wrap.setAttribute('aria-hidden', 'true');
      wrap.style.cssText =
        'position:fixed;left:0;bottom:0;width:1px;height:1px;overflow:hidden;pointer-events:none;z-index:0;';
      const inner = document.createElement('div');
      wrap.appendChild(inner);
      document.body.appendChild(wrap);
      api.createController(inner, { uri, width: '100%', height: 80 }, (ctrl) => {
        controller = ctrl;
        ctrl.addListener('playback_update', (e) => {
          setPlaying(!e.data.isPaused);
          // On the first autoplay start, jump to the editor-chosen start position.
          if (wantRestart && !e.data.isPaused) {
            wantRestart = false;
            if (startAt > 0) ctrl.seek(startAt);
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
