/**
 * Sample a thin ring along the *home-card crop* edge (object-fit: cover),
 * not the original image bounds.
 *
 * Inset / color-diff thresholds come from cover matte settings (defaults: 5% / 15%).
 * Pad fill color matches cover watermark post-process: bottom-right corner sample.
 */

import { DEFAULT_COVER_MATTE_SETTINGS } from '@/lib/coverMatteSettings'

const RING_STEP_PX = 4

/** Same as scripts/lib/cover-postprocess.mjs CORNER_RATIO (watermark patch). */
const WATERMARK_CORNER_RATIO = 0.16

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

type Rgb = { r: number; g: number; b: number }

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
