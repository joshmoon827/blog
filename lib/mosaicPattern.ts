/**
 * Home series mosaic shard pattern (clip-path polygons + column layout).
 * Pure helpers — safe for client components.
 * Persist via lib/mosaicPattern.server.ts + /api/mosaic-pattern.
 */

export type MosaicPoint = { x: number; y: number }

export type MosaicLayoutMode = 'columns' | 'free'

export type MosaicObjectFit = 'cover' | 'contain'

export type MosaicPiece = {
  id: string
  label: string
  /** Index into series preview items (0..n-1). */
  slot: number
  /** Grid column (0-based). Overlay pieces share a column. Ignored visually in `free`. */
  column: number
  /** Absolute fill within the column cell (or full canvas in `free`). */
  overlay?: boolean
  zIndex?: number
  /** How the image fills the clipped shape. Default `cover`. */
  objectFit?: MosaicObjectFit
  /** CSS object-position, e.g. "center" / "20% 40%". */
  objectPosition?: string
  /**
   * Image zoom inside the clip (Figma Crop).
   * `1` ≈ cover fill; `<1` shrinks (overflow visible in crop UI); `>1` zooms in.
   */
  imageScale?: number
  /** Rotation in degrees (Figma Crop). */
  imageRotation?: number
  /** Fill behind a contain / shrunk image — usually sampled from the photo edge. */
  padColor?: string
  points: MosaicPoint[]
}

/** Scale / rotation bounds for Figma-like crop. */
export const MOSAIC_IMAGE_SCALE_MIN = 0.25
export const MOSAIC_IMAGE_SCALE_MAX = 3
/** Suggested “exact fill” zoom (Figma Fill at 100%). */
export const MOSAIC_COVER_SCALE_MIN = 1
export const MOSAIC_IMAGE_ROTATION_MIN = -180
export const MOSAIC_IMAGE_ROTATION_MAX = 180

export function mosaicScaleMin(
  _piece?: Pick<MosaicPiece, 'objectFit'>,
): number {
  // Crop mode allows shrinking below cover so overflow can be framed.
  return MOSAIC_IMAGE_SCALE_MIN
}

export function mosaicPieceRotation(
  piece: Pick<MosaicPiece, 'imageRotation'>,
): number {
  const n = Number(piece.imageRotation)
  if (!Number.isFinite(n)) return 0
  return clamp(n, MOSAIC_IMAGE_ROTATION_MIN, MOSAIC_IMAGE_ROTATION_MAX)
}

export type MosaicPattern = {
  version: 1
  /** `columns` = split by columns (default); `free` = single canvas, no column split. */
  layout: MosaicLayoutMode
  /** CSS aspect-ratio, e.g. "506 / 184" */
  aspectRatio: string
  /** Column width percentages (should roughly sum to 100 − gaps). */
  columns: number[]
  /** Column gap as % of mosaic width. */
  columnGap: number
  pieces: MosaicPiece[]
}

export const MOSAIC_LAYOUT_OPTIONS: Array<{
  id: MosaicLayoutMode
  label: string
  hint: string
}> = [
  {
    id: 'columns',
    label: '열 분할',
    hint: '가로로 열을 나누고 열마다 조각을 배치합니다.',
  },
  {
    id: 'free',
    label: '자유 캔버스',
    hint: '열 없이 한 캔버스에서 조각 clip-path만 사용합니다.',
  },
]

/** Matches the current hard-coded SeriesCards mosaic (default). */
export const DEFAULT_MOSAIC_PATTERN: MosaicPattern = {
  version: 1,
  layout: 'columns',
  aspectRatio: '506 / 184',
  columns: [23.9, 24.5, 24.5, 23.5],
  columnGap: 1.2,
  pieces: [
    {
      id: 'left',
      label: '왼쪽 (지붕)',
      slot: 0,
      column: 0,
      points: [
        { x: 50, y: 6 },
        { x: 100, y: 44 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 44 },
      ],
    },
    {
      id: 'center',
      label: '가운데',
      slot: 1,
      column: 1,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    },
    {
      id: 'triangle',
      label: '3열 작은 삼각형',
      slot: 2,
      column: 2,
      overlay: true,
      zIndex: 2,
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 0, y: 40 },
      ],
    },
    {
      id: 'house',
      label: '3열 아래 (지붕)',
      slot: 3,
      column: 2,
      overlay: true,
      zIndex: 1,
      points: [
        { x: 50, y: 6 },
        { x: 100, y: 44 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
        { x: 0, y: 44 },
      ],
    },
    {
      id: 'right',
      label: '오른쪽',
      slot: 4,
      column: 3,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 80 },
        { x: 0, y: 100 },
      ],
    },
  ],
}

/**
 * Clean 3-piece home mosaic: equal columns with matching diagonal seams
 * (reads as one banner of three series covers).
 */
export const TRIPTYCH_SLASH_PATTERN: MosaicPattern = {
  version: 1,
  layout: 'columns',
  aspectRatio: '506 / 184',
  columns: [32, 32, 32],
  columnGap: 1.5,
  pieces: [
    {
      id: 'left',
      label: '왼쪽',
      slot: 0,
      column: 0,
      objectFit: 'cover',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 78, y: 100 },
        { x: 0, y: 100 },
      ],
    },
    {
      id: 'center',
      label: '가운데',
      slot: 1,
      column: 1,
      objectFit: 'cover',
      points: [
        { x: 22, y: 0 },
        { x: 100, y: 0 },
        { x: 78, y: 100 },
        { x: 0, y: 100 },
      ],
    },
    {
      id: 'right',
      label: '오른쪽',
      slot: 2,
      column: 2,
      objectFit: 'cover',
      points: [
        { x: 22, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    },
  ],
}

/**
 * Full original bitmap box matching CSS object-fit + transform scale
 * inside a Fw×Fh frame (Figma-style crop ghost).
 */
export function mosaicCoverBitmapSize(
  frameW: number,
  frameH: number,
  naturalW: number,
  naturalH: number,
  scale: number,
  objectFit: MosaicObjectFit = 'cover',
): { w: number; h: number } {
  if (frameW <= 0 || frameH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { w: frameW, h: frameH }
  }
  const ratio =
    objectFit === 'contain'
      ? Math.min(frameW / naturalW, frameH / naturalH)
      : Math.max(frameW / naturalW, frameH / naturalH)
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1
  return {
    w: naturalW * ratio * s,
    h: naturalH * ratio * s,
  }
}

/** Full-bleed canvas — visually matches the default column layout (built lazily). */
let freeMosaicPatternCache: MosaicPattern | null = null

export function getFreeMosaicPattern(): MosaicPattern {
  if (!freeMosaicPatternCache) {
    freeMosaicPatternCache = columnsPatternToFree(DEFAULT_MOSAIC_PATTERN)
  }
  return structuredClone(freeMosaicPatternCache)
}
/**
 * Map a column-split pattern into free-canvas global coordinates
 * so the shards look the same without column tracks.
 */
export function columnsPatternToFree(source: MosaicPattern): MosaicPattern {
  const rawCols = Array.isArray(source.columns) ? source.columns : DEFAULT_MOSAIC_PATTERN.columns
  const columnGap =
    typeof source.columnGap === 'number'
      ? source.columnGap
      : DEFAULT_MOSAIC_PATTERN.columnGap
  const aspectRatio = source.aspectRatio || DEFAULT_MOSAIC_PATTERN.aspectRatio
  const srcPieces = Array.isArray(source.pieces)
    ? source.pieces
    : DEFAULT_MOSAIC_PATTERN.pieces

  const layout = resolveMosaicLayout({
    version: 1,
    layout: 'columns',
    aspectRatio,
    columns: rawCols,
    columnGap,
    pieces: srcPieces as MosaicPiece[],
  })
  const cols = layout.columnPercents
  const mosaicGap =
    layout.widthPercent > 0
      ? (columnGap / Math.max(layout.widthPercent, 0.0001)) * 100
      : 0

  const starts: number[] = []
  let cursor = 0
  for (let i = 0; i < cols.length; i++) {
    starts.push(cursor)
    cursor += cols[i]
    if (i < cols.length - 1) cursor += mosaicGap
  }

  const pieces: MosaicPiece[] = srcPieces.map((piece, i) => {
    const col = Math.min(Math.max(0, piece.column ?? 0), Math.max(0, cols.length - 1))
    const start = starts[col] ?? 0
    const width = Math.max(cols[col] ?? 100, 0.0001)
    const pts = Array.isArray(piece.points) ? piece.points : []
    const points = pts
      .map((pt) => ({
        x: Math.round((start + (Number(pt.x) / 100) * width) * 100) / 100,
        y: Math.round(Number(pt.y) * 100) / 100,
      }))
      .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y))
    return {
      id: String(piece.id || `piece-${i}`).replace(/[^a-z0-9_-]+/gi, '-'),
      label: String(piece.label || piece.id || `조각 ${i + 1}`),
      slot: typeof piece.slot === 'number' ? piece.slot : i,
      column: 0,
      overlay: true,
      zIndex: piece.zIndex ?? i + 1,
      objectFit: piece.objectFit === 'contain' ? 'contain' : 'cover',
      objectPosition: piece.objectPosition,
      imageScale: piece.imageScale,
      imageRotation: piece.imageRotation,
      padColor: piece.padColor,
      points: points.length >= 3 ? points : defaultPiecePoints(),
    }
  })

  return {
    version: 1,
    layout: 'free',
    aspectRatio,
    // Preserve the columns mosaic's used width when converting.
    columns: [
      Math.round(clamp(layout.widthPercent || 100, 30, 100) * 100) / 100,
    ],
    columnGap: 0,
    pieces,
  }
}

export function presetForLayout(layout: MosaicLayoutMode): MosaicPattern {
  if (layout === 'free') return getFreeMosaicPattern()
  return structuredClone(DEFAULT_MOSAIC_PATTERN)
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function sanitizePoint(raw: unknown): MosaicPoint | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as { x?: unknown; y?: unknown }
  return {
    x: Math.round(clamp(Number(o.x), 0, 100) * 100) / 100,
    y: Math.round(clamp(Number(o.y), 0, 100) * 100) / 100,
  }
}

function sanitizeLayout(raw: unknown): MosaicLayoutMode {
  return raw === 'free' ? 'free' : 'columns'
}

function sanitizeObjectFit(raw: unknown): MosaicObjectFit {
  return raw === 'contain' ? 'contain' : 'cover'
}

function sanitizeObjectPosition(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim().slice(0, 40)
  if (!t) return undefined
  // Allow common object-position tokens / percentages.
  if (!/^[a-z0-9%\s._-]+$/i.test(t)) return undefined
  return t
}

function sanitizeImageScale(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  if (!Number.isFinite(n)) return undefined
  const clamped =
    Math.round(clamp(n, MOSAIC_IMAGE_SCALE_MIN, MOSAIC_IMAGE_SCALE_MAX) * 100) /
    100
  return clamped
}

function sanitizeImageRotation(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined
  const n = Number(raw)
  if (!Number.isFinite(n)) return undefined
  const clamped =
    Math.round(clamp(n, MOSAIC_IMAGE_ROTATION_MIN, MOSAIC_IMAGE_ROTATION_MAX) * 10) /
    10
  return clamped === 0 ? undefined : clamped
}

function sanitizePadColor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const t = raw.trim().slice(0, 64)
  if (!t) return undefined
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return t
  if (
    /^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\)$/i.test(
      t,
    )
  ) {
    return t
  }
  return undefined
}

/** Resolved imageScale for a piece (default 1). Clamped by object-fit mode. */
export function mosaicPieceScale(
  piece: Pick<MosaicPiece, 'imageScale' | 'objectFit'>,
): number {
  const n = Number(piece.imageScale)
  if (!Number.isFinite(n)) return 1
  return clamp(n, mosaicScaleMin(piece), MOSAIC_IMAGE_SCALE_MAX)
}

/** Inline styles for the mosaic shard shell (pad fill + transform CSS vars). */
export function mosaicShardShellStyle(
  piece: Pick<
    MosaicPiece,
    'imageScale' | 'objectFit' | 'padColor' | 'imageRotation'
  >,
): {
  backgroundColor?: string
  // CSS custom property consumed by SeriesCards / mosaic-editor styles.
  [key: `--${string}`]: string | undefined
} {
  const scale = mosaicPieceScale(piece)
  const rotation = mosaicPieceRotation(piece)
  // Pad fills letterbox / crop empty areas (scale-down, contain, rotate).
  return {
    ...(piece.padColor ? { backgroundColor: piece.padColor } : {}),
    '--mosaic-img-scale': String(Math.round(scale * 1000) / 1000),
    '--mosaic-img-rotate': `${Math.round(rotation * 10) / 10}deg`,
  }
}

/** Inline styles for the mosaic shard `<img>` — Figma Fill/Fit/Crop. */
export function mosaicShardImageStyle(
  piece: Pick<
    MosaicPiece,
    'objectFit' | 'objectPosition' | 'imageScale' | 'imageRotation'
  >,
): {
  objectFit: MosaicObjectFit
  objectPosition: string
  transformOrigin: string
} {
  const objectPosition = piece.objectPosition?.trim() || 'center'
  const objectFit: MosaicObjectFit =
    piece.objectFit === 'contain' ? 'contain' : 'cover'
  return {
    objectFit,
    objectPosition,
    // Zoom/rotate from the focal point, like Figma crop.
    transformOrigin: objectPosition,
  }
}


export function sanitizeMosaicPattern(
  raw: Partial<MosaicPattern> | null | undefined,
): MosaicPattern {
  const layout = sanitizeLayout(raw?.layout)
  const base = DEFAULT_MOSAIC_PATTERN
  const columnsIn = Array.isArray(raw?.columns) ? raw!.columns : base.columns
  let columns = columnsIn
    .map((c) => Math.round(clamp(Number(c), 4, 100) * 100) / 100)
    .slice(0, 8)

  if (layout === 'free') {
    if (!columns.length) columns = [100]
    // Free canvas width = columns[0] (centered % of container).
    columns = [Math.round(clamp(columns[0] ?? 100, 30, 100) * 100) / 100]
  } else {
    while (columns.length < 2) columns.push(25)
  }

  const piecesIn = Array.isArray(raw?.pieces) ? raw!.pieces : null
  const pieces: MosaicPiece[] = []
  for (const [i, p] of (piecesIn ?? []).entries()) {
    if (!p || typeof p !== 'object') continue
    const points = (Array.isArray(p.points) ? p.points : [])
      .map(sanitizePoint)
      .filter((pt): pt is MosaicPoint => Boolean(pt))
    if (points.length < 3) continue
    const colMax = Math.max(0, columns.length - 1)
    pieces.push({
      id: String(p.id || `piece-${i}`).replace(/[^a-z0-9_-]+/gi, '-'),
      label: String(p.label || p.id || `조각 ${i + 1}`).slice(0, 80),
      slot: clamp(Math.round(Number(p.slot ?? i)), 0, 11),
      column: clamp(Math.round(Number(p.column ?? 0)), 0, colMax),
      overlay: layout === 'free' ? true : Boolean(p.overlay),
      zIndex:
        p.zIndex == null || !Number.isFinite(Number(p.zIndex))
          ? layout === 'free'
            ? i + 1
            : undefined
          : clamp(Math.round(Number(p.zIndex)), 0, 20),
      objectFit: sanitizeObjectFit(p.objectFit),
      objectPosition: sanitizeObjectPosition(p.objectPosition),
      imageScale: sanitizeImageScale(p.imageScale),
      imageRotation: sanitizeImageRotation(
        (p as { imageRotation?: unknown }).imageRotation,
      ),
      padColor: sanitizePadColor(p.padColor),
      points,
    })
  }

  const aspect =
    typeof raw?.aspectRatio === 'string' && raw.aspectRatio.trim()
      ? raw.aspectRatio.trim().slice(0, 32)
      : base.aspectRatio

  let finalPieces = pieces
  if (!finalPieces.length) {
    finalPieces =
      layout === 'free'
        ? getFreeMosaicPattern().pieces
        : structuredClone(base.pieces)
  }

  return {
    version: 1,
    layout,
    aspectRatio: aspect,
    columns: columns.length ? columns : [...base.columns],
    columnGap:
      layout === 'free'
        ? 0
        : Math.round(clamp(Number(raw?.columnGap ?? base.columnGap), 0, 8) * 100) /
          100,
    pieces: finalPieces,
  }
}

export function polygonCss(points: MosaicPoint[]): string {
  const body = points
    .map((p) => `${trimNum(p.x)}% ${trimNum(p.y)}%`)
    .join(', ')
  return `polygon(${body})`
}

/**
 * CSS clip-path for a dark veil with a polygonal hole (Figma crop overlay).
 * Uses evenodd: full rect minus the piece polygon.
 */
export function mosaicDimOverlayClipPath(points: MosaicPoint[]): string {
  if (!points.length) {
    return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
  }
  const outer = '0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%'
  const holePts = [...points]
    .reverse()
    .map((p) => `${trimNum(p.x)}% ${trimNum(p.y)}%`)
  holePts.push(holePts[0])
  return `polygon(evenodd, ${outer}, ${holePts.join(', ')})`
}

function trimNum(n: number) {
  const t = Math.round(n * 100) / 100
  return Number.isInteger(t) ? String(t) : String(t)
}

export function mosaicSlotCount(
  pattern: MosaicPattern = DEFAULT_MOSAIC_PATTERN,
): number {
  return pattern.pieces.reduce((max, p) => Math.max(max, p.slot + 1), 0)
}

/**
 * Fit columns + gaps into ≤100% of the container width, then center.
 * `columns` are treated as % of the full container (not overflowing).
 * Free layout uses `columns[0]` as the centered canvas width (% of container).
 */
export function resolveMosaicLayout(pattern: MosaicPattern) {
  if (pattern.layout === 'free') {
    const raw = Number(pattern.columns?.[0])
    const widthPercent =
      Math.round(clamp(Number.isFinite(raw) ? raw : 100, 30, 100) * 100) / 100
    return {
      columnPercents: [widthPercent],
      widthPercent,
      columnsSum: widthPercent,
      gapTotal: 0,
      gridTemplateColumns: '1fr',
      columnGapPercent: 0,
      clamped: false,
    }
  }

  const n = pattern.columns.length
  const gap = Math.max(0, pattern.columnGap)
  const gapTotal = Math.max(0, n - 1) * gap
  const maxCols = Math.max(0, 100 - gapTotal)

  let cols = pattern.columns.map((c) => Math.max(0, Number(c) || 0))
  let colSum = cols.reduce((a, b) => a + b, 0)

  if (colSum > maxCols && colSum > 0) {
    const scale = maxCols / colSum
    cols = cols.map((c) => Math.round(c * scale * 100) / 100)
    colSum = cols.reduce((a, b) => a + b, 0)
  }

  const usedPercent = Math.round((colSum + gapTotal) * 100) / 100
  const safeUsed = Math.min(100, Math.max(0, usedPercent))
  const columnGapPercent =
    safeUsed > 0 ? Math.round((gap / safeUsed) * 10000) / 100 : 0

  return {
    columnPercents: cols,
    widthPercent: safeUsed,
    columnsSum: Math.round(colSum * 100) / 100,
    gapTotal: Math.round(gapTotal * 100) / 100,
    gridTemplateColumns: cols
      .map((c) => `${Math.max(c, 0.0001)}fr`)
      .join(' '),
    columnGapPercent,
    clamped:
      colSum + 1e-6 <
      pattern.columns.reduce((a, b) => a + Math.max(0, b), 0),
  }
}

export type MosaicLayout = ReturnType<typeof resolveMosaicLayout>

/** Saved reusable mosaic layouts (library / recycle bin of shapes). */
export type MosaicPreset = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  pattern: MosaicPattern
}

export function sanitizeMosaicPreset(
  raw: Partial<MosaicPreset> | null | undefined,
): MosaicPreset | null {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .slice(0, 64)
  const name = String(raw.name || '').trim().slice(0, 80)
  if (!id || !name) return null
  const now = new Date().toISOString()
  return {
    id,
    name,
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt
        ? raw.createdAt
        : now,
    updatedAt:
      typeof raw.updatedAt === 'string' && raw.updatedAt
        ? raw.updatedAt
        : now,
    pattern: sanitizeMosaicPattern(raw.pattern),
  }
}

export function sanitizeMosaicPresetList(raw: unknown): MosaicPreset[] {
  if (!Array.isArray(raw)) return []
  const out: MosaicPreset[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const p = sanitizeMosaicPreset(item as Partial<MosaicPreset>)
    if (!p || seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
  }
  return out
}

/** Seeded recycle-library layouts (merged on read unless user already has the id). */
export const BUILTIN_MOSAIC_PRESETS: MosaicPreset[] = [
  {
    id: 'builtin-triptych-slash',
    name: '3연 대각',
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    pattern: TRIPTYCH_SLASH_PATTERN,
  },
]

/** Prepend missing builtin presets; never overwrite a user-saved id. */
export function mergeBuiltinMosaicPresets(
  stored: MosaicPreset[],
): MosaicPreset[] {
  const ids = new Set(stored.map((p) => p.id))
  const missing = BUILTIN_MOSAIC_PRESETS.filter((p) => !ids.has(p.id)).map(
    (p) => sanitizeMosaicPreset(p)!,
  )
  return [...missing, ...stored]
}

/** Default rectangle for a newly added piece. */
export function defaultPiecePoints(): MosaicPoint[] {
  return [
    { x: 10, y: 10 },
    { x: 90, y: 10 },
    { x: 90, y: 90 },
    { x: 10, y: 90 },
  ]
}

/**
 * Mosaic height must NOT grow when usage width → 100% / full viewport.
 * Cap the aspect-ratio reference width so only horizontal size changes.
 */
export const MOSAIC_HEIGHT_REF_PX = 1200

export function parseAspectRatio(aspectRatio: string): { w: number; h: number } {
  const m = String(aspectRatio || '')
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (!m) return { w: 506, h: 184 }
  const w = Number(m[1])
  const h = Number(m[2])
  if (!(w > 0) || !(h > 0)) return { w: 506, h: 184 }
  return { w, h }
}

/** CSS height that stays stable while mosaic width expands to full page. */
export function mosaicHeightCss(
  aspectRatio: string,
  refPx: number = MOSAIC_HEIGHT_REF_PX,
  /** `vw` = page; `cqw` = nearest container (editor preview). */
  widthUnit: 'vw' | 'cqw' = 'vw',
): string {
  const { w, h } = parseAspectRatio(aspectRatio)
  return `calc(min(100${widthUnit}, ${refPx}px) * ${h} / ${w})`
}
