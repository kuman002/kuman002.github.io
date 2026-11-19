# Kumaresan — Portfolio

A static portfolio built with Astro, TypeScript, Lenis smooth scrolling, and a React canvas background.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The build script copies the existing portrait, résumé, CNAME, robots.txt, and sitemap into Astro's public directory before generating the static site. GitHub Actions deploys the `dist/` output to GitHub Pages.

## Motion system

- Lenis for smooth scrolling, the reading-progress bar, and anchor navigation.
- IntersectionObserver for scroll reveals.
- `NetworkBackground.tsx` draws the animated canvas background. It hydrates on idle, drops to ~30fps after 1.5s without input, and pauses in hidden tabs.
- With reduced motion enabled, the reveal animations are skipped and the canvas redraws only on scroll, pointer or resize.
