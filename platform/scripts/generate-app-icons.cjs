/**
 * generate-app-icons.cjs — reproducible First Pitch icon + splash generator.
 *
 * Renders the brand mark (cream baseball, red stitching, "FP") to every PNG
 * the web PWA and the Capacitor iOS/Android shell need. The "FP" glyphs are
 * drawn as vector RECTS (not <text>) so output is identical on every machine
 * regardless of installed fonts — sharp/librsvg text rendering is unreliable
 * across platforms.
 *
 * Outputs
 *   apps/web/public/icons/*.png        → fixes the manifest.webmanifest 404s
 *   mobile/assets/*.png                → sources for `npx @capacitor/assets generate`
 *
 * Run (from anywhere; sharp is the only dependency):
 *   npm i -g sharp           # or install in a temp dir and set NODE_PATH
 *   node platform/scripts/generate-app-icons.cjs
 *
 * Designers: drop a real 1024×1024 PNG at mobile/assets/icon-only.png and a
 * 2732×2732 splash, then skip this script — @capacitor/assets consumes them.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error(
    "[icons] Missing dependency 'sharp'. Install it first:\n" +
      "  npm i -g sharp   (or)   npm i sharp in a temp dir + set NODE_PATH\n",
  );
  process.exit(1);
}

const COLORS = { ink: "#1f1a17", cream: "#f6efd9", red: "#8a1c1c" };

const ROOT = path.resolve(__dirname, "..");
const WEB_ICONS = path.join(ROOT, "apps", "web", "public", "icons");
const MOBILE_ASSETS = path.join(ROOT, "mobile", "assets");

/** Block "FP" as font-independent rects, centered on (cx,cy) with glyph height h. */
function lettersFP(cx, cy, h) {
  const t = h * 0.18; // stroke thickness
  const w = h * 0.62; // letter width
  const g = h * 0.2; // gap between letters
  const total = 2 * w + g;
  const x0 = cx - total / 2;
  const y0 = cy - h / 2;
  const px = x0 + w + g; // P left edge
  const r = (x, y, ww, hh) =>
    `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${ww.toFixed(2)}" height="${hh.toFixed(2)}" fill="${COLORS.ink}"/>`;
  return [
    // F
    r(x0, y0, t, h),
    r(x0, y0, w, t),
    r(x0, y0 + (h - t) / 2, w * 0.82, t),
    // P
    r(px, y0, t, h),
    r(px, y0, w, t),
    r(px + w - t, y0, t, h / 2),
    r(px, y0 + h / 2 - t, w, t),
  ].join("");
}

/** The baseball mark centered on (cx,cy) with radius r. */
function mark(cx, cy, r, showLetters = true) {
  const sw = (5 / 62) * r; // circle stroke
  const stw = (4 / 62) * r; // stitch stroke
  const ex = 0.806 * r;
  const ey = 0.419 * r;
  const cyOff = 0.065 * r;
  const top = `M ${cx - ex} ${cy - ey} Q ${cx} ${cy - cyOff} ${cx + ex} ${cy - ey}`;
  const bot = `M ${cx - ex} ${cy + ey} Q ${cx} ${cy + cyOff} ${cx + ex} ${cy + ey}`;
  return [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLORS.cream}" stroke="${COLORS.red}" stroke-width="${sw}"/>`,
    `<path d="${top}" fill="none" stroke="${COLORS.red}" stroke-width="${stw}" stroke-linecap="round"/>`,
    `<path d="${bot}" fill="none" stroke="${COLORS.red}" stroke-width="${stw}" stroke-linecap="round"/>`,
    showLetters ? lettersFP(cx, cy, r * 0.66) : "",
  ].join("");
}

/** Full square icon. bg = "transparent" for adaptive-icon foregrounds. */
function iconSvg(S, { bg = COLORS.ink, scale = 0.7, showLetters = true } = {}) {
  const r = (scale * S) / 2;
  const rect = bg === "transparent" ? "" : `<rect width="${S}" height="${S}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${rect}${mark(
    S / 2,
    S / 2,
    r,
    showLetters,
  )}</svg>`;
}

/** Launch screen: centered app-icon tile on a solid field. */
function splashSvg(S, { bg }) {
  const tile = S * 0.42;
  const tx = (S - tile) / 2;
  const ty = (S - tile) / 2;
  const radius = tile * 0.18;
  const r = (tile * 0.7) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <rect width="${S}" height="${S}" fill="${bg}"/>
    <rect x="${tx}" y="${ty}" width="${tile}" height="${tile}" rx="${radius}" fill="${COLORS.ink}" stroke="${COLORS.cream}" stroke-opacity="0.18" stroke-width="${tile * 0.012}"/>
    ${mark(S / 2, S / 2, r, true)}
  </svg>`;
}

async function render(svg, size, outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(outFile);
  console.log("[icons] wrote", path.relative(ROOT, outFile));
}

async function main() {
  // --- Web PWA icons (referenced by public/manifest.webmanifest + iOS Safari) ---
  await render(iconSvg(192), 192, path.join(WEB_ICONS, "icon-192.png"));
  await render(iconSvg(512), 512, path.join(WEB_ICONS, "icon-512.png"));
  // Maskable: extra padding so the mark stays inside the platform safe zone.
  await render(iconSvg(512, { scale: 0.6 }), 512, path.join(WEB_ICONS, "icon-maskable-512.png"));
  for (const s of [120, 152, 167, 180]) {
    await render(iconSvg(s), s, path.join(WEB_ICONS, `apple-touch-icon-${s}.png`));
  }
  await render(iconSvg(180), 180, path.join(WEB_ICONS, "apple-touch-icon.png"));

  // --- Mobile shell sources for `npx @capacitor/assets generate` ---
  // iOS app icon (no transparency, full-bleed — iOS masks the corners itself).
  await render(iconSvg(1024), 1024, path.join(MOBILE_ASSETS, "icon-only.png"));
  // Android adaptive icon foreground/background (66% safe zone).
  await render(
    iconSvg(1024, { bg: "transparent", scale: 0.56 }),
    1024,
    path.join(MOBILE_ASSETS, "icon-foreground.png"),
  );
  await render(iconSvg(1024, { scale: 0, showLetters: false }), 1024, path.join(MOBILE_ASSETS, "icon-background.png"));
  // Launch screens (light + dark).
  await render(splashSvg(2732, { bg: COLORS.cream }), 2732, path.join(MOBILE_ASSETS, "splash.png"));
  await render(splashSvg(2732, { bg: COLORS.ink }), 2732, path.join(MOBILE_ASSETS, "splash-dark.png"));

  // Reference vector master (some @capacitor/assets versions accept SVG).
  fs.writeFileSync(path.join(MOBILE_ASSETS, "icon.svg"), iconSvg(1024));
  console.log("[icons] done.");
}

main().catch((err) => {
  console.error("[icons] failed:", err);
  process.exit(1);
});
