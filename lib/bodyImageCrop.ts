/**
 * Non-destructive crop meta for article body images (markdown / HTML).
 * Stored as data-* on <img>; BodyImage applies a clipped frame on read.
 */

export type BodyImageCrop = {
  scale: number
  /** CSS object-position, e.g. "50% 40%" */
  position: string
  rotation: number
  padColor?: string
  /** CSS aspect-ratio value, e.g. "16 / 10" */
  aspectRatio?: string
}

/** Same labels as Newrite / Tistory image align. */
export type BodyImageAlign = 'alignLeft' | 'alignCenter' | 'alignRight'

export const BODY_IMAGE_ALIGN_OPTIONS: Array<{
  id: BodyImageAlign
  label: string
}> = [
  { id: 'alignLeft', label: '왼쪽 정렬' },
  { id: 'alignCenter', label: '가운데 정렬' },
  { id: 'alignRight', label: '오른쪽 정렬' },
]

export const BODY_IMAGE_SCALE_MIN = 0.25
export const BODY_IMAGE_SCALE_MAX = 3

export const BODY_IMAGE_FRAME_MULT_MIN = 0.25
export const BODY_IMAGE_FRAME_MULT_MAX = 3

export function parseAspectRatioParts(
  raw: string | undefined,
  fallbackW: number,
  fallbackH: number,
): { w: number; h: number } {
  if (!raw) return { w: fallbackW, h: fallbackH }
  const parts = raw.split('/').map((s) => Number(s.trim()))
  if (parts.length === 2 && parts[0]! > 0 && parts[1]! > 0) {
    return { w: parts[0]!, h: parts[1]! }
  }
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) {
    return { w: n * fallbackH, h: fallbackH }
  }
  return { w: fallbackW, h: fallbackH }
}

export function formatAspectRatioParts(w: number, h: number): string {
  const safeW = Math.max(1, Math.round(w))
  const safeH = Math.max(1, Math.round(h))
  return `${safeW} / ${safeH}`
}

export function frameAspectMultipliers(
  frame: { w: number; h: number },
  naturalW: number,
  naturalH: number,
): { w: number; h: number } {
  if (naturalW <= 0 || naturalH <= 0) return { w: 1, h: 1 }
  return {
    w: clamp(frame.w / naturalW, BODY_IMAGE_FRAME_MULT_MIN, BODY_IMAGE_FRAME_MULT_MAX),
    h: clamp(frame.h / naturalH, BODY_IMAGE_FRAME_MULT_MIN, BODY_IMAGE_FRAME_MULT_MAX),
  }
}

export type BodyImageToken = {
  start: number
  end: number
  raw: string
  src: string
  alt: string
  crop: BodyImageCrop | null
  align: BodyImageAlign
}

const CROP_FRAME_RE =
  /<span\b[^>]*\bbody-img-crop\b[^>]*>[\s\S]*?<\/span>/gi
const IMG_TAG_RE = /<img\b[^>]*>/gi
const MD_IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gi

function attr(raw: string, name: string): string | undefined {
  const re = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i',
  )
  const m = raw.match(re)
  return m?.[1] ?? m?.[2] ?? m?.[3]
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function sanitizeBodyImageCrop(
  raw: Partial<BodyImageCrop> | null | undefined,
): BodyImageCrop {
  const scale = clamp(
    Number(raw?.scale ?? 1),
    BODY_IMAGE_SCALE_MIN,
    BODY_IMAGE_SCALE_MAX,
  )
  const rotation = clamp(Number(raw?.rotation ?? 0), -180, 180)
  const position =
    typeof raw?.position === 'string' && raw.position.trim()
      ? raw.position.trim().slice(0, 40)
      : '50% 50%'
  const padColor =
    typeof raw?.padColor === 'string' && raw.padColor.trim()
      ? raw.padColor.trim().slice(0, 64)
      : undefined
  const aspectRatio =
    typeof raw?.aspectRatio === 'string' && raw.aspectRatio.trim()
      ? raw.aspectRatio.trim().slice(0, 32)
      : undefined
  return {
    scale: Math.round(scale * 100) / 100,
    position,
    rotation: Math.round(rotation * 10) / 10,
    padColor,
    aspectRatio,
  }
}

export function parseCropFromImgTag(raw: string): BodyImageCrop | null {
  const scaleRaw = attr(raw, 'data-crop-scale')
  const pos = attr(raw, 'data-crop-pos')
  const rotRaw = attr(raw, 'data-crop-rotate')
  const pad = attr(raw, 'data-pad-color')
  const aspect = attr(raw, 'data-crop-aspect')
  if (
    scaleRaw == null &&
    pos == null &&
    rotRaw == null &&
    pad == null &&
    aspect == null
  ) {
    return null
  }
  return sanitizeBodyImageCrop({
    scale: scaleRaw != null ? Number(scaleRaw) : 1,
    position: pos,
    rotation: rotRaw != null ? Number(rotRaw) : 0,
    padColor: pad,
    aspectRatio: aspect,
  })
}

export function sanitizeBodyImageAlign(raw: unknown): BodyImageAlign {
  if (raw === 'alignLeft' || raw === 'alignRight' || raw === 'floatLeft') {
    return raw === 'floatLeft' ? 'alignLeft' : raw
  }
  if (raw === 'floatRight') return 'alignRight'
  return 'alignCenter'
}

export function parseAlignFromImgTag(raw: string): BodyImageAlign {
  const a =
    attr(raw, 'data-align') ||
    attr(raw, 'data-ke-align') ||
    attr(raw, 'data-ke-style')
  return sanitizeBodyImageAlign(a)
}

export function alignTextAlign(align: BodyImageAlign): 'left' | 'center' | 'right' {
  if (align === 'alignLeft') return 'left'
  if (align === 'alignRight') return 'right'
  return 'center'
}

/** Normalize src for matching (proxy ↔ raw github, decode). */
export function normalizeBodyImageSrc(src: string): string {
  let s = src.trim()
  try {
    s = decodeURIComponent(s)
  } catch {
    /* keep */
  }
  const m = s.match(/\/api\/images\/(.+)$/)
  if (m?.[1]) return m[1].replace(/^\/+/, '')
  const raw = s.match(
    /raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)$/,
  )
  if (raw?.[1]) return raw[1].replace(/^\/+/, '')
  return s.replace(/^\/+/, '')
}

export function srcMatches(a: string, b: string): boolean {
  if (a === b) return true
  return normalizeBodyImageSrc(a) === normalizeBodyImageSrc(b)
}

function overlapsRange(
  found: BodyImageToken[],
  start: number,
  end: number,
): boolean {
  return found.some((t) => start < t.end && end > t.start)
}

export function listBodyImageTokens(body: string): BodyImageToken[] {
  const found: BodyImageToken[] = []
  let m: RegExpExecArray | null

  const frameRe = new RegExp(CROP_FRAME_RE.source, 'gi')
  while ((m = frameRe.exec(body))) {
    const raw = m[0]
    const imgM = raw.match(/<img\b[^>]*>/i)
    if (!imgM) continue
    const imgRaw = imgM[0]
    const src = attr(imgRaw, 'src') || ''
    if (!src) continue
    found.push({
      start: m.index,
      end: m.index + raw.length,
      raw,
      src,
      alt: attr(imgRaw, 'alt') || '',
      crop: parseCropFromImgTag(imgRaw),
      align: parseAlignFromImgTag(imgRaw),
    })
  }

  const htmlRe = new RegExp(IMG_TAG_RE.source, 'gi')
  while ((m = htmlRe.exec(body))) {
    const raw = m[0]
    const start = m.index
    const end = start + raw.length
    if (overlapsRange(found, start, end)) continue
    const src = attr(raw, 'src') || ''
    if (!src) continue
    found.push({
      start,
      end,
      raw,
      src,
      alt: attr(raw, 'alt') || '',
      crop: parseCropFromImgTag(raw),
      align: parseAlignFromImgTag(raw),
    })
  }

  const mdRe = new RegExp(MD_IMG_RE.source, 'gi')
  while ((m = mdRe.exec(body))) {
    const raw = m[0]
    const start = m.index
    const end = start + raw.length
    if (overlapsRange(found, start, end)) continue
    const alt = m[1] || ''
    const src = m[2] || ''
    if (!src) continue
    found.push({
      start,
      end,
      raw,
      src,
      alt,
      crop: null,
      align: 'alignCenter',
    })
  }

  found.sort((a, b) => a.start - b.start)
  return found
}

function escAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

export function serializeBodyImgHtml(
  src: string,
  alt: string,
  opts?: {
    crop?: BodyImageCrop | null
    align?: BodyImageAlign
  },
): string {
  const align = sanitizeBodyImageAlign(opts?.align ?? 'alignCenter')
  const crop = opts?.crop ? sanitizeBodyImageCrop(opts.crop) : null
  const margin =
    align === 'alignLeft'
      ? 'margin:0 auto 1.4rem 0;'
      : align === 'alignRight'
        ? 'margin:0 0 1.4rem auto;'
        : 'margin:0 auto 1.4rem;'
  const maxW =
    align === 'alignCenter' ? 'max-width:100%;' : 'max-width:min(100%,85%);'

  if (crop) {
    const aspect = crop.aspectRatio || '16 / 10'
    const pad = crop.padColor || '#e9e9e9'
    // Keep src = original. Visual crop is data-* only (BodyImage applies it).
    // Do not bake object-fit/transform into style — that made re-crop look pre-cut.
    return (
      `<img src="${escAttr(src)}"` +
      ` alt="${escAttr(alt)}"` +
      ` data-align="${align}"` +
      ` data-crop-scale="${crop.scale}"` +
      ` data-crop-pos="${escAttr(crop.position)}"` +
      ` data-crop-rotate="${crop.rotation}"` +
      ` data-crop-aspect="${escAttr(aspect)}"` +
      (crop.padColor ? ` data-pad-color="${escAttr(crop.padColor)}"` : '') +
      ` style="display:block;width:100%;${maxW}aspect-ratio:${escAttr(aspect)};background:${escAttr(pad)};border-radius:8px;${margin}"` +
      ` loading="lazy" />`
    )
  }

  return (
    `<img src="${escAttr(src)}"` +
    ` alt="${escAttr(alt)}"` +
    ` data-align="${align}"` +
    ` style="display:block;width:100%;${maxW}height:auto;border-radius:8px;${margin}"` +
    ` loading="lazy" />`
  )
}

/** @deprecated use serializeBodyImgHtml */
export function serializeCroppedImgHtml(
  src: string,
  alt: string,
  crop: BodyImageCrop,
  align: BodyImageAlign = 'alignCenter',
): string {
  return serializeBodyImgHtml(src, alt, { crop, align })
}

/**
 * Replace the Nth body image (0-based, document order) with cropped HTML img.
 */
export function applyCropToNthImage(
  body: string,
  index: number,
  crop: BodyImageCrop,
): string | null {
  const tokens = listBodyImageTokens(body)
  const token = tokens[index]
  if (!token) return null
  const html = serializeBodyImgHtml(token.src, token.alt, {
    crop,
    align: token.align,
  })
  return body.slice(0, token.start) + html + body.slice(token.end)
}

/** Replace the Nth body image alignment (preserves crop meta). */
export function applyAlignToNthImage(
  body: string,
  index: number,
  align: BodyImageAlign,
): string | null {
  const tokens = listBodyImageTokens(body)
  const token = tokens[index]
  if (!token) return null
  const html = serializeBodyImgHtml(token.src, token.alt, {
    crop: token.crop,
    align: sanitizeBodyImageAlign(align),
  })
  return body.slice(0, token.start) + html + body.slice(token.end)
}

export function parseCropFromDataset(
  dataset: Partial<Record<string, string | undefined>>,
): BodyImageCrop | null {
  if (
    dataset.cropScale == null &&
    dataset.cropPos == null &&
    dataset.cropRotate == null &&
    dataset.padColor == null &&
    dataset.cropAspect == null
  ) {
    return null
  }
  return sanitizeBodyImageCrop({
    scale: dataset.cropScale != null ? Number(dataset.cropScale) : 1,
    position: dataset.cropPos,
    rotation: dataset.cropRotate != null ? Number(dataset.cropRotate) : 0,
    padColor: dataset.padColor,
    aspectRatio: dataset.cropAspect,
  })
}
