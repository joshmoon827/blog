'use client'

import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './folder.module.css'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*+=?!<>{}[]'
const CELL = 16
const BAND = 2.8
const LEAD_PUSH = 1.8
const TRAIL_START = 0.18
const TRAIL_BAND = 2.2
const TRAIL_PUSH = 0.9
const DURATION = 1.05 * 1.25
/** manishkr project-folder burst knobs */
const COVERAGE_SCALE = 1.12
const OPACITY_SCALE = 0.68
const CORE_OPACITY = 0.52
const OUTER_OPACITY = 1.28
const COLOR = 'rgb(25, 67, 245)'
const EVENT = 'folder-glyph-burst'

type Glyph = {
  x: number
  y: number
  scatterOffset: number
  visibilityRandom: number
  glyph: string
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function hash(i: number, salt: number, seed: number) {
  const r = Math.sin(i * seed + seed * 2.45 * salt) * 43758.5453
  return r - Math.floor(r)
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function GlyphBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)
  const state = useRef({
    ctx: null as CanvasRenderingContext2D | null,
    glyphs: [] as Glyph[],
    width: 0,
    height: 0,
    dpr: 1,
    tween: null as gsap.core.Tween | null,
    origin: { x: 0, y: 0 },
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rebuild = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const width = Math.max(1, Math.round(window.innerWidth))
      const height = Math.max(1, Math.round(window.innerHeight))
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const cols = Math.ceil(width / CELL) + 1
      const rows = Math.ceil(height / CELL) + 1
      const glyphs: Glyph[] = []
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * CELL + CELL * 0.5
          const y = row * CELL + CELL * 0.5
          const i = row * cols + col
          const pick = Math.floor(hash(i, 13, 431.9) * 52)
          glyphs.push({
            x,
            y,
            scatterOffset: (hash(i, 29, 347.5) - 0.5) * CELL * 1.3,
            visibilityRandom: hash(i, 31, 563.3),
            glyph: GLYPHS[clamp(pick, 0, 51)],
          })
        }
      }
      state.current.ctx = ctx
      state.current.glyphs = glyphs
      state.current.width = width
      state.current.height = height
      state.current.dpr = dpr
    }

    const clear = () => {
      const { ctx } = state.current
      if (!ctx) return
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
    }

    const paint = (progress: number) => {
      const { ctx, glyphs, width, height, dpr, origin } = state.current
      if (!ctx || glyphs.length === 0) return

      const t = clamp(progress, 0, 1)
      const maxRadius =
        Math.max(
          Math.hypot(origin.x, origin.y),
          Math.hypot(width - origin.x, origin.y),
          Math.hypot(origin.x, height - origin.y),
          Math.hypot(width - origin.x, height - origin.y),
        ) *
          COVERAGE_SCALE +
        CELL * 2

      const lead = (1 - (1 - t) ** 2.35) * maxRadius
      const leadBand = CELL * BAND
      const leadPush = CELL * LEAD_PUSH
      const trailT = clamp(t - TRAIL_START * 1.35, 0, 1)
      const trail = (1 - (1 - trailT) ** 2.35) * maxRadius
      const trailBand = CELL * TRAIL_BAND
      const trailPush = CELL * TRAIL_PUSH
      // preserveTrailingCoverage: true → fadeOut starts later (.94)
      const fadeOut = 1 - smoothstep(0.94, 1, t)
      const fontSize = Math.round(CELL * 0.74)

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.font = `650 ${fontSize}px "SF Mono", Menlo, Monaco, Consolas, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = COLOR

      for (const g of glyphs) {
        const dx = g.x - origin.x
        const dy = g.y - origin.y
        const dist = Math.hypot(dx, dy)
        const dirX = dist > 0 ? dx / dist : 0
        const dirY = dist > 0 ? dy / dist : 0
        const leadDelta = lead - dist + g.scatterOffset
        if (leadDelta <= -leadBand) continue

        const leadAmt = smoothstep(-leadBand, leadBand * 0.72, leadDelta)
        const visibleChance = clamp(leadAmt * 1.48, 0, 1)
        if (g.visibilityRandom > visibleChance) continue

        const trailAmt =
          trailT > 0
            ? smoothstep(
                -trailBand,
                trailBand,
                dist - trail + g.scatterOffset * 0.28,
              )
            : 1
        if (trailAmt <= 0.01) continue

        const pull = (1 - leadAmt) * leadPush
        const settle = (1 - trailAmt) * trailPush
        const x = g.x - dirX * pull + dirX * settle
        const y = g.y - dirY * pull + dirY * settle
        // mid-band strongest; leading fringe boosted; deeper band slightly softened
        const core = lerp(1, CORE_OPACITY, smoothstep(0.3, 1, leadAmt))
        const outer = lerp(OUTER_OPACITY, 1, smoothstep(0.42, 0.92, leadAmt))

        ctx.globalAlpha =
          fadeOut *
          trailAmt *
          (0.34 + leadAmt * 0.66) *
          OPACITY_SCALE *
          core *
          outer
        ctx.fillText(
          g.glyph,
          Math.round(x * dpr) / dpr,
          Math.round(y * dpr) / dpr,
        )
      }

      ctx.globalAlpha = 1
      ctx.restore()
    }

    const play = (origin: { x: number; y: number }) => {
      if (reducedMotion()) return
      rebuild()
      state.current.origin = origin
      state.current.tween?.kill()
      clear()
      canvas.style.opacity = '1'
      canvas.style.visibility = 'visible'
      const proxy = { progress: 0 }
      paint(0.001)
      state.current.tween = gsap.to(proxy, {
        progress: 1,
        duration: DURATION,
        ease: 'none',
        onUpdate: () => paint(proxy.progress),
        onComplete: () => {
          clear()
          canvas.style.opacity = '0'
          canvas.style.visibility = 'hidden'
          state.current.tween = null
        },
      })
    }

    const onBurstEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail
      if (!detail) return
      play(detail)
    }

    rebuild()
    canvas.style.opacity = '0'
    canvas.style.visibility = 'hidden'
    window.addEventListener(EVENT, onBurstEvent)
    window.addEventListener('resize', rebuild)
    return () => {
      window.removeEventListener(EVENT, onBurstEvent)
      window.removeEventListener('resize', rebuild)
      state.current.tween?.kill()
    }
  }, [mounted])

  if (!mounted) return null

  return createPortal(
    <canvas
      ref={canvasRef}
      className={styles.glyphBurst}
      aria-hidden
      data-project-glyph-burst=""
    />,
    document.body,
  )
}
