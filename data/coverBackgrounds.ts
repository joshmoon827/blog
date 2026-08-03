/**
 * Cover generation — solid background color options.
 * Edit / add hex codes here; the picker reads this list.
 * Empty selection in the UI = no forced background (default prompt behavior).
 * Users may also pick any custom #rrggbb via the color picker / hex field.
 */
export const COVER_BACKGROUND_COLORS = [
  // ── edit hex codes below ──────────────────────────────────────────
  '#1a1a1a',
  '#2c2c2c',
  '#3d3d3d',
  '#f5f5f0',
  '#e8e4dc',
  '#d4cfc4',
  '#1e3a5f',
  '#2d4a3e',
  '#5c4033',
  '#4a5568',
  '#c45c26',
  '#6b4c7a',
  // ──────────────────────────────────────────────────────────────────
] as const

export type CoverBackgroundColor = (typeof COVER_BACKGROUND_COLORS)[number]

/** Normalize to lowercase #rrggbb, or '' if invalid. Accepts any hex, not only presets. */
export function normalizeCoverBackgroundHex(raw: string | null | undefined): string {
  const t = String(raw || '').trim()
  if (!t) return ''
  const withHash = t.startsWith('#') ? t : `#${t}`
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : ''
}

/** True for any valid #rrggbb (custom or preset). Empty / invalid → false. */
export function isCoverBackgroundColor(hex: string): boolean {
  return Boolean(normalizeCoverBackgroundHex(hex))
}

/** True when hex matches a predefined swatch. */
export function isPresetCoverBackgroundColor(hex: string): boolean {
  const n = normalizeCoverBackgroundHex(hex)
  return Boolean(n) && (COVER_BACKGROUND_COLORS as readonly string[]).includes(n)
}
