#!/usr/bin/env node
// ─── Smart Reply Pro · Icon Generator ────────────────────────────────────────
// Generates PNG icons for the Chrome extension using only Node built-ins.
// Run from inside the chrome-extension/icons/ directory:
//   node generate-icons.mjs
//
// Output: icon16.png  icon32.png  icon48.png  icon128.png
//
// Icon design: blue circle on dark background with white "S" letterform.

import { writeFileSync } from "fs";
import { deflateSync } from "zlib";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));

// ─── Color palette ────────────────────────────────────────────────────────────
const BG     = [2,   6,  23];   // #020617 slate-950
const ACCENT = [59, 130, 246];  // #3b82f6 blue-500
const WHITE  = [241, 245, 249]; // #f1f5f9 slate-100

// ─── CRC-32 ───────────────────────────────────────────────────────────────────
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── PNG chunk builder ────────────────────────────────────────────────────────
function chunk(type, data) {
  const typeB = Buffer.from(type, "ascii");
  const lenB  = Buffer.alloc(4);
  lenB.writeUInt32BE(data.length);
  const crcB  = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([lenB, typeB, data, crcB]);
}

// ─── Distance helper (anti-aliased circle) ───────────────────────────────────
function samplePixel(cx, cy, px, py, r, aa = 1.5) {
  const dx = px - cx;
  const dy = py - cy;
  const d  = Math.sqrt(dx * dx + dy * dy);
  // Return coverage [0,1] for anti-aliased edge
  const inner = r - aa;
  const outer = r + aa;
  if (d <= inner) return 1;
  if (d >= outer) return 0;
  return (outer - d) / (aa * 2);
}

// ─── Simple pixel-art "S" path at normalised coords (0–1 grid, origin top-left)
// Drawn as a series of filled rectangles [x, y, w, h] all in unit coordinates.
const S_RECTS = [
  // Top arm of S
  [0.25, 0.15, 0.55, 0.12],
  // Top-left vertical
  [0.15, 0.15, 0.12, 0.22],
  // Middle bar
  [0.25, 0.44, 0.50, 0.12],
  // Bottom-right vertical
  [0.73, 0.44, 0.12, 0.22],
  // Bottom arm of S
  [0.20, 0.73, 0.55, 0.12],
];

function isInSGlyph(nx, ny) {
  return S_RECTS.some(([rx, ry, rw, rh]) =>
    nx >= rx && nx <= rx + rw && ny >= ry && ny <= ry + rh
  );
}

// ─── Build one PNG ────────────────────────────────────────────────────────────
function makePNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // RGB (no alpha, smaller file)
  const ihdr = chunk("IHDR", ihdrData);

  const center = (size - 1) / 2;
  const radius = size * 0.44;

  const rawRows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter type: None
    for (let x = 0; x < size; x++) {
      const coverage = samplePixel(center, center, x, y, radius);

      if (coverage <= 0) {
        row.push(...BG);
      } else {
        // Determine if inside the S glyph (normalised coords)
        const padding = radius * 0.2;
        const nx = (x - (center - radius + padding)) / (2 * (radius - padding));
        const ny = (y - (center - radius + padding)) / (2 * (radius - padding));

        let r, g, b;
        if (isInSGlyph(nx, ny)) {
          r = WHITE[0]; g = WHITE[1]; b = WHITE[2];
        } else {
          r = ACCENT[0]; g = ACCENT[1]; b = ACCENT[2];
        }

        // Blend accent circle with dark background at edge
        if (coverage < 1) {
          r = Math.round(r * coverage + BG[0] * (1 - coverage));
          g = Math.round(g * coverage + BG[1] * (1 - coverage));
          b = Math.round(b * coverage + BG[2] * (1 - coverage));
        }
        row.push(r, g, b);
      }
    }
    rawRows.push(Buffer.from(row));
  }

  const rawData   = Buffer.concat(rawRows);
  const idat      = chunk("IDAT", deflateSync(rawData, { level: 9 }));
  const iend      = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// ─── Write all sizes ──────────────────────────────────────────────────────────
const SIZES = [16, 32, 48, 128];

for (const size of SIZES) {
  const png  = makePNG(size);
  const file = join(__dir, `icon${size}.png`);
  writeFileSync(file, png);
  console.log(`✓ icon${size}.png  (${png.length} bytes)`);
}

console.log("\nDone. Icons saved to chrome-extension/icons/");
console.log("Replace with professionally designed assets before publishing to the Chrome Web Store.");
