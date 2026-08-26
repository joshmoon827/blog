/**
 * Square-ish cover pad: contain + border-ring matte (article banner / list thumbs).
 * Landscape covers stay object-fit: cover.
 */

/** Treat as square-ish when width/height is below this (banner is ~2.29). */
export const SQUAREISH_MAX_RATIO = 1.55

/** Inset from each edge before walking the border ring. */
const EDGE_INSET_PX = 10

/** Sample every N px along the ring so we don't read every single pixel. */
const RING_STEP_PX = 4

export type CoverPadProbe = {
  ratio: number
  color: string | null
}

export function isSquareishCoverRatio(ratio: number): boolean {
  return ratio <= SQUAREISH_MAX_RATIO
}

export function averageBorderRingColor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): string | null {
  const inset = Math.min(
    EDGE_INSET_PX,
    Math.floor((w - 1) / 2),
    Math.floor((h - 1) / 2),
  )
  const left = inset
  const top = inset
  const right = w - 1 - inset
  const bottom = h - 1 - inset
  if (right <= left || bottom <= top) return null

  const { data } = ctx.getImageData(0, 0, w, h)
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let count = 0

  const take = (x: number, y: number) => {
    const i = (y * w + x) * 4
    const a = data[i + 3]
    if (a === 0) return
    sumR += data[i]
    sumG += data[i + 1]
    sumB += data[i + 2]
    count += 1
  }

  // Walk the inset rectangle clockwise: top → right → bottom → left.
  for (let x = left; x <= right; x += RING_STEP_PX) take(x, top)
  for (let y = top + RING_STEP_PX; y <= bottom; y += RING_STEP_PX) take(right, y)
  for (let x = right - RING_STEP_PX; x >= left; x -= RING_STEP_PX) take(x, bottom)
  for (let y = bottom - RING_STEP_PX; y > top; y -= RING_STEP_PX) take(left, y)

  if (!count) return null
  return `rgb(${Math.round(sumR / count)}, ${Math.round(sumG / count)}, ${Math.round(sumB / count)})`
}

export function probeCoverPad(src: string): Promise<CoverPadProbe | null> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.decoding = 'async'
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      try {
        if (img.decode) await img.decode()
      } catch {
        /* decode can reject on cached images; naturalWidth may still be set */
      }
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
        let color: string | null = null
        try {
          color = averageBorderRingColor(ctx, w, h)
        } catch {
          color = null
        }
        resolve({
          ratio: w / h,
          color,
        })
      } catch {
        const w = img.naturalWidth
        const h = img.naturalHeight
        resolve(w && h ? { ratio: w / h, color: null } : null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}
