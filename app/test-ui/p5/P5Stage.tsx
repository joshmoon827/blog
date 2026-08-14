'use client'

import p5 from 'p5'
import { useEffect, useRef } from 'react'
import type { SeriesCardItem } from '@/lib/seriesItems'

type Particle = {
  x: number
  y: number
  hx: number
  hy: number
  vx: number
  vy: number
  r: number
  g: number
  b: number
  band: number
}

type Props = {
  items: SeriesCardItem[]
  onHoverTitle: (title: string | null) => void
}

const FALLBACK: SeriesCardItem[] = [
  { href: '/category/cloud', title: '클라우드', image: '/images/choice-overload.jpg', count: 0 },
  { href: '/category/opensource', title: '오픈소스', image: '/images/law-of-proximity.jpg', count: 0 },
  { href: '/category/ai', title: 'AI', image: '/images/millers-law.jpg', count: 0 },
]

export default function P5Stage({ items, onHoverTitle }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef(onHoverTitle)
  hoverRef.current = onHoverTitle

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const source = (items.length ? items : FALLBACK).slice(0, 3)
    let sketch: p5 | null = null
    let cancelled = false

    const start = () => {
      if (cancelled || !wrap.isConnected) return
      sketch = new p5((p) => {
        const particles: Particle[] = []
        const images: p5.Image[] = []
        let mouseIn = false
        let step = 7
        let lastHover: string | null = null

        const setHover = (title: string | null) => {
          if (title === lastHover) return
          lastHover = title
          hoverRef.current(title)
        }

        const spawn = () => {
          particles.length = 0
          const w = wrap.clientWidth
          const h = wrap.clientHeight
          if (w < 8 || h < 8) return
          p.resizeCanvas(w, h)
          step = w < 700 ? 9 : 7
          const gap = 6
          const bandW = (w - gap * 2) / 3
          source.forEach((item, band) => {
            const img = images[band]
            if (!img) return
            const x0 = band * (bandW + gap)
            const gfx = p.createGraphics(Math.floor(bandW), Math.floor(h))
            gfx.image(img, 0, 0, gfx.width, gfx.height)
            gfx.loadPixels()
            for (let y = 0; y < gfx.height; y += step) {
              for (let x = 0; x < gfx.width; x += step) {
                const i = 4 * (y * gfx.width + x)
                if ((gfx.pixels[i + 3] ?? 0) < 24) continue
                particles.push({
                  x: x0 + x,
                  y,
                  hx: x0 + x,
                  hy: y,
                  vx: 0,
                  vy: 0,
                  r: gfx.pixels[i] ?? 0,
                  g: gfx.pixels[i + 1] ?? 0,
                  b: gfx.pixels[i + 2] ?? 0,
                  band,
                })
              }
            }
            gfx.remove()
          })
        }

        p.setup = () => {
          const canvas = p.createCanvas(wrap.clientWidth, wrap.clientHeight)
          p.pixelDensity(Math.min(2, window.devicePixelRatio || 1))
          p.noStroke()
          canvas.mouseOver(() => {
            mouseIn = true
          })
          canvas.mouseOut(() => {
            mouseIn = false
            setHover(null)
          })
        }

        p.draw = () => {
          p.background(11, 11, 16)
          const mx = p.mouseX
          const my = p.mouseY
          if (mouseIn) {
            const bandW = p.width / 3
            const idx = Math.max(0, Math.min(2, Math.floor(mx / bandW)))
            setHover(source[idx]?.title ?? null)
          }
          for (const part of particles) {
            if (mouseIn) {
              const dx = part.x - mx
              const dy = part.y - my
              const dist = Math.max(8, Math.hypot(dx, dy))
              if (dist < 92) {
                const f = ((92 - dist) / 92) * 3.2
                part.vx += (dx / dist) * f
                part.vy += (dy / dist) * f
              }
            }
            part.vx += (part.hx - part.x) * 0.06
            part.vy += (part.hy - part.y) * 0.06
            part.vx *= 0.82
            part.vy *= 0.82
            part.x += part.vx
            part.y += part.vy
            p.fill(part.r, part.g, part.b)
            p.rect(part.x, part.y, step - 1.2, step - 1.2)
          }
        }

        p.windowResized = () => {
          spawn()
        }

        Promise.all(
          source.map(
            (item) =>
              new Promise<p5.Image>((resolve) => {
                p.loadImage(item.image, resolve, () => resolve(p.createImage(2, 2)))
              }),
          ),
        ).then((loaded) => {
          if (cancelled) return
          images.splice(0, images.length, ...loaded)
          spawn()
        })
      }, wrap)
    }

    start()

    return () => {
      cancelled = true
      hoverRef.current(null)
      sketch?.remove()
    }
  }, [items])

  return <div ref={wrapRef} style={{ width: '100%', height: '100%' }} />
}
