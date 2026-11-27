// Generates an optimized WebP portrait from the source JPG.
// Run `npm run portrait` after replacing "Kumaresan K.jpg", then commit the .webp.
const path = require("path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const src = path.join(root, "Kumaresan K.jpg");
const out = path.join(root, "Kumaresan K.webp");

(async () => {
  const meta = await sharp(src).metadata();
  await sharp(src)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`portrait: ${meta.width}x${meta.height} -> ${path.basename(out)}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
