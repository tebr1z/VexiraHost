/* Regenerate browser and installable-app icons from the code-native SVG source. */
const fs = require("node:fs/promises");
const path = require("node:path");
const { createRequire } = require("node:module");

const frontend = path.resolve(__dirname, "../apps/frontend");
const nextRequire = createRequire(require.resolve("next/package.json", { paths: [frontend] }));
const sharp = nextRequire("sharp");

async function generate() {
  const source = await fs.readFile(path.join(frontend, "public/brand/icon.svg"), "utf8");
  const wordmark = await fs.readFile(path.join(frontend, "public/brand/wordmark.svg"), "utf8");
  const inner = (svg) => svg.replace(/<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title>.*?<\/title>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const fullLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="236" height="64" viewBox="0 0 236 64" fill="none"><title>Vexira Host</title>${inner(source)}<g transform="translate(80 0)">${inner(wordmark)}</g></svg>`;
  const lightLogo = fullLogo.replaceAll('#14213b', '#ffffff').replace('stroke="#1768e8"', 'stroke="#bde0ff"');
  const symbol = source.replace(/<rect\b[^>]*\/>/, "").replace('fill="#ffffff"', 'fill="#1768e8"').replace('#99f6e4', '#0c8b9c');
  const maskableSource = source.replace('rx="18"', 'rx="0"').replace('<g id="vexira-symbol">', '<g id="vexira-symbol" transform="translate(6.4 6.4) scale(.8)">');
  const png = (size, maskable = false) => sharp(Buffer.from(maskable ? maskableSource : source))
    .resize(size, size).png().toBuffer();
  const outputs = [
    ["public/favicon-16x16.png", 16], ["public/favicon-32x32.png", 32],
    ["public/apple-touch-icon.png", 180, true], ["public/icon-192.png", 192],
    ["public/icon-512.png", 512], ["public/favicon.png", 192],
    ["public/logo.png", 512], ["src/app/icon.png", 512],
    ["src/app/apple-icon.png", 180, true], ["public/icon-maskable-512.png", 512, true],
  ];
  await Promise.all(outputs.map(async ([file, size, maskable]) => {
    await fs.writeFile(path.join(frontend, file), await png(size, maskable));
  }));
  await fs.writeFile(path.join(frontend, "public/favicon.svg"), source);
  await Promise.all([
    fs.writeFile(path.join(frontend, "public/brand/logo.svg"), fullLogo),
    fs.writeFile(path.join(frontend, "public/brand/logo-light.svg"), lightLogo),
    fs.writeFile(path.join(frontend, "public/brand/symbol.svg"), symbol),
    sharp(Buffer.from(fullLogo)).resize(944, 256).png().toFile(path.join(frontend, "public/brand/logo-horizontal.png")),
    sharp(Buffer.from(lightLogo)).resize(944, 256).png().toFile(path.join(frontend, "public/brand/logo-horizontal-light.png")),
  ]);

  // Neutral-background preview of the same transparent, font-independent SVG.
  await sharp({ create: { width: 1184, height: 496, channels: 4, background: "#f8fafc" } })
    .composite([{ input: await sharp(Buffer.from(fullLogo)).resize(944, 256).png().toBuffer(), left: 120, top: 120 }])
    .png().toFile(path.join(frontend, "public/brand/logo-preview.png"));

  // ICO with PNG frames: current Windows browsers select the closest pixel size.
  const sizes = [16, 32, 48];
  const frames = await Promise.all(sizes.map((size) => png(size)));
  const directory = Buffer.alloc(6 + 16 * frames.length);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(frames.length, 4);
  let offset = directory.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    directory[entry] = sizes[index];
    directory[entry + 1] = sizes[index];
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(frame.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  await fs.writeFile(path.join(frontend, "public/favicon.ico"), Buffer.concat([directory, ...frames]));
  for (const [file, size] of outputs) {
    const metadata = await sharp(path.join(frontend, file)).metadata();
    if (metadata.width !== size || metadata.height !== size) throw new Error(`Invalid icon: ${file}`);
  }
  for (const file of ["logo.svg", "logo-light.svg", "symbol.svg"]) {
    const metadata = await sharp(path.join(frontend, "public/brand", file)).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Invalid brand asset: ${file}`);
  }
  console.log(`Generated and verified ${outputs.length + 8} Vexira Host brand/icon assets.`);
}

generate().catch((error) => { console.error(error); process.exitCode = 1; });
