# Nocturna Avatars — Website

Sitio web bilingüe (ES/EN) de **Nocturna Avatars**, equipo de edición profesional
de avatares de VRChat. Portafolio street/graffiti que muestra el trabajo, vende
paquetes de servicios y dirige a abrir un ticket en Discord. La galería se
**auto-actualiza** desde fotos que el staff publica en Discord (vía el bot), sin
tocar código.

## Stack

- **Astro** (salida estática) — desplegado a GitHub Pages con dominio propio (CNAME).
- **Tailwind v4** (CSS-first vía `@tailwindcss/vite`).
- **GSAP + Lenis** para la capa de motion.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # build estático a dist/
npm run preview  # previsualizar el build
```

## Despliegue

`main`/`revamp` → GitHub Actions construye `dist/` y lo publica en la rama
`gh-pages`. El `CNAME` viaja en `public/CNAME`. Ver `.github/workflows/deploy.yml`.
