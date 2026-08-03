/**
 * Post-process generated cover images:
 * fill top-right and bottom-right corner bands (16% × 16%) with a solid color
 * sampled from the pixel 1px above each cut line (inside the image).
 */

import sharp from "sharp";
import { writeFileSync } from "node:fs";

const CORNER_RATIO = 0.16;

/**
 * @param {string} filePath absolute or relative path to image file (overwritten in place)
 * @returns {Promise<{ width: number, height: number, cornerW: number, topH: number, bottomH: number }>}
 */
export async function patchCoverRightCorners(filePath) {
  const img = sharp(filePath);
  const meta = await img.metadata();
  const W = meta.width;
  const H = meta.height;
  if (!W || !H) {
    throw new Error(`patchCoverRightCorners: invalid image dimensions for ${filePath}`);
  }

  const cornerW = Math.max(1, Math.round(W * CORNER_RATIO));
  const topH = Math.max(1, Math.round(H * CORNER_RATIO));
  const bottomH = Math.max(1, Math.round(H * CORNER_RATIO));
  const bottomY = H - bottomH;
  const cornerX = W - cornerW;

  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  /** @param {number} x @param {number} y */
  function rgbAt(x, y) {
    const cx = Math.min(Math.max(0, x), W - 1);
    const cy = Math.min(Math.max(0, y), H - 1);
    const i = (cy * W + cx) * channels;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  }

  // 1px above the top cut line, just left of the right corner strip
  const sampleX = Math.max(0, cornerX - 1);
  const topColor = rgbAt(sampleX, Math.max(0, topH - 1));
  const bottomColor = rgbAt(sampleX, Math.max(0, bottomY - 1));

  const toSvgRect = (w, h, { r, g, b }) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<rect width="100%" height="100%" fill="rgb(${r},${g},${b})"/></svg>`;

  const out = await sharp(filePath)
    .composite([
      {
        input: Buffer.from(toSvgRect(cornerW, topH, topColor)),
        left: cornerX,
        top: 0,
      },
      {
        input: Buffer.from(toSvgRect(cornerW, bottomH, bottomColor)),
        left: cornerX,
        top: bottomY,
      },
    ])
    .toBuffer();

  writeFileSync(filePath, out);

  return { width: W, height: H, cornerW, topH, bottomH };
}
