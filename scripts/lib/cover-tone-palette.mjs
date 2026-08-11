/**
 * Build a tone-on-tone hex palette anchored to an author-selected background.
 * Index 0 is always the exact input hex (no HSL round-trip drift).
 */

/** @param {string} hex */
export function normalizeCoverHex(hex) {
  const raw = String(hex || "").trim();
  if (!/^#?[0-9a-fA-F]{6}$/.test(raw)) return "";
  return raw.startsWith("#") ? raw.toLowerCase() : `#${raw.toLowerCase()}`;
}

/** @param {string} hex */
function hexToRgb(hex) {
  const h = normalizeCoverHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** @param {number} r @param {number} g @param {number} b */
function rgbToHsl(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return { h, s, l };
}

/** @param {number} p @param {number} q @param {number} t */
function hue2rgb(p, q, t) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

/** @param {number} h @param {number} s @param {number} l */
function hslToHex(h, s, l) {
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to = (n) =>
    Math.round(Math.min(255, Math.max(0, n * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

/**
 * @param {string} backgroundHex author-selected field color
 * @param {number} [count=5]
 * @returns {string[]} unique hex list; [0] === exact background
 */
export function deriveToneOnTonePalette(backgroundHex, count = 5) {
  const base = normalizeCoverHex(backgroundHex);
  if (!base) return [];

  const { r, g, b } = hexToRgb(base);
  const { h, s, l } = rgbToHsl(r, g, b);

  // Same hue family: vary lightness (and lightly saturation) around the field.
  const targets = [
    { sMul: 1, l: l }, // placeholder — replaced with exact base
    { sMul: 1.05, l: clamp01(l * 0.42) },
    { sMul: 0.95, l: clamp01(l * 0.68) },
    { sMul: 0.85, l: clamp01(l + (1 - l) * 0.28) },
    { sMul: 0.7, l: clamp01(l + (1 - l) * 0.52) },
    { sMul: 1.1, l: clamp01(Math.max(0.06, l * 0.22)) },
  ].slice(0, Math.max(2, count));

  const out = [];
  const seen = new Set();
  for (let i = 0; i < targets.length; i++) {
    const hex =
      i === 0
        ? base
        : hslToHex(h, clamp01(s * targets[i].sMul || 0.2), targets[i].l);
    if (seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
  }

  // Ensure we still have enough distinct steps if collisions collapsed.
  let step = 0.12;
  while (out.length < Math.min(count, 5) && step < 0.45) {
    const darker = hslToHex(h, clamp01(s * 0.9), clamp01(l - step));
    const lighter = hslToHex(h, clamp01(s * 0.75), clamp01(l + step));
    for (const hex of [darker, lighter]) {
      if (!seen.has(hex)) {
        seen.add(hex);
        out.push(hex);
      }
      if (out.length >= count) break;
    }
    step += 0.1;
  }

  return out;
}
