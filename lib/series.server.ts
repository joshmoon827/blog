/**
 * Server-only series folder persistence (data/category.json).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_SERIES,
  DEFAULT_SERIES_COVERS,
  DEFAULT_SERIES_LIST_LAYOUT,
  reorderSeriesBySlugs,
  sanitizeSeriesFile,
  sanitizeSeriesListLayout,
  sanitizeSeriesRecord,
  uniqueSeriesSlug,
  type SeriesFile,
  type SeriesListLayout,
  type SeriesRecord,
} from '@/lib/series'

export const SERIES_PATH = path.join(process.cwd(), 'data', 'category.json')

function readRaw(): unknown {
  if (!existsSync(SERIES_PATH)) return null
  return JSON.parse(readFileSync(SERIES_PATH, 'utf8')) as unknown
}

export function readSeriesFile(): SeriesFile {
  try {
    const raw = readRaw()
    if (raw == null) {
      const initial: SeriesFile = {
        layout: { ...DEFAULT_SERIES_LIST_LAYOUT },
        series: DEFAULT_SERIES.map((s) => ({ ...s })),
      }
      writeSeriesFile(initial)
      return initial
    }
    return sanitizeSeriesFile(raw)
  } catch {
    return {
      layout: { ...DEFAULT_SERIES_LIST_LAYOUT },
      series: DEFAULT_SERIES.map((s) => ({ ...s })),
    }
  }
}

export function writeSeriesFile(file: SeriesFile): SeriesFile {
  const next = sanitizeSeriesFile(file)
  mkdirSync(path.dirname(SERIES_PATH), { recursive: true })
  writeFileSync(
    SERIES_PATH,
    JSON.stringify(
      {
        layout: next.layout,
        series: next.series,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )
  return next
}

export function readSeriesList(): SeriesRecord[] {
  return readSeriesFile().series
}

export function readSeriesListLayout(): SeriesListLayout {
  return readSeriesFile().layout
}

export function writeSeriesList(list: SeriesRecord[]): SeriesRecord[] {
  const cur = readSeriesFile()
  return writeSeriesFile({ ...cur, series: list }).series
}

export function writeSeriesListLayout(layout: SeriesListLayout): SeriesListLayout {
  const cur = readSeriesFile()
  return writeSeriesFile({
    ...cur,
    layout: sanitizeSeriesListLayout(layout),
  }).layout
}

export function reorderSeries(order: string[]): SeriesRecord[] {
  const cur = readSeriesFile()
  const series = reorderSeriesBySlugs(cur.series, order)
  return writeSeriesFile({ ...cur, series }).series
}

export function writeSeriesCoverBytes(
  slug: string,
  bytes: Buffer,
  ext: string,
): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${slug}-${stamp}.${ext}`
  const dir = path.join(process.cwd(), 'public', 'images', 'category')
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, filename), bytes)
  return `/images/category/${filename}`
}

export function createSeries(input: {
  title: string
  articleSlugs?: string[]
  coverImage?: string
}): SeriesRecord {
  const file = readSeriesFile()
  const slug = uniqueSeriesSlug(
    input.title,
    file.series.map((s) => s.slug),
  )
  const next = sanitizeSeriesRecord({
    slug,
    title: input.title,
    description: '',
    coverImage: input.coverImage?.trim() || DEFAULT_SERIES_COVERS.cloud,
    matchTags: [],
    articleSlugs: Array.isArray(input.articleSlugs) ? input.articleSlugs : [],
  })
  if (!next) {
    throw new Error('카테고리를 만들 수 없습니다')
  }
  writeSeriesFile({
    ...file,
    series: [...file.series, next],
  })
  return next
}

export function readSeriesBySlug(slug: string): SeriesRecord | null {
  const key = slug.trim().toLowerCase()
  return readSeriesList().find((s) => s.slug === key) ?? null
}

export function updateSeries(
  slug: string,
  patch: Omit<Partial<SeriesRecord>, 'articleSlugs'> & {
    articleSlugs?: string[] | null
  },
): SeriesRecord | null {
  const file = readSeriesFile()
  const idx = file.series.findIndex((s) => s.slug === slug.trim().toLowerCase())
  if (idx < 0) return null
  const cur = file.series[idx]
  const next = sanitizeSeriesRecord(
    { ...cur, ...patch, slug: cur.slug },
    cur,
  )
  if (!next) return null
  file.series[idx] = next
  writeSeriesFile(file)
  return next
}
