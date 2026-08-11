/**
 * Home-card cover edge-matte tuning (local author prefs).
 * Stored in localStorage; defaults match current hard-coded behavior.
 */

export const COVER_MATTE_STORAGE_KEY = 'coverMatteSettings'
export const COVER_MATTE_CHANGE_EVENT = 'cover-matte-settings-change'

export type CoverMatteSettings = {
  /** Height % padding on all sides when edge colors differ (default 3). */
  padPercent: number
  /** RGB distance % vs dominant ring color to trigger padding (default 15). */
  colorDiffPercent: number
  /** Sample ring inset as % of crop height (default 5). */
  ringInsetPercent: number
}

export const DEFAULT_COVER_MATTE_SETTINGS: CoverMatteSettings = {
  padPercent: 3,
  colorDiffPercent: 15,
  ringInsetPercent: 5,
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function sanitizeCoverMatteSettings(
  raw: Partial<CoverMatteSettings> | null | undefined,
): CoverMatteSettings {
  return {
    padPercent: clamp(Number(raw?.padPercent), 0, 20),
    colorDiffPercent: clamp(Number(raw?.colorDiffPercent), 0, 100),
    ringInsetPercent: clamp(Number(raw?.ringInsetPercent), 1, 25),
  }
}

export function readCoverMatteSettings(): CoverMatteSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_COVER_MATTE_SETTINGS }
  try {
    const raw = localStorage.getItem(COVER_MATTE_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_COVER_MATTE_SETTINGS }
    return sanitizeCoverMatteSettings(JSON.parse(raw) as Partial<CoverMatteSettings>)
  } catch {
    return { ...DEFAULT_COVER_MATTE_SETTINGS }
  }
}

export function writeCoverMatteSettings(next: CoverMatteSettings): CoverMatteSettings {
  const sanitized = sanitizeCoverMatteSettings(next)
  if (typeof window === 'undefined') return sanitized
  localStorage.setItem(COVER_MATTE_STORAGE_KEY, JSON.stringify(sanitized))
  window.dispatchEvent(
    new CustomEvent(COVER_MATTE_CHANGE_EVENT, { detail: sanitized }),
  )
  return sanitized
}

export function resetCoverMatteSettings(): CoverMatteSettings {
  return writeCoverMatteSettings({ ...DEFAULT_COVER_MATTE_SETTINGS })
}
