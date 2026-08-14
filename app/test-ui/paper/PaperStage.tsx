'use client'

import paper from 'paper'
import { useEffect, useRef } from 'react'
import type { MosaicPattern } from '@/lib/mosaicPattern'
import { mosaicPieceColumnRect, mosaicPieceWorldPoints } from '@/lib/mosaicWorld'
import type { SeriesCardItem } from '@/lib/seriesItems'

type Props = {
  items: SeriesCardItem[]
  pattern: MosaicPattern
  onHoverTitle: (title: string | null) => void
}

type Jelly = {
  path: paper.Path
  outline: paper.Path
  rest: paper.Point[]
  title: string
}

export default function PaperStage({ items, pattern, onHoverTitle }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoverRef = useRef(onHoverTitle)
  hoverRef.current = onHoverTitle

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const scope = new paper.PaperScope()
    scope.setup(canvas)
    const mouse = new scope.Point(0, 0)
    let mouseIn = false
    let lastHover: string | null = null
    let jellies: Jelly[] = []
    let rebuildTimer = 0

    const setHover = (title: string | null) => {
      if (title === lastHover) return
      lastHover = title
      hoverRef.current(title)
    }

    const build = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (w < 8 || h < 8) return
      scope.project.clear()
      scope.view.viewSize = new scope.Size(w, h)
      jellies = []

      const bg = new scope.Path.Rectangle(new scope.Rectangle(0, 0, w, h))
      bg.fillColor = new scope.Color('#0b0b10')

      const pieces = pattern.pieces.slice().sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      for (const piece of pieces) {
        const item = items[piece.slot]
        if (!item) continue
        const pts = mosaicPieceWorldPoints(pattern, piece, w, h)
        if (pts.length < 3) continue
        const rect = mosaicPieceColumnRect(pattern, piece, w, h)
        const path = new scope.Path({
          segments: pts.map((p) => new scope.Point(p.x, p.y)),
          closed: true,
          fillColor: new scope.Color('#16161c'),
        })
        const raster = new scope.Raster(item.image)
        raster.onLoad = () => {
          raster.fitBounds(new scope.Rectangle(rect.x, rect.y, rect.w, rect.h), true)
        }
        new scope.Group({
          children: [path, raster],
          clipped: true,
        })
        const outline = new scope.Path({
          segments: pts.map((p) => new scope.Point(p.x, p.y)),
          closed: true,
          strokeColor: new scope.Color(1, 1, 1, 0.2),
          strokeWidth: 1.1,
          fillColor: null,
        })
        jellies.push({
          path,
          outline,
          rest: pts.map((p) => new scope.Point(p.x, p.y)),
          title: item.title,
        })
      }
    }

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect()
      mouse.x = event.clientX - box.left
      mouse.y = event.clientY - box.top
      mouseIn = true
    }
    const onLeave = () => {
      mouseIn = false
      setHover(null)
    }

    scope.view.onFrame = () => {
      let hitTitle: string | null = null
      for (const jelly of jellies) {
        jelly.path.segments.forEach((seg, i) => {
          const rest = jelly.rest[i]
          if (!rest) return
          let tx = rest.x
          let ty = rest.y
          if (mouseIn) {
            const dx = mouse.x - rest.x
            const dy = mouse.y - rest.y
            const dist = Math.hypot(dx, dy) || 1
            if (dist < 150) {
              const pull = (1 - dist / 150) ** 1.15
              tx += dx * pull * 0.32
              ty += dy * pull * 0.32
            }
          }
          seg.point.x += (tx - seg.point.x) * 0.22
          seg.point.y += (ty - seg.point.y) * 0.22
          const outlineSeg = jelly.outline.segments[i]
          if (outlineSeg) outlineSeg.point.set(seg.point)
        })
        if (mouseIn && jelly.path.contains(mouse)) hitTitle = jelly.title
      }
      if (mouseIn) setHover(hitTitle)
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerenter', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    build()
    const ro = new ResizeObserver(() => {
      window.clearTimeout(rebuildTimer)
      rebuildTimer = window.setTimeout(build, 80)
    })
    ro.observe(wrap)

    return () => {
      ro.disconnect()
      window.clearTimeout(rebuildTimer)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerenter', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      scope.view.onFrame = null
      scope.project.clear()
      hoverRef.current(null)
    }
  }, [items, pattern])

  return (
    <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
