// Renders public/og.png (1200x630 link-preview card) and runs favicon generator.
// Run `npm run og` after changing your name, title, stack or portrait, then commit the assets.
// Not part of `npm run build` on purpose: output depends on locally installed fonts (Segoe UI / Arial).
const path = require("path");
const root = path.join(__dirname, "..");
const sharp = require("sharp");

const bg = "#090d14",
  accent = "#38bdf8",
  main = "#f8fafc",
  muted = "#94a3b8";

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${bg}"/>
  <g stroke="${accent}" stroke-opacity="0.12">
    ${Array.from({ length: 18 }, (_, i) =>
      Array.from(
        { length: 9 },
        (_, j) =>
          `<path d="M${64 + i * 64 - 4} ${64 + j * 64}h8M${64 + i * 64} ${64 + j * 64 - 4}v8"/>`,
      ).join(""),
    ).join("")}
  </g>
  <rect x="72" y="80" width="64" height="64" rx="12" fill="none" stroke="${accent}" stroke-width="2"/>
  <text x="104" y="123" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="26" fill="${accent}">KK</text>
  <text x="72" y="270" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="64" fill="${main}">Kumaresan Kanthasamy</text>
  <text x="72" y="340" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="36" fill="${accent}">Backend &amp; Cloud Systems Engineer</text>
  <text x="72" y="410" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="${muted}">TypeScript · Node.js · PostgreSQL · AWS · RAG / Agentic AI</text>
  <text x="72" y="550" font-family="Consolas, monospace" font-size="24" fill="${muted}">kumaresan.is-a.dev</text>
</svg>`;

const portraitSize = 300;
const mask = Buffer.from(
  `<svg width="${portraitSize}" height="${portraitSize}"><circle cx="150" cy="150" r="150"/></svg>`,
);

(async () => {
  const portrait = await sharp(path.join(root, "Kumaresan K.jpg"))
    .resize(portraitSize, portraitSize, { fit: "cover", position: "top" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  await sharp(Buffer.from(og))
    .composite([{ input: portrait, left: 1200 - 72 - portraitSize, top: 165 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, "public", "og.png"));

  const { buildFavicons } = require("./generate-favicons.cjs");
  await buildFavicons();
  console.log("ok");
})();
