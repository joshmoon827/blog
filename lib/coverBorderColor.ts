/**
 * Sample a thin ring along the *home-card crop* edge (object-fit: cover),
 * not the original image bounds.
 *
 * Inset / color-diff thresholds come from cover matte settings (defaults: 5% / 15%).
 * Pad fill color matches cover watermark post-process: bottom-right corner sample.
 */

import { DEFAULT_COVER_MATTE_SETTINGS } from '@/lib/coverMatteSettings'

const RING_STEP_PX = 4

type Rgb = { r: number; g: number; b: number }

/** Same as scripts/lib/cover-postprocess.mjs CORNER_RATIO (watermark patch). */
const WATERMARK_CORNER_RATIO = 0.16

/**
 * WCAG relative luminance threshold: padColor above this is a light cover
 * (header foreground black); at or below is dark (header foreground white).
 */
export const COVER_LUMINANCE_THRESHOLD = 0.5

export type CoverTone = 'light' | 'dark'

function srgbChannelToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.x relative luminance of an 8-bit sRGB triple. */
export function relativeLuminance(r: number, g: number, b: number): number {
  const R = srgbChannelToLinear(r)
  const G = srgbChannelToLinear(g)
  const B = srgbChannelToLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function parseCssRgb(css: string | null | undefined): Rgb | null {
  if (!css) return null
  const rgb = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i)
  if (rgb) {
    const a = rgb[4] === undefined ? 1 : Number(rgb[4])
    if (!(a > 0.08)) return null
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
  }
  const hex = css.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!hex) return null
  let h = hex[1]
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/** Light/dark from watermark padColor (same sample as probeCoverBorder). */
export function coverToneFromCssColor(css: string | null | undefined): CoverTone | null {
  const rgb = parseCssRgb(css)
  if (!rgb) return null
  return relativeLuminance(rgb.r, rgb.g, rgb.b) > COVER_LUMINANCE_THRESHOLD
    ? 'light'
    : 'dark'
}

/** Default relative RGB distance threshold (0–1). Prefer opts / settings. */
export const COLOR_DIFF_THRESHOLD =
  DEFAULT_COVER_MATTE_SETTINGS.colorDiffPercent / 100

/** Quantize 0–255 channel to reduce near-duplicate colors. */
function quantize(v: number, step = 24): number {
  return Math.round(v / step) * step
}

function colorKey(r: number, g: number, b: number): string {
  return `${quantize(r)},${quantize(g)},${quantize(b)}`
}

/** Euclidean RGB distance normalized to 0–1 (1 ≈ black vs white). */
function rgbDist(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return Math.sqrt(dr * dr + dg * dg + db * db) / (255 * Math.sqrt(3))
}

export type CoverBorderProbe = {
  /** Average of opaque ring pixels. */
  average: string | null
  /** Most frequent quantized color on the ring. */
  dominant: string | null
  /**
   * Average of the top ~8% of the card crop — what sits under a sticky header.
   */
  topColor: string | null
  /**
   * Color used for home-card edge matte — same sample as watermark
   * bottom-right corner fill (cover-postprocess).
   */
  padColor: string | null
  /** Distinct quantized colors on the ring. */
  uniqueCount: number
  /** Max RGB distance (0–1) from dominant to any other ring color. */
  maxDiffFromDominant: number
  /**
   * True when some ring color differs from the dominant by ≥ colorDiffThreshold.
   */
  needsPad: boolean
  ratio: number
}

/**
 * Source rectangle visible under CSS `object-fit: cover` + `object-position: center`.
 * displayAspect = container width / height (e.g. 5/4).
 */
export function coverCropRect(
  imgW: number,
  imgH: number,
  displayAspect: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const imgAspect = imgW / imgH
  if (imgAspect > displayAspect) {
    // Image wider than box → crop left/right
    const sw = imgH * displayAspect
    const sx = (imgW - sw) / 2
    return { sx, sy: 0, sw, sh: imgH }
  }
  // Image taller (or equal) → crop top/bottom
  const sh = imgW / displayAspect
  const sy = (imgH - sh) / 2
  return { sx: 0, sy, sw: imgW, sh }
}

/**
 * Average of the top ~8% of the card crop (sticky-header band).
 */
function sampleCropTopBandColor(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  crop: { sx: number; sy: number; sw: number; sh: number },
): string | null {
  const bandH = Math.max(1, Math.round(crop.sh * 0.08))
  const x0 = Math.round(crop.sx)
  const y0 = Math.round(crop.sy)
  const x1 = Math.round(crop.sx + crop.sw)
  const y1 = Math.min(imgH, Math.round(crop.sy + bandH))
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let count = 0
  const step = 4
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const xi = Math.max(0, Math.min(imgW - 1, x))
      const yi = Math.max(0, Math.min(imgH - 1, y))
      const i = (yi * imgW + xi) * 4
      if (data[i + 3] === 0) continue
      sumR += data[i]
      sumG += data[i + 1]
      sumB += data[i + 2]
      count += 1
    }
  }
  if (!count) return null
  return `rgb(${Math.round(sumR / count)}, ${Math.round(sumG / count)}, ${Math.round(sumB / count)})`
}

/**
 * Same sample as `patchCoverRightCorners` bottom fill:
 * pixel just left of the right 16% strip, 1px above the bottom 16% cut —
 * applied within the card crop rectangle.
 */
function sampleWatermarkBottomRightColor(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  crop: { sx: number; sy: number; sw: number; sh: number },
): string | null {
  const cornerW = Math.max(1, Math.round(crop.sw * WATERMARK_CORNER_RATIO))
  const bottomH = Math.max(1, Math.round(crop.sh * WATERMARK_CORNER_RATIO))
  const cornerX = crop.sx + crop.sw - cornerW
  const bottomY = crop.sy + crop.sh - bottomH
  const sampleX = Math.max(0, Math.min(imgW - 1, Math.round(cornerX - 1)))
  const sampleY = Math.max(0, Math.min(imgH - 1, Math.round(bottomY - 1)))
  const i = (sampleY * imgW + sampleX) * 4
  if (data[i + 3] === 0) return null
  return `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`
}

function walkCropBorderRing(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  crop: { sx: number; sy: number; sw: number; sh: number },
  inset: number,
  onPixel: (r: number, g: number, b: number) => void,
) {
  const left = Math.round(crop.sx + inset)
  const top = Math.round(crop.sy + inset)
  const right = Math.round(crop.sx + crop.sw - 1 - inset)
  const bottom = Math.round(crop.sy + crop.sh - 1 - inset)
  if (right <= left || bottom <= top) return

  const take = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(imgW - 1, x))
    const yi = Math.max(0, Math.min(imgH - 1, y))
    const i = (yi * imgW + xi) * 4
    if (data[i + 3] === 0) return
    onPixel(data[i], data[i + 1], data[i + 2])
  }

  for (let x = left; x <= right; x += RING_STEP_PX) take(x, top)
  for (let y = top + RING_STEP_PX; y <= bottom; y += RING_STEP_PX) take(right, y)
  for (let x = right - RING_STEP_PX; x >= left; x -= RING_STEP_PX) take(x, bottom)
  for (let y = bottom - RING_STEP_PX; y > top; y -= RING_STEP_PX) take(left, y)
}

export type ProbeCoverBorderOptions = {
  /** Home card aspect as width/height (default 5/4). */
  displayAspect?: number
  /** Ring inset as fraction of crop height (default from settings: 0.05). */
  ringInsetRatio?: number
  /** Relative RGB distance 0–1 to trigger padding (default from settings: 0.15). */
  colorDiffThreshold?: number
}

/**
 * Probe the border of the *card-cropped* region (object-fit: cover).
 */
export function probeCoverBorder(
  src: string,
  opts?: ProbeCoverBorderOptions,
): Promise<CoverBorderProbe | null> {
  const displayAspect = opts?.displayAspect && opts.displayAspect > 0 ? opts.displayAspect : 5 / 4
  const ringInsetRatio =
    opts?.ringInsetRatio && opts.ringInsetRatio > 0
      ? opts.ringInsetRatio
      : DEFAULT_COVER_MATTE_SETTINGS.ringInsetPercent / 100
  const colorDiffThreshold =
    typeof opts?.colorDiffThreshold === 'number' && opts.colorDiffThreshold >= 0
      ? opts.colorDiffThreshold
      : COLOR_DIFF_THRESHOLD

  return new Promise((resolve) => {
    const img = new window.Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) {
          resolve(null)
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0)
        const { data } = ctx.getImageData(0, 0, w, h)

        const crop = coverCropRect(w, h, displayAspect)
        const padColor = sampleWatermarkBottomRightColor(data, w, h, crop)
        const topColor = sampleCropTopBandColor(data, w, h, crop)

        const inset = Math.max(
          1,
          Math.min(
            Math.round(crop.sh * ringInsetRatio),
            Math.floor((crop.sw - 1) / 2),
            Math.floor((crop.sh - 1) / 2),
          ),
        )

        let sumR = 0
        let sumG = 0
        let sumB = 0
        let count = 0
        const freq = new Map<string, { n: number; r: number; g: number; b: number }>()

        walkCropBorderRing(data, w, h, crop, inset, (r, g, b) => {
          sumR += r
          sumG += g
          sumB += b
          count += 1
          const key = colorKey(r, g, b)
          const prev = freq.get(key)
          if (prev) prev.n += 1
          else freq.set(key, { n: 1, r: quantize(r), g: quantize(g), b: quantize(b) })
        })

        if (!count) {
          resolve({
            average: null,
            dominant: null,
            topColor,
            padColor,
            uniqueCount: 0,
            maxDiffFromDominant: 0,
            needsPad: false,
            ratio: displayAspect,
          })
          return
        }

        let best: { n: number; r: number; g: number; b: number } | null = null
        for (const v of freq.values()) {
          if (!best || v.n > best.n) best = v
        }

        let maxDiff = 0
        if (best) {
          for (const v of freq.values()) {
            const d = rgbDist(best, v)
            if (d > maxDiff) maxDiff = d
          }
        }

        const average = `rgb(${Math.round(sumR / count)}, ${Math.round(sumG / count)}, ${Math.round(sumB / count)})`
        const dominant = best
          ? `rgb(${best.r}, ${best.g}, ${best.b})`
          : average

        resolve({
          average,
          dominant,
          topColor,
          padColor: padColor ?? dominant,
          uniqueCount: freq.size,
          maxDiffFromDominant: maxDiff,
          needsPad: maxDiff >= colorDiffThreshold,
          ratio: displayAspect,
        })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function colorAtPoint(root: HTMLElement, x: number, y: number): Rgb | null {
  const stack = document.elementsFromPoint(x, y)
  for (const node of stack) {
    if (!(node instanceof Element) || !root.contains(node)) continue
    if (node instanceof HTMLImageElement) {
      const pix = sampleDisplayedPixel(node, x, y)
      if (pix) return pix
    }
    if (node instanceof HTMLCanvasElement) {
      const pix = sampleCanvasPixel(node, x, y)
      if (pix) return pix
    }
    const rgb = parseCssRgb(getComputedStyle(node).backgroundColor)
    if (rgb) return rgb
  }
  return firstOpaqueBackground(root)
}

function firstOpaqueBackground(root: HTMLElement): Rgb | null {
  const walk = (node: Element): Rgb | null => {
    if (node instanceof HTMLElement) {
      const rgb = parseCssRgb(getComputedStyle(node).backgroundColor)
      if (rgb) return rgb
    }
    for (const child of node.children) {
      const hit = walk(child)
      if (hit) return hit
    }
    return null
  }
  return walk(root)
}

function sampleDisplayedPixel(
  img: HTMLImageElement,
  clientX: number,
  clientY: number,
): Rgb | null {
  const box = img.getBoundingClientRect()
  if (box.width < 2 || box.height < 2) return null
  const nx = (clientX - box.left) / box.width
  const ny = (clientY - box.top) / box.height
  if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return null
  const sw = img.naturalWidth
  const sh = img.naturalHeight
  if (!sw || !sh) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, nx * sw, ny * sh, 1, 1, 0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    if (d[3] < 16) return null
    return { r: d[0], g: d[1], b: d[2] }
  } catch {
    return null
  }
}

function sampleCanvasPixel(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Rgb | null {
  const box = canvas.getBoundingClientRect()
  if (box.width < 2 || box.height < 2) return null
  const nx = (clientX - box.left) / box.width
  const ny = (clientY - box.top) / box.height
  if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return null
  try {
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(nx * canvas.width)))
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(ny * canvas.height)))
    const d = ctx.getImageData(x, y, 1, 1).data
    if (d[3] < 16) return null
    return { r: d[0], g: d[1], b: d[2] }
  } catch {
    return null
  }
}

/**
 * Luminance of the top strip of a home cover (mosaic / gsap / webgl / pretext).
 * Samples what is actually painted, not the first article image's watermark corner.
 */
export function coverToneFromElementTop(
  root: HTMLElement,
  stripPx = 64,
): CoverTone | null {
  const rect = root.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return null
  const bandH = Math.min(stripPx, rect.height)
  const cols = 7
  const rows = 3
  let sum = 0
  let n = 0
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = rect.left + ((col + 0.5) / cols) * rect.width
      const y = rect.top + ((row + 0.5) / rows) * bandH
      const rgb = colorAtPoint(root, x, y)
      if (!rgb) continue
      sum += relativeLuminance(rgb.r, rgb.g, rgb.b)
      n += 1
    }
  }
  if (!n) {
    const fallback = firstOpaqueBackground(root)
    if (!fallback) return null
    return relativeLuminance(fallback.r, fallback.g, fallback.b) > COVER_LUMINANCE_THRESHOLD
      ? 'light'
      : 'dark'
  }
  return sum / n > COVER_LUMINANCE_THRESHOLD ? 'light' : 'dark'
}
