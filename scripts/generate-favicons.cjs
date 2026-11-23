const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const bg = "#090d14";
const accent = "#38bdf8";

// High-resolution SVG template
function getSvg(rx = 0) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="${rx}" fill="${bg}"/>
    <text x="256" y="365" text-anchor="middle" font-family="Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif" font-weight="700" font-size="340" fill="${accent}">K</text>
  </svg>`;
}

async function buildFavicons() {
  const publicDir = path.join(root, "public");
  fs.mkdirSync(publicDir, { recursive: true });

  // 1. Standalone SVG favicon (vector, scales infinitely)
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="${bg}"/>
  <text x="50" y="71" text-anchor="middle" font-family="Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif" font-weight="700" font-size="66" fill="${accent}">K</text>
</svg>
`;
  fs.writeFileSync(path.join(publicDir, "favicon.svg"), svgContent);
  fs.writeFileSync(path.join(root, "favicon.svg"), svgContent);

  // 2. Apple Touch Icon (square, 180x180, solid background per Apple HIG)
  const appleTouchSvg = getSvg(0);
  await sharp(Buffer.from(appleTouchSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  // 3. PNG favicons for search engines and browsers (with squircle rounded corners rx=96 on 512x512)
  const squircleSvg = getSvg(96);
  const pngSizes = [
    { name: "favicon-16x16.png", size: 16 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "favicon-48x48.png", size: 48 }, // Recommended by Googlebot-Favicon
    { name: "favicon-96.png", size: 96 },
    { name: "web-app-manifest-192x192.png", size: 192 },
    { name: "web-app-manifest-512x512.png", size: 512 }
  ];

  for (const { name, size } of pngSizes) {
    await sharp(Buffer.from(squircleSvg))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, name));
  }

  // 4. Build standard multi-resolution ICO file (16x16, 32x32, 48x48)
  const icoSizes = [16, 32, 48];
  const icoPngBuffers = [];
  for (const s of icoSizes) {
    const buf = await sharp(Buffer.from(squircleSvg))
      .resize(s, s)
      .png()
      .toBuffer();
    icoPngBuffers.push({ size: s, buf });
  }

  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(icoSizes.length, 4); // Number of images

  let offset = 6 + icoSizes.length * 16;
  const dirEntries = [];
  for (const { size, buf } of icoPngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size === 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Colors (0 = no palette)
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data
    dirEntries.push(entry);
    offset += buf.length;
  }

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...icoPngBuffers.map(p => p.buf)]);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(root, "favicon.ico"), icoBuffer);

  // 5. site.webmanifest for PWA / mobile homescreen / Chrome
  const manifest = {
    name: "Kumaresan Kanthasamy — Portfolio",
    short_name: "Kumaresan K",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    theme_color: bg,
    background_color: bg,
    display: "standalone",
    start_url: "/"
  };
  fs.writeFileSync(path.join(publicDir, "site.webmanifest"), JSON.stringify(manifest, null, 2));

  console.log("All favicons & manifest successfully generated!");
}

module.exports = { buildFavicons };

if (require.main === module) {
  buildFavicons().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
