'use client'

import Matter from 'matter-js'
import { useEffect, useRef } from 'react'
import type { SeriesCardItem } from '@/lib/seriesItems'
import type { PhysicsSceneId } from './scenes'

const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Query } = Matter

type Props = {
  items: SeriesCardItem[]
  mode: PhysicsSceneId
  onHoverTitle: (title: string | null) => void
}

type CardMeta = {
  item: SeriesCardItem
  img: HTMLImageElement | null
  w: number
  h: number
}

type Ripple = { x: number; y: number; born: number }

const FALLBACK: SeriesCardItem[] = [
  { href: '/category/cloud', title: '클라우드', image: '/images/choice-overload.jpg', count: 0 },
  { href: '/category/opensource', title: '오픈소스', image: '/images/law-of-proximity.jpg', count: 0 },
  { href: '/category/ai', title: 'AI', image: '/images/millers-law.jpg', count: 0 },
]

export default function PhysicsStage({ items, mode, onHoverTitle }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef(onHoverTitle)
  hoverRef.current = onHoverTitle

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    let cancelled = false
    let disposeEngine = () => {}
    let disposeWorld = () => {}
    const images = new Map<string, HTMLImageElement>()
    const source = (items.length ? items : FALLBACK).slice(0, 6)

    const loadImage = (src: string) =>
      new Promise<void>((resolve) => {
        if (images.has(src)) {
          resolve()
          return
        }
        const img = new Image()
        img.onload = () => {
          images.set(src, img)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = src
      })

    const start = () => {
      if (cancelled) return

      const setup = () => {
        disposeEngine()
        const cssW = wrap.clientWidth
        const cssH = wrap.clientHeight
        if (cssW < 8 || cssH < 8) return

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.round(cssW * dpr)
        canvas.height = Math.round(cssH * dpr)
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        const engine = Engine.create({
          gravity: { x: 0, y: mode === 'magnet' ? 0 : 0.92, scale: 0.001 },
        })
        engine.positionIterations = 8
        engine.velocityIterations = 6
        const world = engine.world

        const wall = 72
        Composite.add(world, [
          Bodies.rectangle(cssW / 2, -wall / 2, cssW + wall * 2, wall, { isStatic: true }),
          Bodies.rectangle(cssW / 2, cssH + wall / 2, cssW + wall * 2, wall, { isStatic: true }),
          Bodies.rectangle(-wall / 2, cssH / 2, wall, cssH + wall * 2, { isStatic: true }),
          Bodies.rectangle(cssW + wall / 2, cssH / 2, wall, cssH + wall * 2, { isStatic: true }),
        ])

        const cardW = Math.min(168, Math.max(96, cssW * 0.13))
        const cardH = cardW * (348 / 410)
        const deck: SeriesCardItem[] = []
        const copies = cssW < 640 ? 2 : 3
        for (let c = 0; c < copies; c += 1) {
          for (const item of source.slice(0, 3)) deck.push(item)
        }

        const meta = new WeakMap<Matter.Body, CardMeta>()
        const cards: Matter.Body[] = deck.map((item, i) => {
          const col = i % Math.min(6, deck.length)
          const row = Math.floor(i / Math.min(6, deck.length))
          const jitter = (n: number) => (n - 0.5) * 18
          let x = cssW * 0.16 + col * (cardW + 18) + jitter(hash(i, 1))
          let y = 28 + cardH / 2 + row * (cardH * 0.42) + jitter(hash(i, 2))
          if (mode === 'magnet') {
            const ang = (i / deck.length) * Math.PI * 2
            x = cssW * 0.5 + Math.cos(ang) * Math.min(cssW, cssH) * 0.28
            y = cssH * 0.48 + Math.sin(ang) * Math.min(cssW, cssH) * 0.22
          }
          x = clamp(x, cardW / 2 + 8, cssW - cardW / 2 - 8)
          y = clamp(y, cardH / 2 + 8, cssH - cardH / 2 - 8)

          const body = Bodies.rectangle(x, y, cardW, cardH, {
            chamfer: { radius: 12 },
            restitution: 0.46,
            friction: 0.16,
            frictionAir: mode === 'magnet' ? 0.06 : 0.018,
            density: 0.0022,
            slop: 0.04,
          })
          Body.setAngle(body, (hash(i, 3) - 0.5) * 0.28)
          if (mode === 'sandbox') {
            Body.setAngularVelocity(body, (hash(i, 4) - 0.5) * 0.08)
          }
          meta.set(body, {
            item,
            img: images.get(item.image) ?? null,
            w: cardW,
            h: cardH,
          })
          return body
        })
        Composite.add(world, cards)

        const mouse = Mouse.create(canvas)
        mouse.pixelRatio = 1
        const mouseConstraint = MouseConstraint.create(engine, {
          mouse,
          constraint: {
            stiffness: 0.18,
            damping: 0.12,
            render: { visible: false },
          },
        })
        Composite.add(world, mouseConstraint)

        const pointer = { x: cssW / 2, y: cssH / 2, inside: false }
        const ripples: Ripple[] = []
        let lastHover: string | null = null
        let dragging = false
        let raf = 0
        let last = performance.now()

        const setHover = (title: string | null) => {
          if (title === lastHover) return
          lastHover = title
          hoverRef.current(title)
        }

        const onPointerMove = (event: PointerEvent) => {
          const rect = canvas.getBoundingClientRect()
          pointer.x = event.clientX - rect.left
          pointer.y = event.clientY - rect.top
          pointer.inside = true
        }
        const onPointerEnter = () => {
          pointer.inside = true
        }
        const onPointerLeave = () => {
          pointer.inside = false
          if (!dragging) setHover(null)
        }
        const onPointerDown = (event: PointerEvent) => {
          const rect = canvas.getBoundingClientRect()
          const x = event.clientX - rect.left
          const y = event.clientY - rect.top
          pointer.x = x
          pointer.y = y
          if (mode !== 'burst') return
          const hits = Query.point(cards, { x, y })
          if (hits.length) return
          ripples.push({ x, y, born: performance.now() })
          for (const body of cards) {
            const dx = body.position.x - x
            const dy = body.position.y - y
            const dist = Math.max(28, Math.hypot(dx, dy))
            const power = (0.042 * body.mass) / (dist * 0.018)
            Body.applyForce(body, body.position, {
              x: (dx / dist) * power,
              y: (dy / dist) * power - 0.012 * body.mass,
            })
            Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.22)
          }
        }

        canvas.addEventListener('pointermove', onPointerMove)
        canvas.addEventListener('pointerenter', onPointerEnter)
        canvas.addEventListener('pointerleave', onPointerLeave)
        canvas.addEventListener('pointerdown', onPointerDown)

        const tick = (now: number) => {
          const delta = Math.min(33, now - last)
          last = now

          if (mode === 'magnet' && pointer.inside) {
            for (const body of cards) {
              const dx = pointer.x - body.position.x
              const dy = pointer.y - body.position.y
              const dist = Math.max(36, Math.hypot(dx, dy))
              const nx = dx / dist
              const ny = dy / dist
              const pull = 0.00072 * body.mass
              const swirl = 0.00022 * body.mass
              Body.applyForce(body, body.position, {
                x: nx * pull + -ny * swirl,
                y: ny * pull + nx * swirl,
              })
            }
          }

          Engine.update(engine, delta)

          dragging = Boolean(mouseConstraint.body)
          const hoverBody = Query.point(cards, pointer.inside ? pointer : { x: -1e6, y: -1e6 })[0]
          canvas.style.cursor = dragging ? 'grabbing' : hoverBody ? 'grab' : mode === 'burst' ? 'crosshair' : 'grab'
          if (pointer.inside) {
            const info = hoverBody ? meta.get(hoverBody) : undefined
            setHover(info?.item.title ?? null)
          }

          drawFrame(ctx, cssW, cssH, cards, meta, ripples, pointer, mode, now)
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)

        disposeEngine = () => {
          cancelAnimationFrame(raf)
          canvas.removeEventListener('pointermove', onPointerMove)
          canvas.removeEventListener('pointerenter', onPointerEnter)
          canvas.removeEventListener('pointerleave', onPointerLeave)
          canvas.removeEventListener('pointerdown', onPointerDown)
          Mouse.clearSourceEvents(mouse)
          Composite.clear(world, false)
          Engine.clear(engine)
          setHover(null)
        }
      }

      setup()
      let resizeTimer = 0
      const ro = new ResizeObserver(() => {
        window.clearTimeout(resizeTimer)
        resizeTimer = window.setTimeout(setup, 90)
      })
      ro.observe(wrap)

      disposeWorld = () => {
        ro.disconnect()
        window.clearTimeout(resizeTimer)
        disposeEngine()
      }
    }

    void Promise.all(source.map((item) => loadImage(item.image))).then(start)

    return () => {
      cancelled = true
      disposeWorld()
    }
  }, [items, mode])

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} aria-hidden />
    </div>
  )
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cards: Matter.Body[],
  meta: WeakMap<Matter.Body, CardMeta>,
  ripples: Ripple[],
  pointer: { x: number; y: number; inside: boolean },
  mode: PhysicsSceneId,
  now: number,
) {
  ctx.clearRect(0, 0, w, h)
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#12121a')
  bg.addColorStop(0.45, '#0b0b10')
  bg.addColorStop(1, '#141820')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  if (mode === 'magnet' && pointer.inside) {
    const glow = ctx.createRadialGradient(pointer.x, pointer.y, 8, pointer.x, pointer.y, 160)
    glow.addColorStop(0, 'rgba(255,255,255,0.10)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)
    ctx.beginPath()
    ctx.arc(pointer.x, pointer.y, 10 + Math.sin(now / 240) * 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.25
    ctx.stroke()
  }

  for (let i = ripples.length - 1; i >= 0; i -= 1) {
    const ripple = ripples[i]
    const age = now - ripple.born
    if (age > 700) {
      ripples.splice(i, 1)
      continue
    }
    const t = age / 700
    ctx.beginPath()
    ctx.arc(ripple.x, ripple.y, 18 + t * 220, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.45})`
    ctx.lineWidth = 2.4 * (1 - t)
    ctx.stroke()
  }

  for (const body of cards) {
    const info = meta.get(body)
    if (!info) continue
    const { w: bw, h: bh, img, item } = info
    ctx.save()
    ctx.translate(body.position.x, body.position.y)
    ctx.rotate(body.angle)

    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = 22
    ctx.shadowOffsetY = 10
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12)
    ctx.fillStyle = '#16161c'
    ctx.fill()
    ctx.shadowColor = 'transparent'

    ctx.save()
    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12)
    ctx.clip()
    if (img) {
      drawCover(ctx, img, -bw / 2, -bh / 2, bw, bh)
    } else {
      ctx.fillStyle = '#2a2a33'
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh)
    }
    const veil = ctx.createLinearGradient(0, bh * 0.12, 0, bh / 2)
    veil.addColorStop(0, 'rgba(0,0,0,0)')
    veil.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = veil
    ctx.fillRect(-bw / 2, bh * 0.12, bw, bh / 2)
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = `650 ${Math.max(11, bw * 0.09)}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(item.title, -bw / 2 + 10, bh / 2 - 10, bw - 20)
    ctx.restore()

    roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12)
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 1.25
    ctx.stroke()
    ctx.restore()
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height
  const r = w / h
  let sx = 0
  let sy = 0
  let sw = img.width
  let sh = img.height
  if (ir > r) {
    sw = img.height * r
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / r
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function hash(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}
