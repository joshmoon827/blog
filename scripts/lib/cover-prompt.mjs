/**
 * Build the Gemini cover-generation prompt from keywords + style instruction.
 *
 * Attached reference covers (random stock picks) define format + shape language.
 * When the author picks a background hex, the WHOLE palette is rebuilt as
 * tone-on-tone around that hex (stock cover colors are ignored for paint).
 */

import { SWISS_MODERNIST_ART_DIRECTION } from "./cover-swiss-modernist.mjs";
import {
  deriveToneOnTonePalette,
  normalizeCoverHex,
} from "./cover-tone-palette.mjs";

function buildStyle(theme) {
  const light =
    "Style: flat minimalist geometry (rects, circles, triangles, lines, grids). " +
    "Match the attached references' format and composition. " +
    "No photorealism, no collage.";

  const dark =
    "Style: geometric minimalism matching the attached references' format and composition. " +
    "Flat vector shapes (rects/circles/triangles/lines/grids); centered motif, hard edges, calm negative space. " +
    "NOT photorealism, NOT neon glow.";

  return theme === "light" ? light : dark;
}

/**
 * @param {string[]} keywords exactly 5
 * @param {{
 *   title?: string,
 *   logo?: string,
 *   theme?: "dark" | "light",
 *   styleHint?: string,
 *   referenceCount?: number,
 *   additionalPrompt?: string,
 *   productRelated?: boolean,
 *   authorReferenceCount?: number,
 *   paletteColors?: string[],
 *   backgroundColor?: string,
 *   swissModernist?: boolean,
 * }} [opts]
 */
export function buildCoverPrompt(keywords, opts = {}) {
  const kw = keywords.map((k) => k.trim()).filter(Boolean);
  if (kw.length !== 5) {
    throw new Error(`buildCoverPrompt expects 5 keywords, got ${kw.length}`);
  }

  const productRelated = opts.productRelated !== false;
  // Default ON — UI checkbox can disable.
  const swissModernist = opts.swissModernist !== false;
  const theme = opts.theme === "light" ? "light" : "dark";
  const titleLine = opts.title ? `Article title: ${opts.title}` : "";
  const logoBrief = String(opts.logo || "").trim();
  if (productRelated && !logoBrief) {
    throw new Error("buildCoverPrompt requires opts.logo when productRelated");
  }
  const style = opts.styleHint || buildStyle(theme);
  const layoutLine =
    "Layout: one centered geometric motif with generous negative space (single flat illustration).";

  const authorRefCount = Number(opts.authorReferenceCount) || 0;
  const refCount = opts.referenceCount ?? 5;
  const backgroundColor = normalizeCoverHex(opts.backgroundColor || "");

  const refLine =
    authorRefCount > 0
      ? `The first ${authorRefCount} attached image(s) are AUTHOR references — prioritize their mood and composition cues` +
        (backgroundColor
          ? ", but NOT their colors (colors are locked to the author background tone-on-tone system)."
          : ", and color feeling. Remaining attached images are format/style refs only (not backgrounds).")
      : backgroundColor
        ? `Study attached reference covers for shape language and layout only — IGNORE their colors and backgrounds. Paint only with the author tone-on-tone system below.`
        : refCount > 1
          ? `Study all ${refCount} attached reference covers for shape style only — not their backgrounds.`
          : "Study the attached reference cover(s) for shape style only — not their backgrounds.";

  const stockPalette = (Array.isArray(opts.paletteColors) ? opts.paletteColors : [])
    .map((c) => normalizeCoverHex(c))
    .filter(Boolean);

  // Author background wins: rebuild the full paint set around that hue.
  // Stock reference palettes must not fight the field color.
  const paletteColors = backgroundColor
    ? deriveToneOnTonePalette(backgroundColor, 5)
    : stockPalette;

  const paletteLine = backgroundColor
    ? `Colors: AUTHOR chose field color ${backgroundColor}. ` +
      `The ENTIRE cover (background + every foreground shape) MUST be one tone-on-tone (톤 온 톤) system built only from: [${paletteColors.join(", ")}]. ` +
      "Conceive the geometry for this hue from the start — lighter/darker/softer variants of the SAME color family only. " +
      "FORBIDDEN: designing the motif in an unrelated palette (e.g. blue-gray shapes) and then swapping only the backdrop to the author color. " +
      "No loud contrast hues; no colors outside this list."
    : paletteColors.length > 0
      ? `Colors: MUST use ONLY this selected palette array (in order): [${paletteColors.join(", ")}]. ` +
        "Build a tone-on-tone (톤 온 톤) composition from these hex colors — same family, subtle value shifts only; " +
        "do not invent unrelated hues outside this list."
      : "Colors: MUST use tone-on-tone (톤 온 톤) like the attached reference covers — same hue family, subtle value shifts only; no loud contrast or unrelated accent colors.";

  const criticalLogoLine = productRelated
    ? `**CRITICAL — LOGO IS MANDATORY: You MUST include a flat geometric logo/mark on this cover: ${logoBrief}. No letters — symbol/icon only. Do not skip the logo.**`
    : "**CRITICAL — NO BRAND LOGOS: Abstract flat geometry from keywords only. NO software, product, or brand logos. No letters.**";

  const additionalTrimmed = String(opts.additionalPrompt || "").trim();
  // Placed first so author direction outranks system defaults when they conflict.
  const additionalBlock = additionalTrimmed
    ? [
        "HIGHEST-PRIORITY AUTHOR OVERRIDES — follow these first.",
        "If any instruction below conflicts with these overrides, the overrides win.",
        additionalTrimmed,
      ].join("\n")
    : "";

  const criticalNoTextLine =
    "**CRITICAL: Do NOT add any text, lettering, words, labels, captions, numbers, or typography to the image — absolutely no readable characters.**";

  const backgroundLine = backgroundColor
    ? `**BACKGROUND + MOTIF UNITY: Field fill MUST be exactly ${backgroundColor} (flat solid — no gradients/textures/photos). ` +
      "All motif fills/strokes MUST come from the tone-on-tone list above (same hue family). " +
      "The picture must look like one designed color story, not a motif pasted onto a recolored backdrop.**"
    : paletteColors.length > 0
      ? `Background: MUST be one flat solid color chosen from the palette array [${paletteColors.join(", ")}] ` +
        "(no gradients, textures, patterns, or photo backgrounds)."
      : "Background: MUST be one flat solid color (no gradients, textures, patterns, or photo backgrounds). " +
        "Do NOT copy or match any background from the attached references — choose a new solid field color that harmonizes with the tone-on-tone palette.";

  const formatLine =
    "Format: square 1:1 aspect ratio (equal width and height), matching the attached reference covers.";

  const requirementsLine =
    "Requirements: One cohesive flat illustration — not a collage; inspired by references but do not duplicate any reference exactly. No watermarks.";

  const swissBlock = swissModernist
    ? [
        "SWISS MODERNIST ART DIRECTION (blend with the geometry brief below):",
        SWISS_MODERNIST_ART_DIRECTION.trim(),
      ].join("\n")
    : "";

  return [
    additionalBlock,
    criticalLogoLine,
    criticalNoTextLine,
    "Generate a NEW blog cover image. Create original artwork — do not return, reuse, or output any of the attached reference images.",
    refLine,
    paletteLine,
    backgroundLine,
    formatLine,
    swissBlock,
    style,
    layoutLine,
    titleLine,
    `Keywords (abstract geometry only): ${kw.join(", ")}.`,
    requirementsLine,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}
