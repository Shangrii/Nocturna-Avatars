// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static output is the default. Custom domain via public/CNAME (do NOT set `base`).
// i18n: both locales are prefixed (D-01); root `/` is owned by src/pages/index.astro
// which does client-side browser-language detection + redirect (D-04/D-05).
// Tailwind v4 is wired CSS-first via the @tailwindcss/vite plugin (D-01) — NOT the
// deprecated @astrojs/tailwind. The @theme block lives in src/styles/theme.css.
export default defineConfig({
  site: 'https://nocturna-avatars.site',
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
