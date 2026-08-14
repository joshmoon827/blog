/**
 * Server-only mosaic pattern persistence (node:fs).
 * Do not import from client components.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_MOSAIC_PATTERN,
  mergeBuiltinMosaicPresets,
  sanitizeMosaicPattern,
  sanitizeMosaicPreset,
  sanitizeMosaicPresetList,
  type MosaicPattern,
  type MosaicPreset,
} from '@/lib/mosaicPattern'

export const MOSAIC_PATTERN_PATH = path.join(
  process.cwd(),
  'data',
  'mosaic-pattern.json',
)

export const MOSAIC_PRESETS_PATH = path.join(
  process.cwd(),
  'data',
  'mosaic-presets.json',
)

export function readMosaicPattern(): MosaicPattern {
  try {
    if (!existsSync(MOSAIC_PATTERN_PATH)) {
      return structuredClone(DEFAULT_MOSAIC_PATTERN)
    }
    const raw = JSON.parse(
      readFileSync(MOSAIC_PATTERN_PATH, 'utf8'),
    ) as Partial<MosaicPattern>
    return sanitizeMosaicPattern(raw)
  } catch {
    return structuredClone(DEFAULT_MOSAIC_PATTERN)
  }
}

export function writeMosaicPattern(pattern: MosaicPattern): MosaicPattern {
  const next = sanitizeMosaicPattern(pattern)
  mkdirSync(path.dirname(MOSAIC_PATTERN_PATH), { recursive: true })
  writeFileSync(
    MOSAIC_PATTERN_PATH,
    JSON.stringify(next, null, 2) + '\n',
    'utf8',
  )
  return next
}

export function readMosaicPresets(): MosaicPreset[] {
  try {
    if (!existsSync(MOSAIC_PRESETS_PATH)) {
      const seeded = mergeBuiltinMosaicPresets([])
      writeMosaicPresets(seeded)
      return seeded
    }
    const raw = JSON.parse(readFileSync(MOSAIC_PRESETS_PATH, 'utf8'))
    return sanitizeMosaicPresetList(raw)
  } catch {
    return mergeBuiltinMosaicPresets([])
  }
}

function writeMosaicPresets(list: MosaicPreset[]): MosaicPreset[] {
  const next = sanitizeMosaicPresetList(list)
  mkdirSync(path.dirname(MOSAIC_PRESETS_PATH), { recursive: true })
  writeFileSync(
    MOSAIC_PRESETS_PATH,
    JSON.stringify(next, null, 2) + '\n',
    'utf8',
  )
  return next
}

export function upsertMosaicPreset(input: {
  id?: string
  name: string
  pattern: MosaicPattern
}): MosaicPreset {
  const list = readMosaicPresets()
  const now = new Date().toISOString()
  const id =
    (input.id || '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 64) ||
    `preset-${Date.now().toString(36)}`
  const existing = list.find((p) => p.id === id)
  const preset = sanitizeMosaicPreset({
    id,
    name: input.name,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    pattern: input.pattern,
  })
  if (!preset) throw new Error('Invalid preset')
  const next = existing
    ? list.map((p) => (p.id === id ? preset : p))
    : [preset, ...list]
  writeMosaicPresets(next)
  return preset
}

export function deleteMosaicPreset(id: string): MosaicPreset[] {
  const safe = String(id || '').replace(/[^a-z0-9_-]+/gi, '-')
  return writeMosaicPresets(readMosaicPresets().filter((p) => p.id !== safe))
}
