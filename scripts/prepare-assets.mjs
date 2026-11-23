import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

mkdirSync("public", { recursive: true });
for (const file of ["Kumaresan K.jpg", "Kumaresan.pdf", "CNAME", "robots.txt", "favicon.ico", "favicon.svg"]) {
  if (existsSync(file)) copyFileSync(file, `public/${file}`);
}

// Stamp the sitemap with the build date: every deploy is a content change on this one-page site.
const today = new Date().toISOString().slice(0, 10);
const sitemap = readFileSync("sitemap.xml", "utf8");
if (!sitemap.includes("<lastmod>")) throw new Error("sitemap.xml has no <lastmod> to stamp");
writeFileSync("public/sitemap.xml", sitemap.replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`));
