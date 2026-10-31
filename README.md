# Kumaresan — Portfolio

A component-driven portfolio built with Astro, TypeScript, GSAP, and ScrollTrigger.

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

- GSAP timelines for the hero entrance and organic SVG morph.
- ScrollTrigger for scroll-linked reveals, parallax, timeline progress, and reading progress.
- Pointer interactions are limited to fine pointers.
- Reduced-motion preferences disable the motion choreography.
