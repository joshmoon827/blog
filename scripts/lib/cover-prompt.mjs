/**
 * Build the Gemini cover-generation prompt from keywords + style instruction.
 *
 * Attached reference covers (random stock picks) define format + palette.
 * Do not rewrite site crop/display aspect ratios here — blog CSS handles display.
 */

import { SWISS_MODERNIST_ART_DIRECTION } from "./cover-swiss-modernist.mjs";

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
  const refLine =
    authorRefCount > 0
      ? `The first ${authorRefCount} attached image(s) are AUTHOR references — prioritize their mood, composition cues, and color feeling. Remaining attached images are format/style refs only (not backgrounds).`
      : refCount > 1
        ? `Study all ${refCount} attached reference covers for shape style only — not their backgrounds.`
        : "Study the attached reference cover(s) for shape style only — not their backgrounds.";

  const paletteColors = (Array.isArray(opts.paletteColors) ? opts.paletteColors : [])
    .map((c) => String(c || "").trim())
    .filter((c) => /^#?[0-9a-fA-F]{6}$/.test(c))
    .map((c) => (c.startsWith("#") ? c.toLowerCase() : `#${c.toLowerCase()}`));

  const rawBg = String(opts.backgroundColor || "").trim();
  const backgroundColor =
    /^#?[0-9a-fA-F]{6}$/.test(rawBg)
      ? rawBg.startsWith("#")
        ? rawBg.toLowerCase()
        : `#${rawBg.toLowerCase()}`
      : "";

  const paletteLine =
    paletteColors.length > 0
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

  // Explicit author background hex wins over palette-derived background rules
  // (additionalPrompt above still outranks everything on conflict).
  const backgroundLine = backgroundColor
    ? `**BACKGROUND COLOR (AUTHOR SELECTED): The entire cover background MUST be one flat solid fill of exactly ${backgroundColor}. ` +
      "No gradients, textures, patterns, photo backgrounds, or other hex values for the field. " +
      "Foreground geometry may use the palette / tone-on-tone rules, but the backdrop itself is locked to this hex.**"
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
