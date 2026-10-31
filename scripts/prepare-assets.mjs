import { copyFileSync, existsSync, mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });
for (const file of ["Kumaresan K.jpg", "Kumaresan.pdf", "CNAME", "robots.txt", "sitemap.xml"]) {
  if (existsSync(file)) copyFileSync(file, `public/${file}`);
}