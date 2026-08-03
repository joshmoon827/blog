import coverPalettesJson from './cover-palettes.json'

/** All local cover images under /public/images (article covers + poster set). */
export const coverImages = [
  '/images/aesthetic-usability-effect.jpg',
  '/images/choice-overload.jpg',
  '/images/chunking.jpg',
  '/images/cognitive-bias.jpg',
  '/images/cognitive-load.jpg',
  '/images/doherty-threshold.jpg',
  '/images/familiar-vs-novel.jpg',
  '/images/fitts-law.jpg',
  '/images/flow.jpg',
  '/images/goal-gradient-effect.jpg',
  '/images/hicks-law.jpg',
  '/images/jakobs-law.jpg',
  '/images/law-of-common-region.jpg',
  '/images/law-of-pragnanz.jpg',
  '/images/law-of-proximity.jpg',
  '/images/law-of-similarity.jpg',
  '/images/mental-model.jpg',
  '/images/millers-law.jpg',
  '/images/occams-razor.jpg',
  '/images/onboarding.jpg',
  '/images/paradox-of-active-user.jpg',
  '/images/pareto-principle.jpg',
  '/images/parkinsons-law.jpg',
  '/images/peak-end-rule.jpg',
  '/images/postels-law.jpg',
  '/images/psychology-of-design.jpg',
  '/images/selective-attention.jpg',
  '/images/serial-position-effect.jpg',
  '/images/teslers-law.jpg',
  '/images/uniform-connectedness.jpg',
  '/images/ux-psychology-google.jpg',
  '/images/von-restorff-effect.jpg',
  '/images/working-memory.jpg',
  '/images/zeigarnik-effect.jpg',
] as const

export type CoverImage = (typeof coverImages)[number]

/**
 * Near-duplicate stock palettes hidden from the cover picker.
 * - flow ≈ familiar-vs-novel
 * - paradox-of-active-user ≈ onboarding
 * - psychology-of-design ≈ cognitive-bias
 */
const COVER_PICKER_HIDDEN = new Set<string>([
  '/images/flow.jpg',
  '/images/paradox-of-active-user.jpg',
  '/images/psychology-of-design.jpg',
])

/** Stock covers shown in the palette picker (deduped near-identical swatches). */
export const coverPickerImages = coverImages.filter(
  (src) => !COVER_PICKER_HIDDEN.has(src),
)

/** Random stock cover for drafts (no Gemini). Prefer picker set over full list. */
export function randomCoverPickerImage(): string {
  const pool = coverPickerImages.length ? coverPickerImages : coverImages
  const i = Math.floor(Math.random() * pool.length)
  return pool[i] ?? coverImages[0]
}

/** @deprecated use coverImages — kept for ImageCarousel / home variants */
export const posters = [...coverImages]

export function coverLabel(src: string): string {
  const base = src.split('/').pop() || src
  return base.replace(/\.[^.]+$/, '').replace(/-/g, ' ')
}

const FALLBACK_PALETTE = ['#2a2a2a', '#4a4a4a', '#6a6a6a', '#8a8a8a'] as const

/** Precomputed 4-swatch palette (see scripts/extract-cover-palettes.mjs). */
export function coverPalette(src: string): string[] {
  const map = coverPalettesJson as Record<string, string[]>
  const colors = map[src]
  if (!colors?.length) return [...FALLBACK_PALETTE]
  const out = colors.slice(0, 4)
  while (out.length < 4) out.push(out[out.length - 1] || FALLBACK_PALETTE[out.length])
  return out
}
