/**
 * audio.ts — splash-gated background audio (D-06/D-22).
 *
 * The `<audio>` element starts muted + looping; the `editor:enter` splash-dismiss
 * event is a REAL user gesture, which is what unlocks browser autoplay, so on it
 * we unmute + play and wire the volume / mute toggle. If `play()` is still
 * rejected the control stays in a muted state with NO error text. Volume is
 * session-local (not persisted). Same behaviour on mobile — the splash tap
 * unlocks it there too (D-20).
 */

const DEFAULT_VOLUME = 0.5;

function initAudio(root: HTMLElement): void {
  const audio = root.querySelector<HTMLAudioElement>('[data-editor-audio]');
  if (!audio) return;

  const toggle = root.querySelector<HTMLButtonElement>('[data-audio-toggle]');
  const slider = root.querySelector<HTMLInputElement>('[data-audio-volume]');

  audio.volume = DEFAULT_VOLUME;
  if (slider) slider.value = String(DEFAULT_VOLUME);

  const reflect = (): void => {
    const off = audio.muted || audio.paused;
    root.dataset.audioState = off ? 'muted' : 'playing';
    toggle?.setAttribute('aria-pressed', String(!off));
  };

  const play = (): void => {
    audio.muted = false;
    audio.play().then(reflect).catch(() => {
      // Browser blocked playback — stay muted, no error text (D-22).
      audio.muted = true;
      reflect();
    });
  };

  // Splash-gated unlock: the enter gesture satisfies the autoplay policy.
  document.addEventListener(
    'editor:enter',
    () => {
      audio.volume = slider ? Number(slider.value) : DEFAULT_VOLUME;
      play();
    },
    { once: true },
  );

  toggle?.addEventListener('click', () => {
    if (audio.muted || audio.paused) {
      play();
    } else {
      audio.muted = true;
      reflect();
    }
  });

  slider?.addEventListener('input', () => {
    audio.volume = Number(slider.value);
    if (audio.volume > 0 && audio.muted) audio.muted = false;
    reflect();
  });

  audio.addEventListener('play', reflect);
  audio.addEventListener('pause', reflect);
  reflect();
}

function boot(): void {
  document.querySelectorAll<HTMLElement>('[data-audio-player]').forEach(initAudio);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
