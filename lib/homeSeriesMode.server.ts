/**
 * Server-only home series mode persistence.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_HOME_SERIES_MODE,
  pickHomeSeriesMode,
  sanitizeHomeSeriesMode,
  sanitizeHomeSeriesRandomPool,
  type HomeSeriesMode,
  type HomeSeriesSettings,
} from '@/lib/homeSeriesMode'

export const HOME_SERIES_MODE_PATH = path.join(
  process.cwd(),
  'data',
  'home-series-mode.json',
)

function readRaw(): {
  mode?: unknown
  randomPool?: unknown
  randomEnabled?: unknown
} {
  if (!existsSync(HOME_SERIES_MODE_PATH)) return {}
  return JSON.parse(readFileSync(HOME_SERIES_MODE_PATH, 'utf8')) as {
    mode?: unknown
    randomPool?: unknown
    randomEnabled?: unknown
  }
}

export function readHomeSeriesSettings(): HomeSeriesSettings {
  try {
    const raw = readRaw()
    const randomPool = sanitizeHomeSeriesRandomPool(raw.randomPool)
    return {
      mode: sanitizeHomeSeriesMode(raw.mode ?? DEFAULT_HOME_SERIES_MODE),
      randomEnabled: Boolean(raw.randomEnabled),
      randomPool,
    }
  } catch {
    return {
      mode: DEFAULT_HOME_SERIES_MODE,
      randomEnabled: false,
      randomPool: [],
    }
  }
}

/** Stored default pattern (settings). Does not apply the random pool. */
export function readHomeSeriesMode(): HomeSeriesMode {
  return readHomeSeriesSettings().mode
}

/** Home banner: random from pool when set, otherwise the stored mode. */
export function resolveHomeBannerMode(): HomeSeriesMode {
  return pickHomeSeriesMode(readHomeSeriesSettings())
}

export function writeHomeSeriesSettings(
  patch: Partial<HomeSeriesSettings>,
): HomeSeriesSettings {
  const cur = readHomeSeriesSettings()
  const next: HomeSeriesSettings = {
    mode: patch.mode ? sanitizeHomeSeriesMode(patch.mode) : cur.mode,
    randomEnabled:
      patch.randomEnabled !== undefined
        ? Boolean(patch.randomEnabled)
        : cur.randomEnabled,
    randomPool:
      patch.randomPool !== undefined
        ? sanitizeHomeSeriesRandomPool(patch.randomPool)
        : cur.randomPool,
  }
  mkdirSync(path.dirname(HOME_SERIES_MODE_PATH), { recursive: true })
  writeFileSync(
    HOME_SERIES_MODE_PATH,
    JSON.stringify(next, null, 2) + '\n',
    'utf8',
  )
  return next
}

export function writeHomeSeriesMode(mode: HomeSeriesMode): HomeSeriesMode {
  return writeHomeSeriesSettings({ mode }).mode
}
