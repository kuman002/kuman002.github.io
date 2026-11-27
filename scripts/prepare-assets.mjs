import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const requiredAssets = [
  "Kumaresan K.jpg",
  "Kumaresan K.webp",
  "Kumaresan.pdf",
  "CNAME",
  "robots.txt",
];

mkdirSync("public", { recursive: true });
for (const file of requiredAssets) {
  if (!existsSync(file)) throw new Error(`Missing required root asset: ${file}`);
  copyFileSync(file, `public/${file}`);
}

// Stamp the sitemap with the build date: every deploy is a content change on this one-page site.
const today = new Date().toISOString().slice(0, 10);
const sitemap = readFileSync("sitemap.xml", "utf8");
if (!sitemap.includes("<lastmod>")) throw new Error("sitemap.xml has no <lastmod> to stamp");
writeFileSync(
  "public/sitemap.xml",
  sitemap.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`),
);
