/**
 * One-shot: sample every stock cover pixel (downscaled) and write 4-color palettes.
 *
 *   node scripts/extract-cover-palettes.mjs
 *
 * Output: data/cover-palettes.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'data', 'cover-palettes.json')
const PUBLIC = join(ROOT, 'public')

/** Paths from data/covers.ts (keep in sync). */
const COVER_PATHS = [
  '/images/aesthetic-usability-effect.jpg',
  '/images/choice-overload.jpg',
  '/images/chunking.jpg',
  '/images/cognitive-bias.jpg',
  '/images/cognitive-load.jpg',
  '/images/doherty-threshold.jpg',
  '/images/familiar-vs-novel.jpg',
  '/images/fitts-law.jpg',
  '/images/flow.jpg',
  '/images/goal-gradient-effect.jpg',
  '/images/hicks-law.jpg',
  '/images/jakobs-law.jpg',
  '/images/law-of-common-region.jpg',
  '/images/law-of-pragnanz.jpg',
  '/images/law-of-proximity.jpg',
  '/images/law-of-similarity.jpg',
  '/images/mental-model.jpg',
  '/images/millers-law.jpg',
  '/images/occams-razor.jpg',
  '/images/onboarding.jpg',
  '/images/paradox-of-active-user.jpg',
  '/images/pareto-principle.jpg',
  '/images/parkinsons-law.jpg',
  '/images/peak-end-rule.jpg',
  '/images/postels-law.jpg',
  '/images/psychology-of-design.jpg',
  '/images/selective-attention.jpg',
  '/images/serial-position-effect.jpg',
  '/images/teslers-law.jpg',
  '/images/uniform-connectedness.jpg',
  '/images/ux-psychology-google.jpg',
  '/images/von-restorff-effect.jpg',
  '/images/working-memory.jpg',
  '/images/zeigarnik-effect.jpg',
]

function toHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function dist2(a, b) {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return dr * dr + dg * dg + db * db
}

/** Median-cut into `target` boxes, then average each box. */
function medianCutPalette(pixels, target = 4) {
  if (!pixels.length) return Array.from({ length: target }, () => '#666666')

  let boxes = [pixels]
  while (boxes.length < target) {
    let bestIdx = -1
    let bestRange = -1
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]
      if (box.length < 2) continue
      let minR = 255,
        maxR = 0,
        minG = 255,
        maxG = 0,
        minB = 255,
        maxB = 0
      for (const [r, g, b] of box) {
        if (r < minR) minR = r
        if (r > maxR) maxR = r
        if (g < minG) minG = g
        if (g > maxG) maxG = g
        if (b < minB) minB = b
        if (b > maxB) maxB = b
      }
      const range = Math.max(maxR - minR, maxG - minG, maxB - minB)
      if (range > bestRange) {
        bestRange = range
        bestIdx = i
      }
    }
    if (bestIdx < 0) break
    const box = boxes[bestIdx]
    let minR = 255,
      maxR = 0,
      minG = 255,
      maxG = 0,
      minB = 255,
      maxB = 0
    for (const [r, g, b] of box) {
      if (r < minR) minR = r
      if (r > maxR) maxR = r
      if (g < minG) minG = g
      if (g > maxG) maxG = g
      if (b < minB) minB = b
      if (b > maxB) maxB = b
    }
    const ranges = [maxR - minR, maxG - minG, maxB - minB]
    const channel = ranges.indexOf(Math.max(...ranges))
    box.sort((a, b) => a[channel] - b[channel])
    const mid = Math.floor(box.length / 2)
    boxes.splice(bestIdx, 1, box.slice(0, mid), box.slice(mid))
  }

  const averages = boxes.map((box) => {
    let r = 0,
      g = 0,
      b = 0
    for (const p of box) {
      r += p[0]
      g += p[1]
      b += p[2]
    }
    const n = box.length || 1
    return [r / n, g / n, b / n]
  })

  // Prefer more saturated / distinct colors first for a vivid 2×2.
  averages.sort((a, b) => {
    const sat = (c) => Math.max(...c) - Math.min(...c)
    return sat(b) - sat(a) || dist2(b, [128, 128, 128]) - dist2(a, [128, 128, 128])
  })

  const picked = []
  for (const c of averages) {
    if (picked.every((p) => dist2(p, c) > 28 * 28)) picked.push(c)
    if (picked.length >= target) break
  }
  for (const c of averages) {
    if (picked.length >= target) break
    if (picked.every((p) => dist2(p, c) > 12 * 12)) picked.push(c)
  }
  while (picked.length < target) {
    picked.push(picked[picked.length - 1] || [102, 102, 102])
  }

  return picked.slice(0, target).map(([r, g, b]) => toHex(r, g, b))
}

async function paletteForFile(absPath) {
  const { data, info } = await sharp(absPath)
    .rotate()
    .resize(96, 60, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = []
  for (let i = 0; i < data.length; i += info.channels) {
    const a = info.channels === 4 ? data[i + 3] : 255
    if (a < 16) continue
    pixels.push([data[i], data[i + 1], data[i + 2]])
  }
  return medianCutPalette(pixels, 4)
}

async function main() {
  /** @type {Record<string, string[]>} */
  const out = {}
  for (const rel of COVER_PATHS) {
    const abs = join(PUBLIC, rel.replace(/^\//, ''))
    if (!existsSync(abs)) {
      console.warn('[skip] missing', rel)
      out[rel] = ['#2a2a2a', '#4a4a4a', '#6a6a6a', '#8a8a8a']
      continue
    }
    const colors = await paletteForFile(abs)
    out[rel] = colors
    console.log(rel, '→', colors.join(' '))
  }
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')
  console.log('\nWrote', OUT, `(${Object.keys(out).length} covers)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
