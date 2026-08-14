'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import type { SeriesCardItem } from '@/lib/seriesItems'
import { probeCoverBorder } from '@/lib/coverBorderColor'
import {
  defaultPiecePoints,
  mosaicHeightCss,
  mosaicPieceRotation,
  mosaicPieceScale,
  mosaicScaleMin,
  mosaicShardShellStyle,
  MOSAIC_COVER_SCALE_MIN,
  MOSAIC_HEIGHT_REF_PX,
  MOSAIC_IMAGE_ROTATION_MAX,
  MOSAIC_IMAGE_ROTATION_MIN,
  MOSAIC_IMAGE_SCALE_MAX,
  MOSAIC_LAYOUT_OPTIONS,
  parseAspectRatio,
  polygonCss,
  presetForLayout,
  resolveMosaicLayout,
  sanitizeMosaicPattern,
  type MosaicLayoutMode,
  type MosaicPattern,
  type MosaicPiece,
  type MosaicPoint,
  type MosaicPreset,
} from '@/lib/mosaicPattern'
import MosaicCropStage from './MosaicCropStage'
import MosaicRecyclePresets from './MosaicRecyclePresets'
import MosaicBitmapImage from '@/components/MosaicBitmapImage'
import styles from './mosaic-editor.module.css'

type Props = {
  initialPattern: MosaicPattern
  initialPresets?: MosaicPreset[]
  previewItems: SeriesCardItem[]
}

type DragState =
  | {
      kind: 'vertex'
      pieceId: string
      pointIndex: number
      columnEl: HTMLElement
    }
  | {
      kind: 'shape'
      pieceId: string
      columnEl: HTMLElement
      originPoints: MosaicPoint[]
      startX: number
      startY: number
    }
  | {
      kind: 'image'
      pieceId: string
      columnEl: HTMLElement
      originX: number
      originY: number
      startClientX: number
      startClientY: number
    }
  | {
      kind: 'rotate'
      pieceId: string
      columnEl: HTMLElement
      originRotation: number
      centerX: number
      centerY: number
      startAngle: number
    }
  | {
      kind: 'scale'
      pieceId: string
      columnEl: HTMLElement
      originScale: number
      centerX: number
      centerY: number
      startDist: number
    }

const HISTORY_LIMIT = 60

/** Parse CSS object-position into 0–100% focal point. */
function parseObjectPosition(raw: string | undefined): { x: number; y: number } {
  const t = (raw ?? 'center').trim().toLowerCase() || 'center'
  const token = (s: string, axis: 'x' | 'y'): number | null => {
    if (s === 'center' || s === 'centre') return 50
    if (s === 'left') return axis === 'x' ? 0 : null
    if (s === 'right') return axis === 'x' ? 100 : null
    if (s === 'top') return axis === 'y' ? 0 : null
    if (s === 'bottom') return axis === 'y' ? 100 : null
    const m = s.match(/^(-?\d+(?:\.\d+)?)%?$/)
    if (!m) return null
    return clampPct(Number(m[1]))
  }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const x = token(parts[0], 'x')
    const y = token(parts[0], 'y')
    if (x != null && y == null) return { x, y: 50 }
    if (y != null && x == null) return { x: 50, y }
    if (x != null && y != null) return { x, y }
    return { x: 50, y: 50 }
  }
  const x = token(parts[0], 'x') ?? 50
  const y = token(parts[1], 'y') ?? 50
  return { x, y }
}

function formatObjectPosition(x: number, y: number): string {
  const rx = Math.round(clampPct(x) * 10) / 10
  const ry = Math.round(clampPct(y) * 10) / 10
  return `${rx}% ${ry}%`
}

function clonePattern(p: MosaicPattern): MosaicPattern {
  return sanitizeMosaicPattern(structuredClone(p))
}

function midPoint(a: MosaicPoint, b: MosaicPoint): MosaicPoint {
  return {
    x: Math.round(((a.x + b.x) / 2) * 100) / 100,
    y: Math.round(((a.y + b.y) / 2) * 100) / 100,
  }
}

function clampWidth(n: number) {
  if (!Number.isFinite(n)) return 20
  return Math.min(70, Math.max(8, n))
}

function clampPct(n: number) {
  return Math.min(100, Math.max(0, n))
}

function clampRotation(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(
    MOSAIC_IMAGE_ROTATION_MAX,
    Math.max(MOSAIC_IMAGE_ROTATION_MIN, Math.round(n * 10) / 10),
  )
}

function pointerToPct(e: { clientX: number; clientY: number }, el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    x: Math.round(((e.clientX - rect.left) / rect.width) * 10000) / 100,
    y: Math.round(((e.clientY - rect.top) / rect.height) * 10000) / 100,
  }
}

export default function MosaicEditor({
  initialPattern,
  initialPresets = [],
  previewItems,
}: Props) {
  const router = useRouter()
  const { loading, authenticated } = useAuth()
  const canWrite = authenticated && isAuthoringEnabled()

  const [pattern, setPattern] = useState(() => clonePattern(initialPattern))
  const [presets, setPresets] = useState<MosaicPreset[]>(initialPresets)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState(pattern.pieces[0]?.id ?? '')
  const [selectedPoint, setSelectedPoint] = useState(0)
  const [saving, setSaving] = useState(false)
  const [recycling, setRecycling] = useState(false)
  const [message, setMessage] = useState('')
  const [dirty, setDirty] = useState(false)
  const [newPieceColumn, setNewPieceColumn] = useState(0)
  const [addLabel, setAddLabel] = useState('')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  /**
   * When on (double-click a shard): drag pans the image, wheel/slider scales it.
   * Shrunk images show sampled padColor in the empty areas.
   */
  const [imageEditMode, setImageEditMode] = useState(false)
  const [samplingPad, setSamplingPad] = useState(false)
  const dragRef = useRef<DragState | null>(null)
  const patternRef = useRef(pattern)
  const undoStackRef = useRef<MosaicPattern[]>([])
  const redoStackRef = useRef<MosaicPattern[]>([])
  const historyReadyRef = useRef(true)
  const wheelHistoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
  }, [])

  useEffect(() => {
    if (loading) return
    if (!canWrite) {
      router.replace(isAuthoringEnabled() ? '/login?next=/settings/mosaic' : '/')
    }
  }, [loading, canWrite, router])

  const selected = useMemo(
    () => pattern.pieces.find((p) => p.id === selectedId) ?? null,
    [pattern.pieces, selectedId],
  )

  const pushHistory = useCallback(() => {
    undoStackRef.current.push(clonePattern(patternRef.current))
    if (undoStackRef.current.length > HISTORY_LIMIT) {
      undoStackRef.current.shift()
    }
    redoStackRef.current = []
    syncHistoryFlags()
  }, [syncHistoryFlags])

  const applyPattern = useCallback(
    (next: MosaicPattern, opts?: { record?: boolean; selectId?: string }) => {
      if (opts?.record !== false && historyReadyRef.current) {
        pushHistory()
      }
      const sanitized = sanitizeMosaicPattern(next)
      setPattern(sanitized)
      patternRef.current = sanitized
      setDirty(true)
      setMessage('')
      if (opts?.selectId) setSelectedId(opts.selectId)
    },
    [pushHistory],
  )

  const updatePattern = useCallback(
    (next: MosaicPattern) => {
      applyPattern(next, { record: true })
    },
    [applyPattern],
  )

  const updatePatternLive = useCallback((next: MosaicPattern) => {
    const sanitized = sanitizeMosaicPattern(next)
    setPattern(sanitized)
    patternRef.current = sanitized
    setDirty(true)
  }, [])

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop()
    if (!prev) return
    redoStackRef.current.push(clonePattern(patternRef.current))
    setPattern(prev)
    patternRef.current = prev
    setSelectedId(prev.pieces[0]?.id ?? '')
    setDirty(true)
    setMessage('실행 취소')
    syncHistoryFlags()
  }, [syncHistoryFlags])

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(clonePattern(patternRef.current))
    setPattern(next)
    patternRef.current = next
    setSelectedId(next.pieces[0]?.id ?? '')
    setDirty(true)
    setMessage('다시 실행')
    syncHistoryFlags()
  }, [syncHistoryFlags])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const typing =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable
      if (!typing && imageEditMode && (key === 'escape' || key === 'enter')) {
        e.preventDefault()
        setImageEditMode(false)
        setMessage('이미지 크롭을 적용했습니다.')
        return
      }
      const meta = e.metaKey || e.ctrlKey
      if (!meta || typing) return
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      } else if (key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, imageEditMode])

  const patchPiece = useCallback(
    (id: string, patch: Partial<MosaicPiece>, opts?: { record?: boolean }) => {
      const cur = patternRef.current
      applyPattern(
        {
          ...cur,
          pieces: cur.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        },
        { record: opts?.record !== false },
      )
    },
    [applyPattern],
  )

  const patchPieceLive = useCallback(
    (id: string, patch: Partial<MosaicPiece>) => {
      const cur = patternRef.current
      updatePatternLive({
        ...cur,
        pieces: cur.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })
    },
    [updatePatternLive],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      if (drag.kind === 'image') {
        const rect = drag.columnEl.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) return
        // Drag image content: move focal point opposite to pointer.
        const dxPct = ((e.clientX - drag.startClientX) / rect.width) * 100
        const dyPct = ((e.clientY - drag.startClientY) / rect.height) * 100
        patchPieceLive(drag.pieceId, {
          objectPosition: formatObjectPosition(
            drag.originX - dxPct,
            drag.originY - dyPct,
          ),
        })
        return
      }
      if (drag.kind === 'rotate') {
        const angle = Math.atan2(
          e.clientY - drag.centerY,
          e.clientX - drag.centerX,
        )
        const deltaDeg = ((angle - drag.startAngle) * 180) / Math.PI
        let next = drag.originRotation + deltaDeg
        if (e.shiftKey) {
          next = Math.round(next / 15) * 15
        }
        patchPieceLive(drag.pieceId, { imageRotation: clampRotation(next) })
        return
      }
      if (drag.kind === 'scale') {
        const dist = Math.hypot(
          e.clientX - drag.centerX,
          e.clientY - drag.centerY,
        )
        if (drag.startDist <= 1 || dist <= 1) return
        const piece = patternRef.current.pieces.find(
          (p) => p.id === drag.pieceId,
        )
        const min = mosaicScaleMin(piece ?? { objectFit: 'cover' })
        let next =
          Math.round(
            Math.min(
              MOSAIC_IMAGE_SCALE_MAX,
              Math.max(min, drag.originScale * (dist / drag.startDist)),
            ) * 100,
          ) / 100
        if (e.shiftKey) {
          next = Math.round(next * 4) / 4
        }
        patchPieceLive(drag.pieceId, { imageScale: next })
        return
      }
      const pct = pointerToPct(e, drag.columnEl)
      if (!pct) return
      if (drag.kind === 'vertex') {
        patchPieceLive(drag.pieceId, {
          points: (patternRef.current.pieces.find((p) => p.id === drag.pieceId)
            ?.points ?? []
          ).map((pt, i) =>
            i === drag.pointIndex
              ? { x: clampPct(pct.x), y: clampPct(pct.y) }
              : pt,
          ),
        })
        return
      }
      const dx = pct.x - drag.startX
      const dy = pct.y - drag.startY
      patchPieceLive(drag.pieceId, {
        points: drag.originPoints.map((pt) => ({
          x: clampPct(pt.x + dx),
          y: clampPct(pt.y + dy),
        })),
      })
    },
    [patchPieceLive],
  )

  const endDrag = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    // Drag started with a history snapshot already pushed.
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [onPointerMove, endDrag])

  const beginHistoryGesture = useCallback(() => {
    pushHistory()
  }, [pushHistory])

  const startVertexDrag = (
    e: ReactPointerEvent,
    pieceId: string,
    pointIndex: number,
    columnEl: HTMLElement | null,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!columnEl) return
    beginHistoryGesture()
    setSelectedId(pieceId)
    setSelectedPoint(pointIndex)
    dragRef.current = { kind: 'vertex', pieceId, pointIndex, columnEl }
  }

  const startShapeDrag = (
    e: ReactPointerEvent,
    pieceId: string,
    columnEl: HTMLElement | null,
  ) => {
    if (e.button !== 0) return
    // Ignore if clicking a handle (handles stopPropagation, but be safe).
    const t = e.target as HTMLElement | null
    if (t?.closest?.('[data-mosaic-handle]')) return
    if (!columnEl) return
    const piece = patternRef.current.pieces.find((p) => p.id === pieceId)
    if (!piece) return
    e.preventDefault()
    beginHistoryGesture()
    setSelectedId(pieceId)

    // Alt/Option or image-edit mode → adjust object-position (crop framing).
    if (imageEditMode || e.altKey) {
      const origin = parseObjectPosition(piece.objectPosition)
      dragRef.current = {
        kind: 'image',
        pieceId,
        columnEl,
        originX: origin.x,
        originY: origin.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
      }
      return
    }

    const pct = pointerToPct(e, columnEl)
    if (!pct) return
    dragRef.current = {
      kind: 'shape',
      pieceId,
      columnEl,
      originPoints: piece.points.map((p) => ({ ...p })),
      startX: pct.x,
      startY: pct.y,
    }
  }

  const addPointAfter = () => {
    if (!selected) return
    const i = selectedPoint
    const a = selected.points[i]
    const b = selected.points[(i + 1) % selected.points.length]
    const points = [...selected.points]
    points.splice(i + 1, 0, midPoint(a, b))
    patchPiece(selected.id, { points })
    setSelectedPoint(i + 1)
  }

  const removePoint = () => {
    if (!selected || selected.points.length <= 3) return
    const points = selected.points.filter((_, i) => i !== selectedPoint)
    patchPiece(selected.id, { points })
    setSelectedPoint(Math.max(0, selectedPoint - 1))
  }

  const nextSlot = () =>
    pattern.pieces.reduce((max, p) => Math.max(max, p.slot + 1), 0)

  const uniquePieceId = (base: string) => {
    let id = base
    let n = 2
    const used = new Set(pattern.pieces.map((p) => p.id))
    while (used.has(id)) {
      id = `${base}-${n}`
      n += 1
    }
    return id
  }

  const addColumn = () => {
    if (pattern.columns.length >= 8) return
    const avg =
      pattern.columns.reduce((s, c) => s + c, 0) / pattern.columns.length
    const width = Math.round(clampWidth(avg) * 10) / 10
    const colIdx = pattern.columns.length
    const slot = nextSlot()
    const id = uniquePieceId(`col-${colIdx + 1}`)
    const piece: MosaicPiece = {
      id,
      label: `열 ${colIdx + 1}`,
      slot,
      column: colIdx,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    }
    updatePattern({
      ...pattern,
      columns: [...pattern.columns, width],
      pieces: [...pattern.pieces, piece],
    })
    setSelectedId(id)
    setSelectedPoint(0)
  }

  const removeColumn = (colIdx: number) => {
    if (pattern.layout === 'free') return
    if (pattern.columns.length <= 2) return
    const inColumn = pattern.pieces.filter((p) => p.column === colIdx)
    if (
      inColumn.length &&
      !confirm(
        `열 ${colIdx + 1}과 그 안의 조각 ${inColumn.length}개를 삭제할까요?`,
      )
    ) {
      return
    }
    const columns = pattern.columns.filter((_, i) => i !== colIdx)
    const pieces = pattern.pieces
      .filter((p) => p.column !== colIdx)
      .map((p) =>
        p.column > colIdx ? { ...p, column: p.column - 1 } : p,
      )
    const nextSelected =
      pieces.find((p) => p.id === selectedId)?.id ?? pieces[0]?.id ?? ''
    updatePattern({ ...pattern, columns, pieces })
    setSelectedId(nextSelected)
    setSelectedPoint(0)
    setNewPieceColumn(0)
  }

  const applyLayoutPreset = (mode: MosaicLayoutMode) => {
    if (pattern.layout === mode && !dirty) return
    if (
      dirty &&
      !confirm(
        `${mode === 'free' ? '자유 캔버스' : '열 분할'} 기본 레이아웃으로 바꿀까요? 저장하지 않은 변경은 사라집니다.`,
      )
    ) {
      return
    }
    const next = clonePattern(presetForLayout(mode))
    applyPattern(next, { record: true, selectId: next.pieces[0]?.id ?? '' })
    setSelectedPoint(0)
    setNewPieceColumn(0)
    setMessage(
      mode === 'free'
        ? '자유 캔버스 레이아웃을 불러왔습니다. 저장하면 홈에 반영됩니다.'
        : '열 분할 레이아웃을 불러왔습니다. 저장하면 홈에 반영됩니다.',
    )
  }

  const countInColumn = (col: number) =>
    pattern.pieces.filter((p) => p.column === col).length

  const addPiece = () => {
    const free = pattern.layout === 'free'
    const col = free
      ? 0
      : Math.min(Math.max(0, newPieceColumn), Math.max(0, pattern.columns.length - 1))
    const slot = nextSlot()
    const id = uniquePieceId(`piece-${slot + 1}`)
    const label =
      addLabel.trim() ||
      (free ? `조각 ${pattern.pieces.length + 1}` : `열 ${col + 1} 조각`)
    const existingInCol = countInColumn(col)
    const piece: MosaicPiece = {
      id,
      label,
      slot,
      column: col,
      overlay: free || existingInCol > 0,
      zIndex: free ? pattern.pieces.length + 1 : existingInCol + 1,
      objectFit: 'cover',
      objectPosition: 'center',
      imageScale: 1,
      points: defaultPiecePoints(),
    }
    updatePattern({
      ...pattern,
      pieces: [...pattern.pieces, piece],
    })
    setSelectedId(id)
    setSelectedPoint(0)
    setAddLabel('')
  }

  const removePiece = (id: string) => {
    if (pattern.pieces.length <= 1) return
    if (!confirm('이 조각을 삭제할까요?')) return
    const pieces = pattern.pieces.filter((p) => p.id !== id)
    updatePattern({ ...pattern, pieces })
    setSelectedId(pieces[0]?.id ?? '')
    setSelectedPoint(0)
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/mosaic-pattern', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pattern),
      })
      const data = (await res.json()) as MosaicPattern & { error?: string }
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`)
      setPattern(clonePattern(data))
      patternRef.current = clonePattern(data)
      setDirty(false)
      setMessage('저장됨 — 홈에 반영됩니다.')
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const saveAsRecyclePreset = async () => {
    const name = window.prompt(
      '재활용 패턴 이름을 입력하세요',
      `${pattern.layout === 'free' ? '자유' : '열분할'} ${new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    )
    if (!name?.trim()) return
    setRecycling(true)
    setMessage('')
    try {
      const res = await fetch('/api/mosaic-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          pattern: patternRef.current,
        }),
      })
      const data = (await res.json()) as {
        error?: string
        preset?: MosaicPreset
        presets?: MosaicPreset[]
      }
      if (!res.ok) throw new Error(data.error || `Recycle save failed (${res.status})`)
      if (data.presets) setPresets(data.presets)
      if (data.preset) setActivePresetId(data.preset.id)
      setMessage(`재활용 패턴「${name.trim()}」저장됨`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setRecycling(false)
    }
  }

  const applyRecyclePreset = (preset: MosaicPreset) => {
    applyPattern(clonePattern(preset.pattern), {
      record: true,
      selectId: preset.pattern.pieces[0]?.id ?? '',
    })
    setActivePresetId(preset.id)
    setSelectedPoint(0)
    setMessage(`「${preset.name}」패턴을 적용했습니다. 저장하면 홈에 반영됩니다.`)
  }

  const deleteRecyclePreset = async (id: string) => {
    if (!confirm('이 재활용 패턴을 삭제할까요?')) return
    setRecycling(true)
    try {
      const res = await fetch(
        `/api/mosaic-presets?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      )
      const data = (await res.json()) as {
        error?: string
        presets?: MosaicPreset[]
      }
      if (!res.ok) throw new Error(data.error || `Delete failed (${res.status})`)
      if (data.presets) setPresets(data.presets)
      if (activePresetId === id) setActivePresetId(null)
      setMessage('재활용 패턴을 삭제했습니다.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setRecycling(false)
    }
  }

  const resetDefaults = async () => {
    if (!confirm('기본 조각 패턴으로 되돌릴까요?')) return
    setSaving(true)
    try {
      const res = await fetch('/api/mosaic-pattern', { method: 'DELETE' })
      const data = (await res.json()) as MosaicPattern & { error?: string }
      if (!res.ok) throw new Error(data.error || `Reset failed (${res.status})`)
      setPattern(clonePattern(data))
      setSelectedId(data.pieces[0]?.id ?? '')
      setSelectedPoint(0)
      setDirty(false)
      setMessage('기본값으로 복구했습니다.')
      router.refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const aspect = useMemo(
    () => parseAspectRatio(pattern.aspectRatio),
    [pattern.aspectRatio],
  )

  const samplePadColorForPiece = useCallback(
    async (pieceId: string, imageSrc: string | undefined) => {
      if (!imageSrc) return
      setSamplingPad(true)
      try {
        const probe = await probeCoverBorder(imageSrc, {
          displayAspect: aspect.w / aspect.h,
        })
        const color = probe?.padColor || probe?.dominant || probe?.average
        if (!color) return
        const cur = patternRef.current.pieces.find((p) => p.id === pieceId)
        if (!cur || cur.padColor === color) return
        patchPiece(pieceId, { padColor: color })
      } finally {
        setSamplingPad(false)
      }
    },
    [aspect.h, aspect.w, patchPiece],
  )

  const enterImageEdit = useCallback(
    (pieceId: string) => {
      setSelectedId(pieceId)
      setSelectedPoint(0)
      setImageEditMode(true)
      const piece = patternRef.current.pieces.find((p) => p.id === pieceId)
      const item = piece ? previewItems[piece.slot] : undefined
      // Default empty-area fill from cover-border probe (watermark corner).
      if (piece && !piece.padColor) {
        void samplePadColorForPiece(pieceId, item?.image)
      }
      setMessage(
        '크롭 — 면 드래그: 이동 · 오른쪽 아래 핸들: 크기 · 위 핸들: 회전 · 스포이드로 배경색.',
      )
    },
    [previewItems, samplePadColorForPiece],
  )

  const exitImageEdit = useCallback(() => {
    setImageEditMode(false)
    setMessage('이미지 크롭을 적용했습니다.')
  }, [])

  const startRotateDrag = (
    e: ReactPointerEvent,
    pieceId: string,
    columnEl: HTMLElement | null,
    pivot?: { x: number; y: number } | null,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!columnEl) return
    const piece = patternRef.current.pieces.find((p) => p.id === pieceId)
    if (!piece) return
    const rect = columnEl.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    beginHistoryGesture()
    setSelectedId(pieceId)
    const centerX = pivot?.x ?? rect.left + rect.width / 2
    const centerY = pivot?.y ?? rect.top + rect.height / 2
    dragRef.current = {
      kind: 'rotate',
      pieceId,
      columnEl,
      originRotation: mosaicPieceRotation(piece),
      centerX,
      centerY,
      startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
    }
  }

  const startScaleDrag = (
    e: ReactPointerEvent,
    pieceId: string,
    columnEl: HTMLElement | null,
    pivot?: { x: number; y: number } | null,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (!columnEl) return
    const piece = patternRef.current.pieces.find((p) => p.id === pieceId)
    if (!piece) return
    const rect = columnEl.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    beginHistoryGesture()
    setSelectedId(pieceId)
    const centerX = pivot?.x ?? rect.left + rect.width / 2
    const centerY = pivot?.y ?? rect.top + rect.height / 2
    const startDist = Math.hypot(e.clientX - centerX, e.clientY - centerY)
    dragRef.current = {
      kind: 'scale',
      pieceId,
      columnEl,
      originScale: mosaicPieceScale(piece),
      centerX,
      centerY,
      startDist: Math.max(startDist, 8),
    }
  }

  const padColorToHex = (raw: string | undefined): string => {
    const c = raw?.trim() ?? ''
    const m = c.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
    if (m) {
      const hex = [m[1], m[2], m[3]]
        .map((n) => Number(n).toString(16).padStart(2, '0'))
        .join('')
      return `#${hex}`
    }
    if (/^#[0-9a-f]{6}$/i.test(c)) return c
    if (/^#[0-9a-f]{3}$/i.test(c)) {
      const [r, g, b] = c.slice(1)
      return `#${r}${r}${g}${g}${b}${b}`
    }
    return '#e9e9e9'
  }

  const pickPadColorWithEyedropper = async (pieceId: string) => {
    type EyeDropperCtor = new () => {
      open: () => Promise<{ sRGBHex: string }>
    }
    const EyeDropperApi = (
      window as unknown as { EyeDropper?: EyeDropperCtor }
    ).EyeDropper
    if (!EyeDropperApi) {
      setMessage('이 브라우저는 스포이드를 지원하지 않습니다. 색상 칩을 사용하세요.')
      return
    }
    try {
      const result = await new EyeDropperApi().open()
      const hex = result.sRGBHex
      if (!hex) return
      patchPiece(pieceId, { padColor: hex })
      setMessage(`배경색 ${hex}`)
    } catch {
      // User cancelled eyedropper — ignore.
    }
  }

  useEffect(() => {
    if (!imageEditMode) return
    const onWheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement | null
      if (!t?.closest?.(`.${styles.previewFrame}`)) return
      const piece = patternRef.current.pieces.find((p) => p.id === selectedId)
      if (!piece) return
      e.preventDefault()
      const cur = mosaicPieceScale(piece)
      const min = mosaicScaleMin(piece)
      const delta = e.deltaY > 0 ? -0.04 : 0.04
      const next =
        Math.round(
          Math.min(MOSAIC_IMAGE_SCALE_MAX, Math.max(min, cur + delta)) * 100,
        ) / 100
      // One undo step per wheel burst.
      if (!wheelHistoryTimerRef.current) {
        pushHistory()
      } else {
        clearTimeout(wheelHistoryTimerRef.current)
      }
      wheelHistoryTimerRef.current = setTimeout(() => {
        wheelHistoryTimerRef.current = null
      }, 400)
      patchPieceLive(piece.id, { imageScale: next })
      if (next < 0.995 && !piece.padColor) {
        const item = previewItems[piece.slot]
        void samplePadColorForPiece(piece.id, item?.image)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      if (wheelHistoryTimerRef.current) {
        clearTimeout(wheelHistoryTimerRef.current)
        wheelHistoryTimerRef.current = null
      }
    }
  }, [
    imageEditMode,
    selectedId,
    patchPieceLive,
    pushHistory,
    previewItems,
    samplePadColorForPiece,
  ])

  if (loading || !canWrite) {
    return <p className={styles.loading}>불러오는 중…</p>
  }

  const byColumn = new Map<number, MosaicPiece[]>()
  for (const piece of pattern.pieces) {
    const list = byColumn.get(piece.column) ?? []
    list.push(piece)
    byColumn.set(piece.column, list)
  }

  const layout = resolveMosaicLayout(pattern)
  const maxColumnsSum = Math.max(
    0,
    Math.round((100 - layout.gapTotal) * 10) / 10,
  )
  const previewWidth =
    layout.widthPercent >= 99.95 ? '100%' : `${layout.widthPercent}%`
  const previewHeight = mosaicHeightCss(pattern.aspectRatio, 1200, 'cqw')
  const heightAtRef = Math.round((MOSAIC_HEIGHT_REF_PX * aspect.h) / aspect.w)
  const selectedImagePos = selected
    ? parseObjectPosition(selected.objectPosition)
    : { x: 50, y: 50 }

  const setImagePosition = (x: number, y: number, opts?: { record?: boolean }) => {
    if (!selected) return
    patchPiece(
      selected.id,
      { objectPosition: formatObjectPosition(x, y) },
      { record: opts?.record !== false },
    )
  }

  const setMosaicHeightPx = (px: number, opts?: { record?: boolean }) => {
    const clamped = Math.min(640, Math.max(100, Math.round(px)))
    const nextH =
      Math.round(((clamped * aspect.w) / MOSAIC_HEIGHT_REF_PX) * 100) / 100
    const next = {
      ...patternRef.current,
      aspectRatio: `${aspect.w} / ${nextH}`,
    }
    if (opts?.record === false) {
      updatePatternLive(next)
    } else {
      updatePattern(next)
    }
  }

  const setImageScale = (scale: number, opts?: { record?: boolean }) => {
    if (!selected) return
    const min = mosaicScaleMin(selected)
    const next =
      Math.round(
        Math.min(MOSAIC_IMAGE_SCALE_MAX, Math.max(min, scale)) * 100,
      ) / 100
    const patch: Partial<MosaicPiece> = { imageScale: next }
    if (next < 0.995 && !selected.padColor) {
      const item = previewItems[selected.slot]
      void samplePadColorForPiece(selected.id, item?.image)
    }
    patchPiece(selected.id, patch, { record: opts?.record !== false })
  }

  const setImageRotation = (
    degrees: number,
    opts?: { record?: boolean },
  ) => {
    if (!selected) return
    patchPiece(
      selected.id,
      { imageRotation: clampRotation(degrees) },
      { record: opts?.record !== false },
    )
  }

  const setColumnWidth = (index: number, nextWidth: number) => {
    const width = clampWidth(nextWidth)
    const columns = pattern.columns.map((c, idx) => (idx === index ? width : c))
    updatePattern({ ...pattern, columns })
  }

  const scaleAllColumnsToSum = (targetSum: number) => {
    const capped = Math.min(maxColumnsSum, Math.max(8 * pattern.columns.length * 0.25, targetSum))
    const cur = pattern.columns.reduce((s, c) => s + c, 0)
    if (cur <= 0) return
    const scale = capped / cur
    const columns = pattern.columns.map(
      (c) => Math.round(clampWidth(c * scale) * 10) / 10,
    )
    updatePattern({ ...pattern, columns })
  }

  const renderPreviewPiece = (piece: MosaicPiece, forceOverlay: boolean) => {
    const item = previewItems[piece.slot]
    const active = piece.id === selectedId
    const cropping = imageEditMode && active && Boolean(item?.image)
    const dimmed = imageEditMode && !active

    if (cropping && item) {
      const padHex = padColorToHex(piece.padColor)
      return (
        <MosaicCropStage
          key={piece.id}
          piece={piece}
          imageSrc={item.image}
          padHex={padHex}
          samplingPad={samplingPad}
          parseObjectPosition={parseObjectPosition}
          onPan={(e) => {
            const col = e.currentTarget.closest(
              '[data-column]',
            ) as HTMLElement | null
            startShapeDrag(e, piece.id, col)
          }}
          onRotate={(e, pivot) => {
            const col = e.currentTarget.closest(
              '[data-column]',
            ) as HTMLElement | null
            startRotateDrag(e, piece.id, col, pivot)
          }}
          onScale={(e, pivot) => {
            const col = e.currentTarget.closest(
              '[data-column]',
            ) as HTMLElement | null
            startScaleDrag(e, piece.id, col, pivot)
          }}
          onPadColor={(hex) => patchPiece(piece.id, { padColor: hex })}
          onEyedropper={() => void pickPadColorWithEyedropper(piece.id)}
          onAutoPad={() => void samplePadColorForPiece(piece.id, item.image)}
        />
      )
    }

    return (
      <button
        key={piece.id}
        type="button"
        className={`${styles.shard} ${forceOverlay || piece.overlay ? styles.shardOverlay : ''} ${active ? styles.shardActive : ''} ${dimmed ? styles.shardDimmed : ''}`}
        style={{
          clipPath: polygonCss(piece.points),
          zIndex: piece.zIndex ?? (piece.overlay || forceOverlay ? 1 : 0),
          ...mosaicShardShellStyle(piece),
        }}
        onPointerDown={(e) => {
          if (imageEditMode) return
          const col = (e.currentTarget.parentElement as HTMLElement) ?? null
          startShapeDrag(e, piece.id, col)
        }}
        onDoubleClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (item?.image) enterImageEdit(piece.id)
        }}
        onClick={() => {
          setSelectedId(piece.id)
          setSelectedPoint(0)
        }}
        aria-pressed={active}
        aria-label={piece.label}
      >
        {item ? (
          <MosaicBitmapImage src={item.image} piece={piece} />
        ) : (
          <span className={styles.shardEmpty}>{piece.label}</span>
        )}
      </button>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          className={styles.btnRecycle}
          onClick={saveAsRecyclePreset}
          disabled={saving || recycling}
          title="현재 모양을 재활용 패턴으로 보관"
        >
          {recycling ? '보관 중…' : '재활용'}
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={undo}
          disabled={!canUndo || saving}
          title="⌘Z / Ctrl+Z"
        >
          실행 취소
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={redo}
          disabled={!canRedo || saving}
          title="⇧⌘Z / Ctrl+Y"
        >
          다시 실행
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            applyPattern(clonePattern(initialPattern), { record: true })
            setMessage('불러온 값으로 되돌렸습니다.')
          }}
          disabled={saving}
        >
          되돌리기
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={resetDefaults}
          disabled={saving}
        >
          기본값
        </button>
        <Link href="/" className={styles.link}>
          홈에서 확인
        </Link>
        {message ? <span className={styles.message}>{message}</span> : null}
        {dirty ? <span className={styles.dirty}>수정됨</span> : null}
      </div>

      <section className={styles.layoutPicker} aria-label="레이아웃 선택">
        <h2 className={styles.panelTitle}>레이아웃</h2>
        <div className={styles.layoutOptions}>
          {MOSAIC_LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.layoutCard} ${pattern.layout === opt.id ? styles.layoutCardActive : ''}`}
              onClick={() => applyLayoutPreset(opt.id)}
              aria-pressed={pattern.layout === opt.id}
            >
              <strong>{opt.label}</strong>
              <span>{opt.hint}</span>
              {opt.id === 'columns' ? (
                <em className={styles.layoutBadge}>기본</em>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <div
        className={`${styles.previewFrame}${imageEditMode ? ` ${styles.previewFrameCrop}` : ''}`}
      >
        <div className={styles.previewToolbar}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${imageEditMode ? styles.btnToggleOn : ''}`}
            aria-pressed={imageEditMode}
            onClick={() => {
              if (imageEditMode) {
                exitImageEdit()
              } else if (selectedId) {
                const piece = pattern.pieces.find((p) => p.id === selectedId)
                const hasImg =
                  piece != null && Boolean(previewItems[piece.slot]?.image)
                if (!hasImg) {
                  setMessage('선택한 조각에 미리보기 이미지가 없습니다.')
                  return
                }
                enterImageEdit(selectedId)
              } else {
                setMessage('먼저 조각을 선택하세요.')
              }
            }}
            title="피그마 크롭: 프레임 밖은 어둡게, 이미지는 이동·크기·회전"
          >
            {imageEditMode ? '크롭 완료' : 'Edit image'}
          </button>
          <label className={styles.heightControl}>
            <span>
              높이
              <strong>{heightAtRef}px</strong>
            </span>
            <input
              type="range"
              min={100}
              max={640}
              step={4}
              value={Math.min(640, Math.max(100, heightAtRef))}
              onPointerDown={() => beginHistoryGesture()}
              onChange={(e) =>
                setMosaicHeightPx(Number(e.target.value), { record: false })
              }
              aria-label="모자이크 높이"
            />
            <input
              type="number"
              className={styles.heightInput}
              min={100}
              max={640}
              step={4}
              value={heightAtRef}
              onChange={(e) => setMosaicHeightPx(Number(e.target.value))}
              aria-label="모자이크 높이(px)"
            />
          </label>
          <span className={styles.previewHint}>
            {imageEditMode
              ? '원본 사각형만 줄임 · 배경은 사진 밖 · 우상단 ○ 회전 · 우하단 □ 크기 · Enter/Esc 완료'
              : '조각 선택 후 Edit image, 또는 도형 더블클릭'}
          </span>
        </div>
        <div
          className={`${styles.preview} ${imageEditMode ? `${styles.previewPanMode} ${styles.previewCropMode}` : ''}`}
          style={{
            width: previewWidth,
            height: previewHeight,
            maxWidth: '100%',
            marginInline: 'auto',
            gridTemplateColumns: layout.gridTemplateColumns,
            columnGap: `${layout.columnGapPercent}%`,
          }}
        >
          {pattern.layout === 'free' ? (
            <div
              className={styles.column}
              data-column={0}
              style={imageEditMode ? { overflow: 'visible' } : undefined}
            >
              {pattern.pieces
                .slice()
                .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                .map((piece) => renderPreviewPiece(piece, true))}
              {!imageEditMode && selected
                ? selected.points.map((pt, i) => (
                    <button
                      key={`h-${selected.id}-${i}`}
                      type="button"
                      data-mosaic-handle="1"
                      className={`${styles.handle} ${selectedPoint === i ? styles.handleActive : ''}`}
                      style={{ left: `${pt.x}%`, top: `${pt.y}%`, zIndex: 30 }}
                      aria-label={`${selected.label} 점 ${i + 1}`}
                      onPointerDown={(e) => {
                        const col =
                          (e.currentTarget.parentElement as HTMLElement) ?? null
                        startVertexDrag(e, selected.id, i, col)
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPoint(i)
                      }}
                    />
                  ))
                : null}
            </div>
          ) : (
            pattern.columns.map((_, colIdx) => {
              const pieces = (byColumn.get(colIdx) ?? []).slice().sort((a, b) => {
                return (a.zIndex ?? 0) - (b.zIndex ?? 0)
              })
              return (
                <div
                  key={`col-${colIdx}`}
                  className={styles.column}
                  data-column={colIdx}
                  style={
                    imageEditMode && selected?.column === colIdx
                      ? { overflow: 'visible' }
                      : undefined
                  }
                >
                  {pieces.map((piece) => renderPreviewPiece(piece, false))}
                  {!imageEditMode && selected && selected.column === colIdx
                    ? selected.points.map((pt, i) => (
                        <button
                          key={`h-${selected.id}-${i}`}
                          type="button"
                          data-mosaic-handle="1"
                          className={`${styles.handle} ${selectedPoint === i ? styles.handleActive : ''}`}
                          style={{ left: `${pt.x}%`, top: `${pt.y}%`, zIndex: 30 }}
                          aria-label={`${selected.label} 점 ${i + 1}`}
                          onPointerDown={(e) => {
                            const col =
                              (e.currentTarget.parentElement as HTMLElement) ??
                              null
                            startVertexDrag(e, selected.id, i, col)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPoint(i)
                          }}
                        />
                      ))
                    : null}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className={styles.panels}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>조각</h2>
          <div className={styles.addPieceBox}>
            <label className={styles.field}>
              이름 (선택)
              <input
                type="text"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder="새 조각"
              />
            </label>
            {pattern.layout === 'columns' ? (
              <label className={styles.field}>
                열 선택
                <select
                  value={newPieceColumn}
                  onChange={(e) => setNewPieceColumn(Number(e.target.value))}
                >
                  {pattern.columns.map((_, i) => (
                    <option key={`add-col-${i}`} value={i}>
                      열 {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className={styles.hint}>자유 캔버스에서는 전체 폭에 추가됩니다.</p>
            )}
            <button type="button" className={styles.btnPrimary} onClick={addPiece}>
              조각 추가
            </button>
          </div>
          <ul className={styles.pieceList}>
            {pattern.pieces.map((piece) => (
              <li key={piece.id}>
                <button
                  type="button"
                  className={`${styles.pieceBtn} ${piece.id === selectedId ? styles.pieceBtnActive : ''}`}
                  onClick={() => {
                    setSelectedId(piece.id)
                    setSelectedPoint(0)
                  }}
                >
                  <span>{piece.label}</span>
                  <span className={styles.meta}>
                    {pattern.layout === 'free'
                      ? `점 ${piece.points.length}`
                      : `열 ${piece.column + 1} · 점 ${piece.points.length}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <button
              type="button"
              className={styles.btnDanger}
              onClick={() => removePiece(selected.id)}
              disabled={pattern.pieces.length <= 1}
            >
              선택 조각 삭제
            </button>
          ) : null}
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>선택 조각 좌표</h2>
          {selected ? (
            <>
              <p className={styles.hint}>
                꼭짓점 핸들로 모양을 바꾸고, 면(도형 안)을 드래그하면 통째로
                이동합니다. ⌘Z / Ctrl+Z 로 실행 취소할 수 있습니다. 좌표는
                {pattern.layout === 'free'
                  ? ' 전체 캔버스 기준 %입니다.'
                  : ' 해당 열 기준 %입니다.'}
              </p>
              <div className={styles.pointActions}>
                <button type="button" className={styles.btn} onClick={addPointAfter}>
                  점 추가
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={removePoint}
                  disabled={selected.points.length <= 3}
                >
                  점 삭제
                </button>
              </div>
              <div className={styles.pointTable}>
                {selected.points.map((pt, i) => (
                  <div
                    key={`${selected.id}-pt-${i}`}
                    className={`${styles.pointRow} ${selectedPoint === i ? styles.pointRowActive : ''}`}
                  >
                    <button
                      type="button"
                      className={styles.pointIndex}
                      onClick={() => setSelectedPoint(i)}
                    >
                      {i + 1}
                    </button>
                    <label>
                      X
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={pt.x}
                        onChange={(e) =>
                          patchPiece(selected.id, {
                            points: selected.points.map((p, idx) =>
                              idx === i
                                ? { x: Number(e.target.value), y: pt.y }
                                : p,
                            ),
                          })
                        }
                        onFocus={() => setSelectedPoint(i)}
                      />
                    </label>
                    <label>
                      Y
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={pt.y}
                        onChange={(e) =>
                          patchPiece(selected.id, {
                            points: selected.points.map((p, idx) =>
                              idx === i
                                ? { x: pt.x, y: Number(e.target.value) }
                                : p,
                            ),
                          })
                        }
                        onFocus={() => setSelectedPoint(i)}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <label className={styles.field}>
                이름
                <input
                  type="text"
                  value={selected.label}
                  onChange={(e) => patchPiece(selected.id, { label: e.target.value })}
                />
              </label>
              {pattern.layout === 'columns' ? (
                <label className={styles.field}>
                  열
                  <select
                    value={selected.column}
                    onChange={(e) =>
                      patchPiece(selected.id, {
                        column: Number(e.target.value),
                      })
                    }
                  >
                    {pattern.columns.map((_, i) => (
                      <option key={`col-opt-${i}`} value={i}>
                        열 {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className={styles.field}>
                z-index
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={selected.zIndex ?? 0}
                  onChange={(e) =>
                    patchPiece(selected.id, { zIndex: Number(e.target.value) })
                  }
                />
              </label>
              <div className={styles.cropBox}>
                <div className={styles.cropHeader}>
                  <span>이미지 크롭 (Figma Crop)</span>
                  <code className={styles.cropCode}>
                    ×{mosaicPieceScale(selected).toFixed(2)} ·{' '}
                    {mosaicPieceRotation(selected).toFixed(0)}°
                  </code>
                </div>
                <p className={styles.hint}>
                  면 드래그로 사진을 옮기고, 오른쪽 아래 □ 핸들로 크기를, 위 ○
                  핸들로 회전합니다. 이미지 밖은 자동 샘플 배경색으로 채웁니다.
                </p>
                <div className={styles.pointActions}>
                  <button
                    type="button"
                    className={`${styles.btnPrimary} ${imageEditMode ? styles.btnToggleOn : ''}`}
                    onClick={() => {
                      if (imageEditMode) exitImageEdit()
                      else enterImageEdit(selected.id)
                    }}
                  >
                    {imageEditMode ? '크롭 완료' : 'Edit image'}
                  </button>
                </div>
                <label className={styles.field}>
                  맞춤 방식
                  <select
                    value={selected.objectFit === 'contain' ? 'contain' : 'cover'}
                    onChange={(e) => {
                      const objectFit =
                        e.target.value === 'contain' ? 'contain' : 'cover'
                      patchPiece(selected.id, { objectFit })
                      if (objectFit === 'contain' && !selected.padColor) {
                        const item = previewItems[selected.slot]
                        void samplePadColorForPiece(selected.id, item?.image)
                      }
                    }}
                  >
                    <option value="cover">채우기 · Fill (cover)</option>
                    <option value="contain">맞추기 · Fit (contain)</option>
                  </select>
                </label>
                <label className={styles.sliderRow}>
                  <span>
                    크기
                    <strong>{Math.round(mosaicPieceScale(selected) * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min={mosaicScaleMin(selected)}
                    max={MOSAIC_IMAGE_SCALE_MAX}
                    step={0.01}
                    value={mosaicPieceScale(selected)}
                    onPointerDown={() => beginHistoryGesture()}
                    onChange={(e) =>
                      setImageScale(Number(e.target.value), { record: false })
                    }
                  />
                </label>
                <div className={styles.pointActions}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setImageScale(0.5)}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setImageScale(0.75)}
                  >
                    75%
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setImageScale(MOSAIC_COVER_SCALE_MIN)}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setImageScale(1.5)}
                  >
                    150%
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setImageScale(2)}
                  >
                    200%
                  </button>
                </div>
                <label className={styles.sliderRow}>
                  <span>
                    회전
                    <strong>{mosaicPieceRotation(selected).toFixed(0)}°</strong>
                  </span>
                  <input
                    type="range"
                    min={MOSAIC_IMAGE_ROTATION_MIN}
                    max={MOSAIC_IMAGE_ROTATION_MAX}
                    step={1}
                    value={mosaicPieceRotation(selected)}
                    onPointerDown={() => beginHistoryGesture()}
                    onChange={(e) =>
                      setImageRotation(Number(e.target.value), { record: false })
                    }
                  />
                </label>
                <div className={styles.pointActions}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() =>
                      setImageRotation(mosaicPieceRotation(selected) - 15)
                    }
                  >
                    -15°
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => setImageRotation(0)}
                  >
                    0°
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() =>
                      setImageRotation(mosaicPieceRotation(selected) + 15)
                    }
                  >
                    +15°
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() =>
                      setImageRotation(mosaicPieceRotation(selected) + 90)
                    }
                  >
                    +90°
                  </button>
                </div>
                <div className={styles.cropHeader}>
                  <span>이미지 밖 배경색</span>
                  <code className={styles.cropCode}>
                    {selected.padColor?.trim() || '자동 샘플'}
                  </code>
                </div>
                <p className={styles.hint}>
                  크롭 진입 시 표지 가장자리 탐지로 기본값을 잡습니다. 스포이드로
                  화면 아무 색이나 집을 수 있습니다.
                </p>
                <div className={styles.pointActions}>
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={samplingPad}
                    onClick={() => {
                      const item = previewItems[selected.slot]
                      void samplePadColorForPiece(selected.id, item?.image)
                    }}
                  >
                    {samplingPad ? '샘플 중…' : '자동 샘플'}
                  </button>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() =>
                      void pickPadColorWithEyedropper(selected.id)
                    }
                  >
                    스포이드
                  </button>
                </div>
                <label className={styles.field}>
                  배경색
                  <span className={styles.padColorRow}>
                    <input
                      type="color"
                      className={styles.padColorSwatch}
                      value={padColorToHex(selected.padColor)}
                      onChange={(e) =>
                        patchPiece(selected.id, { padColor: e.target.value })
                      }
                      aria-label="배경색 선택"
                    />
                    <input
                      type="text"
                      value={selected.padColor ?? ''}
                      placeholder="자동 샘플 / #hex / rgb()"
                      onChange={(e) =>
                        patchPiece(selected.id, {
                          padColor: e.target.value.trim() || undefined,
                        })
                      }
                    />
                  </span>
                </label>
                <div className={styles.cropHeader}>
                  <span>초점 위치</span>
                  <code className={styles.cropCode}>
                    {selected.objectPosition?.trim() || '50% 50%'}
                  </code>
                </div>
                <div className={styles.pointActions}>
                  {(
                    [
                      ['가운데', 50, 50],
                      ['위', 50, 0],
                      ['아래', 50, 100],
                      ['왼쪽', 0, 50],
                      ['오른쪽', 100, 50],
                    ] as const
                  ).map(([label, x, y]) => (
                    <button
                      key={label}
                      type="button"
                      className={styles.btn}
                      onClick={() => setImagePosition(x, y)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className={styles.sliderRow}>
                  <span>
                    가로 초점
                    <strong>{selectedImagePos.x}%</strong>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.5}
                    value={selectedImagePos.x}
                    onPointerDown={() => beginHistoryGesture()}
                    onChange={(e) =>
                      setImagePosition(Number(e.target.value), selectedImagePos.y, {
                        record: false,
                      })
                    }
                  />
                </label>
                <label className={styles.sliderRow}>
                  <span>
                    세로 초점
                    <strong>{selectedImagePos.y}%</strong>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.5}
                    value={selectedImagePos.y}
                    onPointerDown={() => beginHistoryGesture()}
                    onChange={(e) =>
                      setImagePosition(selectedImagePos.x, Number(e.target.value), {
                        record: false,
                      })
                    }
                  />
                </label>
              </div>
            </>
          ) : (
            <p className={styles.hint}>조각을 선택하세요.</p>
          )}
        </section>

        {pattern.layout === 'columns' ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>열 너비</h2>
          <p className={styles.hint}>
            값은 전체 가로 폭 기준 %입니다. 합이 100%를 넘으면 자동으로 맞춰
            가운데 정렬되며 넘치지 않습니다.
          </p>
          <div className={styles.pointActions}>
            <button
              type="button"
              className={styles.btn}
              onClick={addColumn}
              disabled={pattern.columns.length >= 8}
            >
              열 추가
            </button>
          </div>

          <div className={styles.ratioSummary} aria-live="polite">
            <div>
              사용 폭 <strong>{layout.widthPercent}%</strong>
              <span className={styles.muted}> / 100%</span>
            </div>
            <div>
              열 합계 <strong>{layout.columnsSum}%</strong>
            </div>
            <div>
              간격 <strong>{layout.gapTotal}%</strong>
            </div>
            {layout.clamped ? (
              <div className={styles.warn}>합이 초과되어 화면에 맞게 축소됨</div>
            ) : null}
          </div>

          <label className={styles.sliderRow}>
            <span>
              전체 사용 폭
              <strong>{layout.widthPercent}%</strong>
            </span>
            <input
              type="range"
              min={30}
              max={100}
              step={0.1}
              value={Math.min(100, Math.max(30, layout.widthPercent))}
              onChange={(e) => {
                const targetUsed = Number(e.target.value)
                const targetCols = Math.max(0, targetUsed - layout.gapTotal)
                scaleAllColumnsToSum(targetCols)
              }}
            />
          </label>

          {pattern.columns.map((w, i) => {
            const rendered = layout.columnPercents[i] ?? w
            return (
              <div key={`col-w-${i}`} className={styles.columnRow}>
                <label className={styles.sliderRow}>
                  <span>
                    열 {i + 1}
                    <strong>{Math.round(rendered * 10) / 10}% of width</strong>
                  </span>
                  <input
                    type="range"
                    min={8}
                    max={maxColumnsSum}
                    step={0.1}
                    value={Math.min(maxColumnsSum, Math.max(8, w))}
                    onChange={(e) => setColumnWidth(i, Number(e.target.value))}
                  />
                </label>
                <label className={styles.widthInput}>
                  %
                  <input
                    type="number"
                    min={8}
                    max={70}
                    step={0.1}
                    value={w}
                    onChange={(e) => setColumnWidth(i, Number(e.target.value))}
                  />
                </label>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => removeColumn(i)}
                  disabled={pattern.columns.length <= 2}
                  title={
                    pattern.columns.length <= 2
                      ? '최소 2열 필요'
                      : `열 ${i + 1} 삭제`
                  }
                >
                  삭제
                </button>
              </div>
            )
          })}
          <label className={styles.sliderRow}>
            <span>
              열 간격 (전체 폭 기준)
              <strong>{pattern.columnGap}%</strong>
            </span>
            <input
              type="range"
              min={0}
              max={4}
              step={0.1}
              value={pattern.columnGap}
              onChange={(e) =>
                updatePattern({ ...pattern, columnGap: Number(e.target.value) })
              }
            />
          </label>
        </section>
        ) : (
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>자유 캔버스</h2>
            <p className={styles.hint}>
              열 없이 하나의 캔버스에 조각을 둡니다. clip-path 좌표는 캔버스
              가로·세로 기준 %이며, 캔버스는 화면 가운데에 맞춰집니다.
            </p>
            <div className={styles.ratioSummary} aria-live="polite">
              <div>
                사용 폭 <strong>{layout.widthPercent}%</strong>
                <span className={styles.muted}> / 100%</span>
              </div>
            </div>
            <label className={styles.sliderRow}>
              <span>
                캔버스 폭
                <strong>{layout.widthPercent}%</strong>
              </span>
              <input
                type="range"
                min={30}
                max={100}
                step={0.1}
                value={Math.min(100, Math.max(30, layout.widthPercent))}
                onChange={(e) => {
                  const width =
                    Math.round(
                      Math.min(100, Math.max(30, Number(e.target.value))) * 100,
                    ) / 100
                  updatePattern({ ...pattern, columns: [width] })
                }}
              />
            </label>
            <label className={styles.widthInput}>
              %
              <input
                type="number"
                min={30}
                max={100}
                step={0.1}
                value={layout.widthPercent}
                onChange={(e) => {
                  const width =
                    Math.round(
                      Math.min(100, Math.max(30, Number(e.target.value))) * 100,
                    ) / 100
                  updatePattern({ ...pattern, columns: [width] })
                }}
              />
            </label>
          </section>
        )}
      </div>

      <MosaicRecyclePresets
        presets={presets}
        activeId={activePresetId}
        onApply={applyRecyclePreset}
        onDelete={deleteRecyclePreset}
        disabled={saving || recycling}
      />
    </div>
  )
}
