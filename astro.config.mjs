// @ts-check
import { defineConfig } from 'astro/config';

// Static output is the default. Custom domain via public/CNAME (do NOT set `base`).
// i18n: both locales are prefixed (D-01); root `/` is owned by src/pages/index.astro
// which does client-side browser-language detection + redirect (D-04/D-05).
export default defineConfig({
  site: 'https://nocturna-avatars.site',
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
