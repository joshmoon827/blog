'use client'

import {
  layoutNextLine,
  layoutWithLines,
  prepareWithSegments,
  setLocale,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from '@chenglou/pretext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { probeCoverBorder } from '@/lib/coverBorderColor'
import { LabNav } from '../LabChrome'
import styles from './page.module.css'

const BODY_FONT_WIDE = '18px Georgia'
const BODY_LINE_HEIGHT_WIDE = 29
const BODY_FONT_NARROW = '14px Georgia'
const BODY_LINE_HEIGHT_NARROW = 22
const TITLE_FAMILY = '"Toss Product Sans"'

type Rect = {
  x: number
  y: number
  width: number
  height: number
}

type PositionedLine = {
  id: string
  text: string
  x: number
  y: number
  width: number
  column: 'left' | 'right' | 'single'
}

type TitleLine = {
  text: string
  x: number
  y: number
  width: number
}

type ArticleLayout = {
  width: number
  height: number
  isNarrow: boolean
  chromeX: number
  chromeY: number
  recomposeRight: number
  titleFontSize: number
  titleLineHeight: number
  titleLetterSpacing: number
  titleLines: TitleLine[]
  bylineX: number
  bylineY: number
  bodyFontSize: number
  bodyLineHeight: number
  bodyLines: PositionedLine[]
  figure: Rect & { rotation: number }
  figureBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  truncated: boolean
}

type PreparedBundle = {
  bodyWide: PreparedTextWithSegments
  bodyNarrow: PreparedTextWithSegments
  headlineBySize: Map<string, PreparedTextWithSegments>
}

type Region = Rect & {
  column: PositionedLine['column']
  minLineWidth?: number
}

type Props = {
  articleTitle: string
  articleText: string
  articleHref: string
  articleDate: string
  articleCharacterCount: number
  coverImage: string
  minimumCharacterCount: number
  highlightPhrases?: string[]
  embedded?: boolean
}

type FigureAnchor = {
  x: number
  y: number
}

type FigureDrag = {
  pointerId: number
  startX: number
  startY: number
  grabX: number
  grabY: number
  moved: boolean
}

const INITIAL_FIGURE_ANCHOR: FigureAnchor = { x: 0.5, y: 0.34 }
const EMBEDDED_FIGURE_ANCHOR: FigureAnchor = { x: 0.76, y: 0.32 }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function highlightRangesInText(text: string, phrases: string[]) {
  if (!text || !phrases.length) return [] as Array<{ start: number; end: number }>
  const lower = text.toLowerCase()
  const hits: Array<{ start: number; end: number }> = []

  for (const phrase of phrases) {
    const needle = phrase.toLowerCase()
    if (needle.length < 2) continue
    let from = 0
    let found = false
    while (from < lower.length) {
      const at = lower.indexOf(needle, from)
      if (at < 0) break
      hits.push({ start: at, end: at + needle.length })
      from = at + needle.length
      found = true
    }
    if (found) continue

    const trimmed = text.trim()
    const trimmedLower = trimmed.toLowerCase()
    if (trimmedLower.length >= 4 && needle.includes(trimmedLower)) {
      const start = text.indexOf(trimmed)
      if (start >= 0) hits.push({ start, end: start + trimmed.length })
      continue
    }

    const minPart = Math.min(6, needle.length)
    for (let len = Math.min(needle.length, lower.length); len >= minPart; len -= 1) {
      const prefix = needle.slice(0, len)
      if (lower.endsWith(prefix)) {
        hits.push({ start: lower.length - len, end: lower.length })
        break
      }
      const suffix = needle.slice(-len)
      if (lower.startsWith(suffix)) {
        hits.push({ start: 0, end: len })
        break
      }
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: Array<{ start: number; end: number }> = []
  for (const hit of hits) {
    const last = merged[merged.length - 1]
    if (last && hit.start <= last.end) {
      last.end = Math.max(last.end, hit.end)
    } else {
      merged.push({ ...hit })
    }
  }
  return merged
}

function renderHighlightedLine(text: string, phrases: string[]) {
  const ranges = highlightRangesInText(text, phrases)
  if (!ranges.length) return text || '\u00a0'
  const parts: Array<{ text: string; mark: boolean; key: string }> = []
  let cursor = 0
  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push({
        text: text.slice(cursor, range.start),
        mark: false,
        key: `t-${index}-${cursor}`,
      })
    }
    parts.push({
      text: text.slice(range.start, range.end),
      mark: true,
      key: `m-${index}-${range.start}`,
    })
    cursor = range.end
  })
  if (cursor < text.length) {
    parts.push({
      text: text.slice(cursor),
      mark: false,
      key: `t-end-${cursor}`,
    })
  }
  return parts.map((part) =>
    part.mark ? (
      <em key={part.key} className={styles.mark}>
        {part.text}
      </em>
    ) : (
      <span key={part.key}>{part.text}</span>
    ),
  )
}

function cursorKey(cursor: LayoutCursor) {
  return `${cursor.segmentIndex}-${cursor.graphemeIndex}`
}

const ZERO_WIDTH_BREAK = '\u200B'

function graphemesOf(text: string) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
      (part) => part.segment,
    )
  }
  return Array.from(text)
}

/** Pretext only wraps Latin at word boundaries; ZWSP lets every glyph be a break. */
function allowCharacterWrap(text: string) {
  const flattened = text.replace(/\s+/g, ' ').trim()
  const graphemes = graphemesOf(flattened)
  let next = ''
  for (let index = 0; index < graphemes.length; index += 1) {
    const glyph = graphemes[index] ?? ''
    next += glyph
    const following = graphemes[index + 1]
    if (!following) continue
    if (/\s/.test(glyph) || /\s/.test(following) || glyph === ZERO_WIDTH_BREAK) {
      continue
    }
    next += ZERO_WIDTH_BREAK
  }
  return next
}

function getHeadlinePrepared(
  bundle: PreparedBundle,
  headline: string,
  size: number,
  letterSpacing: number,
) {
  const roundedSize = Math.round(size * 10) / 10
  const roundedSpacing = Math.round(letterSpacing * 100) / 100
  const key = `${headline}:${roundedSize}:${roundedSpacing}`
  const cached = bundle.headlineBySize.get(key)
  if (cached) return cached
  const prepared = prepareWithSegments(
    headline,
    `800 ${roundedSize}px ${TITLE_FAMILY}`,
    {
      wordBreak: 'keep-all',
      letterSpacing: roundedSpacing,
    },
  )
  bundle.headlineBySize.set(key, prepared)
  return prepared
}

function fitHeadline(
  bundle: PreparedBundle,
  headline: string,
  width: number,
  maxHeight: number,
  isNarrow: boolean,
  compact: boolean,
) {
  const maxLines = isNarrow ? (compact ? 2 : 3) : 2
  let low = compact ? (isNarrow ? 22 : 36) : isNarrow ? 30 : 54
  let high = Math.min(
    compact ? (isNarrow ? 40 : 86) : isNarrow ? 66 : 148,
    width * (compact ? (isNarrow ? 0.115 : 0.09) : isNarrow ? 0.17 : 0.15),
  )
  let best:
    | {
        size: number
        lineHeight: number
        letterSpacing: number
        result: ReturnType<typeof layoutWithLines>
      }
    | undefined

  for (let iteration = 0; iteration < 10; iteration += 1) {
    const size = (low + high) / 2
    const lineHeight = Math.round(size * 0.88)
    const letterSpacing = -size * 0.055
    const prepared = getHeadlinePrepared(
      bundle,
      headline,
      size,
      letterSpacing,
    )
    const result = layoutWithLines(prepared, width, lineHeight)
    const fits = result.lineCount <= maxLines && result.height <= maxHeight
    if (fits) {
      best = { size, lineHeight, letterSpacing, result }
      low = size
    } else {
      high = size
    }
  }

  if (best) return best

  const size = compact ? (isNarrow ? 22 : 36) : isNarrow ? 30 : 54
  const lineHeight = Math.round(size * 0.88)
  const letterSpacing = -size * 0.055
  const prepared = getHeadlinePrepared(bundle, headline, size, letterSpacing)
  return {
    size,
    lineHeight,
    letterSpacing,
    result: layoutWithLines(prepared, width, lineHeight),
  }
}

const MIN_GLYPH_SLOT = 8

function getLineSlots(
  region: Region,
  lineTop: number,
  lineHeight: number,
  obstacle: Rect,
): Array<{ x: number; width: number }> {
  const regionRight = region.x + region.width
  const obstaclePadding = 8
  const obstacleLeft = obstacle.x - obstaclePadding
  const obstacleRight = obstacle.x + obstacle.width + obstaclePadding
  const intersectsVertically =
    lineTop < obstacle.y + obstacle.height + 2 &&
    lineTop + lineHeight > obstacle.y - 2

  if (
    !intersectsVertically ||
    obstacleRight <= region.x ||
    obstacleLeft >= regionRight
  ) {
    return [{ x: region.x, width: region.width }]
  }

  return [
    {
      x: region.x,
      width: Math.max(0, Math.min(regionRight, obstacleLeft) - region.x),
    },
    {
      x: Math.max(region.x, obstacleRight),
      width: Math.max(0, regionRight - Math.max(region.x, obstacleRight)),
    },
  ].filter((slot) => slot.width >= MIN_GLYPH_SLOT)
}

function layoutRegion(
  prepared: PreparedTextWithSegments,
  start: LayoutCursor,
  region: Region,
  obstacle: Rect,
  lineHeight: number,
): { lines: PositionedLine[]; cursor: LayoutCursor; exhausted: boolean } {
  let cursor = start
  let lineTop = region.y
  const lines: PositionedLine[] = []

  while (lineTop + lineHeight <= region.y + region.height) {
    const slots = getLineSlots(region, lineTop, lineHeight, obstacle)
    if (!slots.length) {
      lineTop += lineHeight
      continue
    }

    let placedOnRow = false
    for (const slot of slots) {
      const line = layoutNextLine(prepared, cursor, slot.width)
      if (!line) {
        const moreText = layoutNextLine(prepared, cursor, 800)
        if (!moreText) return { lines, cursor, exhausted: true }
        continue
      }

      const display = line.text.replaceAll(ZERO_WIDTH_BREAK, '')
      lines.push({
        id: `${region.column}-${cursorKey(line.start)}-${Math.round(slot.x)}`,
        text: display,
        x: Math.round(slot.x),
        y: Math.round(lineTop),
        width: line.width,
        column: region.column,
      })
      cursor = line.end
      placedOnRow = true
    }

    if (!placedOnRow) {
      lineTop += lineHeight
      continue
    }
    lineTop += lineHeight
  }

  return { lines, cursor, exhausted: false }
}

function buildArticleLayout(
  rawWidth: number,
  rawHeight: number,
  headlineText: string,
  figureAnchor: FigureAnchor,
  bundle: PreparedBundle,
  compact: boolean,
): ArticleLayout {
  const width = Math.max(320, Math.round(rawWidth))
  const height = Math.max(compact ? 280 : 680, Math.round(rawHeight))
  const isNarrow = width < 760
  const gutter = Math.round(
    isNarrow
      ? clamp(width * 0.1375, 45, 70)
      : compact
        ? clamp(width * 0.0875, 70, 130)
        : clamp(width * 0.13, 110, 180),
  )
  const chromeY = compact ? 16 : 22
  const chromeHeight = 34
  const bylineGap = compact ? 9 : isNarrow ? 16 : 20
  const bodyAfterByline = compact
    ? isNarrow
      ? 32
      : 36
    : isNarrow
      ? 62
      : 54
  const titleBodyGap = bylineGap + bodyAfterByline
  const titleTop = chromeY + chromeHeight + titleBodyGap
  const titleWidth = width - gutter * 2
  const headline = fitHeadline(
    bundle,
    headlineText,
    titleWidth,
    compact ? 108 : isNarrow ? 210 : 230,
    isNarrow,
    compact,
  )
  const titleLines = headline.result.lines.map((line, index) => ({
    text: line.text,
    x:
      !isNarrow && index === headline.result.lines.length - 1
        ? Math.round(width - gutter - line.width)
        : gutter,
    y: titleTop + index * headline.lineHeight,
    width: line.width,
  }))
  const titleBottom =
    titleTop + headline.result.lines.length * headline.lineHeight
  const bylineY = titleBottom + bylineGap
  const bodyTop = bylineY + bodyAfterByline
  const bottom = height - (compact ? 24 : gutter + 34)

  let figureWidth: number
  let figureHeight: number

  if (isNarrow) {
    figureWidth = Math.round(
      compact
        ? Math.min(180, Math.max(146, (width - gutter * 2) * 0.5))
        : Math.min(238, Math.max(190, (width - gutter * 2) * 0.64)),
    )
    figureHeight = Math.round(figureWidth * (compact ? 0.7 : 0.78))
  } else {
    figureWidth = Math.round(
      compact ? clamp(width * 0.18, 190, 250) : clamp(width * 0.22, 230, 310),
    )
    figureHeight = Math.round(
      compact
        ? clamp(figureWidth * 0.72, 140, 190)
        : clamp(figureWidth * 0.76, 185, 250),
    )
  }

  const minX = gutter
  const maxX = Math.max(minX, width - gutter - figureWidth)
  const minY = bodyTop + 3
  const maxY = Math.max(minY, bottom - figureHeight - 12)
  const figureX = minX + (maxX - minX) * clamp(figureAnchor.x, 0, 1)
  const figureY = minY + (maxY - minY) * clamp(figureAnchor.y, 0, 1)
  const figure: ArticleLayout['figure'] = {
    x: Math.round(figureX),
    y: Math.round(figureY),
    width: Math.round(figureWidth),
    height: Math.round(figureHeight),
    rotation: (clamp(figureAnchor.x, 0, 1) - 0.5) * 12,
  }
  const figureBounds = { minX, maxX, minY, maxY }

  const bodyPrepared = isNarrow ? bundle.bodyNarrow : bundle.bodyWide
  const bodyLineHeight = isNarrow
    ? BODY_LINE_HEIGHT_NARROW
    : BODY_LINE_HEIGHT_WIDE
  const bodyFontSize = isNarrow ? 14 : 18
  let bodyLines: PositionedLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  let exhausted = false

  if (isNarrow) {
    const result = layoutRegion(
      bodyPrepared,
      cursor,
      {
        x: gutter,
        y: bodyTop,
        width: width - gutter * 2,
        height: Math.max(0, bottom - bodyTop),
        column: 'single',
        minLineWidth: MIN_GLYPH_SLOT,
      },
      figure,
      bodyLineHeight,
    )
    bodyLines = result.lines
    cursor = result.cursor
    exhausted = result.exhausted
  } else {
    const centerGap = Math.round(clamp(width * 0.032, 28, 46))
    const columnWidth = Math.round((width - gutter * 2 - centerGap) / 2)
    const regionHeight = Math.max(0, bottom - bodyTop)
    const left = layoutRegion(
      bodyPrepared,
      cursor,
      {
        x: gutter,
        y: bodyTop,
        width: columnWidth,
        height: regionHeight,
        column: 'left',
      },
      figure,
      bodyLineHeight,
    )
    cursor = left.cursor
    const right = left.exhausted
      ? { lines: [] as PositionedLine[], cursor, exhausted: true }
      : layoutRegion(
          bodyPrepared,
          cursor,
          {
            x: gutter + columnWidth + centerGap,
            y: bodyTop,
            width: columnWidth,
            height: regionHeight,
            column: 'right',
          },
          figure,
          bodyLineHeight,
        )
    cursor = right.cursor
    exhausted = right.exhausted
    bodyLines = [...left.lines, ...right.lines]
  }

  const hasRemainingText =
    !exhausted &&
    layoutNextLine(
      bodyPrepared,
      cursor,
      Math.max(140, width - gutter * 2),
    ) !== null

  return {
    width,
    height,
    isNarrow,
    chromeX: gutter,
    chromeY,
    recomposeRight: gutter,
    titleFontSize: headline.size,
    titleLineHeight: headline.lineHeight,
    titleLetterSpacing: headline.letterSpacing,
    titleLines,
    bylineX: gutter,
    bylineY,
    bodyFontSize,
    bodyLineHeight,
    bodyLines,
    figure,
    figureBounds,
    truncated: hasRemainingText,
  }
}

export default function PretextArticleLab({
  articleTitle,
  articleText,
  articleHref,
  articleDate,
  articleCharacterCount,
  coverImage,
  minimumCharacterCount,
  highlightPhrases = [],
  embedded = false,
}: Props) {
  const router = useRouter()
  const stageRef = useRef<HTMLElement>(null)
  const layoutRef = useRef<ArticleLayout | null>(null)
  const dragRef = useRef<FigureDrag | null>(null)
  const anchorFrameRef = useRef(0)
  const pendingAnchorRef = useRef<FigureAnchor | null>(null)
  const suppressClickRef = useRef(false)
  const suppressClickTimerRef = useRef<number | null>(null)
  const initialFigureAnchor = embedded
    ? EMBEDDED_FIGURE_ANCHOR
    : INITIAL_FIGURE_ANCHOR
  const [figureAnchor, setFigureAnchor] =
    useState<FigureAnchor>(initialFigureAnchor)
  const [dragging, setDragging] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [prepared, setPrepared] = useState<PreparedBundle | null>(null)
  const [markColor, setMarkColor] = useState('rgb(189, 255, 91)')

  useEffect(() => {
    let active = true
    void probeCoverBorder(coverImage).then((probe) => {
      if (!active || !probe?.padColor) return
      setMarkColor(probe.padColor)
    })
    return () => {
      active = false
    }
  }, [coverImage])

  useEffect(() => {
    let active = true
    const wrapOptions = {
      whiteSpace: 'normal' as const,
      wordBreak: 'normal' as const,
    }
    const commitPrepared = () => {
      if (!active) return
      setLocale('ko')
      const wrapped = allowCharacterWrap(articleText)
      setPrepared({
        bodyWide: prepareWithSegments(wrapped, BODY_FONT_WIDE, wrapOptions),
        bodyNarrow: prepareWithSegments(wrapped, BODY_FONT_NARROW, wrapOptions),
        headlineBySize: new Map(),
      })
    }
    commitPrepared()
    void Promise.all([
      document.fonts.ready,
      document.fonts.load(BODY_FONT_WIDE),
      document.fonts.load(`800 72px ${TITLE_FAMILY}`),
    ]).then(commitPrepared)
    return () => {
      active = false
    }
  }, [articleText])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const commit = (width: number, height: number) => {
      const next = {
        width: Math.round(width),
        height: Math.round(height),
      }
      setStageSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      )
    }
    const measure = () => {
      const rect = stage.getBoundingClientRect()
      commit(rect.width, rect.height)
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      commit(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(stage)
    measure()
    return () => {
      observer.disconnect()
    }
  }, [])

  const layout = useMemo(() => {
    if (!prepared || stageSize.width <= 0 || stageSize.height <= 0) return null
    return buildArticleLayout(
      stageSize.width,
      stageSize.height,
      articleTitle,
      figureAnchor,
      prepared,
      embedded,
    )
  }, [articleTitle, embedded, figureAnchor, prepared, stageSize])

  useLayoutEffect(() => {
    layoutRef.current = layout
  }, [layout])

  useEffect(
    () => () => {
      cancelAnimationFrame(anchorFrameRef.current)
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
      }
    },
    [],
  )

  const lineStyleBase = useMemo<CSSProperties>(
    () =>
      layout
        ? {
            font: `${layout.bodyFontSize}px Georgia`,
            fontSize: layout.bodyFontSize,
            lineHeight: `${layout.bodyLineHeight}px`,
          }
        : {},
    [layout],
  )

  const queueFigureAnchor = (next: FigureAnchor) => {
    pendingAnchorRef.current = next
    if (anchorFrameRef.current) return
    anchorFrameRef.current = requestAnimationFrame(() => {
      anchorFrameRef.current = 0
      const pending = pendingAnchorRef.current
      pendingAnchorRef.current = null
      if (pending) setFigureAnchor(pending)
    })
  }

  const handleFigurePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const currentLayout = layoutRef.current
    const stage = stageRef.current
    if (!event.isPrimary || event.button !== 0 || !currentLayout || !stage) {
      return
    }
    const stageRect = stage.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      grabX:
        event.clientX -
        stageRect.left -
        stage.clientLeft -
        currentLayout.figure.x,
      grabY:
        event.clientY -
        stageRect.top -
        stage.clientTop -
        currentLayout.figure.y,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleFigurePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const drag = dragRef.current
    const currentLayout = layoutRef.current
    const stage = stageRef.current
    if (
      !drag ||
      drag.pointerId !== event.pointerId ||
      !currentLayout ||
      !stage
    ) {
      return
    }

    const distance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY,
    )
    if (!drag.moved && distance < 6) return
    if (!drag.moved) {
      drag.moved = true
      setDragging(true)
    }
    event.preventDefault()

    const stageRect = stage.getBoundingClientRect()
    const { minX, maxX, minY, maxY } = currentLayout.figureBounds
    const nextX =
      event.clientX - stageRect.left - stage.clientLeft - drag.grabX
    const nextY =
      event.clientY - stageRect.top - stage.clientTop - drag.grabY
    queueFigureAnchor({
      x: maxX === minX ? 0 : clamp((nextX - minX) / (maxX - minX), 0, 1),
      y: maxY === minY ? 0 : clamp((nextY - minY) / (maxY - minY), 0, 1),
    })
  }

  const finishFigurePointer = (
    event: ReactPointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.moved && !cancelled) {
      suppressClickRef.current = true
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current)
      }
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false
        suppressClickTimerRef.current = null
      }, 350)
    }
    dragRef.current = null
    setDragging(false)
  }

  const handleFigureClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => {
    if (suppressClickRef.current) {
      event.preventDefault()
      suppressClickRef.current = false
      return
    }
    router.push(articleHref)
  }

  const resetFigure = () => setFigureAnchor(initialFigureAnchor)
  const readMinutes = Math.max(1, Math.ceil(articleCharacterCount / 500))
  const characterLabel = articleCharacterCount.toLocaleString('ko-KR')

  return (
    <div
      className={`${styles.page}${embedded ? ` ${styles.embeddedPage}` : ''}`}
    >
      {!embedded ? (
        <header className={styles.pageHeader}>
          <p className={styles.kicker}>test-ui · pretext</p>
          <h1>Flowing Article</h1>
          <p className={styles.lede}>
            게시된 글 중 본문이{' '}
            {minimumCharacterCount.toLocaleString('ko-KR')}자 이상인{' '}
            <strong>{articleTitle}</strong>을 가져왔습니다. 표지를 드래그하면
            Pretext가 실제 본문을 새 위치 주변으로 다시 흐르게 합니다.
          </p>
          <p className={styles.meta}>
            <Link href="/">← Articles</Link>
            <span aria-hidden>·</span>
            <a
              href="https://github.com/chenglou/pretext"
              target="_blank"
              rel="noreferrer"
            >
              Pretext source ↗
            </a>
          </p>
        </header>
      ) : null}

      {!embedded ? <LabNav currentHref="/test-ui/pretext" /> : null}

      <section
        className={embedded ? styles.embeddedBlock : styles.demoBlock}
        aria-label={
          embedded ? 'Pretext home article pattern' : 'Pretext article pattern'
        }
      >
        <article
          ref={stageRef}
          className={`${styles.articleStage}${embedded ? ` ${styles.articleStageEmbedded}` : ''}`}
          data-dragging={dragging ? 'true' : undefined}
          aria-labelledby="pretext-article-title"
          style={{ ['--pretext-mark' as string]: markColor }}
        >
          <h2 id="pretext-article-title" className={styles.srOnly}>
            {articleTitle}
          </h2>
          <p className={styles.srOnly}>{articleText}</p>

          <div
            className={styles.stageChrome}
            aria-hidden
            style={
              layout
                ? { top: layout.chromeY, left: layout.chromeX }
                : undefined
            }
          >
            <span>JOSH!OG JOURNAL</span>
            <span>
              {articleDate || 'ARCHIVE'} · {characterLabel} CHARACTERS
            </span>
          </div>

          <button
            type="button"
            className={styles.recompose}
            onClick={resetFigure}
            style={
              layout
                ? { top: layout.chromeY, right: layout.recomposeRight }
                : undefined
            }
          >
            Reset cover
            <span>↺</span>
          </button>

          {layout ? (
            <>
              {layout.titleLines.map((line, index) => (
                <span
                  key={`title-${line.text}-${index}`}
                  className={styles.titleLine}
                  aria-hidden
                  style={{
                    left: line.x,
                    top: line.y,
                    width: Math.ceil(line.width + 2),
                    fontSize: layout.titleFontSize,
                    lineHeight: `${layout.titleLineHeight}px`,
                    letterSpacing: layout.titleLetterSpacing,
                  }}
                >
                  {line.text}
                </span>
              ))}

              <p
                className={styles.byline}
                style={{ left: layout.bylineX, top: layout.bylineY }}
              >
                JOSH!OG ARCHIVE — {articleDate || 'UNDATED'}
                <span>{readMinutes} MIN READ</span>
              </p>

              <div aria-hidden>
                {layout.bodyLines.map((line, index) => (
                  <span
                    key={line.id}
                    className={styles.bodyLine}
                    data-column={line.column}
                    style={{
                      ...lineStyleBase,
                      left: line.x,
                      top: line.y,
                      width: Math.ceil(line.width + 2),
                      animationDelay: `${Math.min(index * 8, 280)}ms`,
                    }}
                  >
                    {renderHighlightedLine(line.text, highlightPhrases)}
                  </span>
                ))}
              </div>

              <button
                type="button"
                className={styles.figure}
                data-dragging={dragging ? 'true' : undefined}
                onPointerDown={handleFigurePointerDown}
                onPointerMove={handleFigurePointerMove}
                onPointerUp={finishFigurePointer}
                onPointerCancel={(event) => finishFigurePointer(event, true)}
                onLostPointerCapture={(event) => {
                  if (dragRef.current?.pointerId !== event.pointerId) return
                  dragRef.current = null
                  setDragging(false)
                }}
                onClick={handleFigureClick}
                aria-label={`${articleTitle} 표지. 드래그해 텍스트를 재배치하거나 눌러 아티클 열기`}
                style={{
                  left: layout.figure.x,
                  top: layout.figure.y,
                  width: layout.figure.width,
                  height: layout.figure.height,
                  transform: `rotate(${layout.figure.rotation}deg)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="" draggable={false} />
                <span className={styles.figureIndex}>↗</span>
                <span className={styles.figureCaption}>
                  {articleTitle}
                  <small>DRAG TO REFLOW · TAP TO READ</small>
                </span>
              </button>

              <p className={styles.stats}>
                PRETEXT · {layout.bodyLines.length} VISIBLE LINES ·{' '}
                COVER {Math.round(figureAnchor.x * 100)}:
                {Math.round(figureAnchor.y * 100)}
              </p>
            </>
          ) : (
            <div className={styles.loading} aria-live="polite">
              Preparing text geometry…
            </div>
          )}
        </article>
        {!embedded ? (
          <p className={styles.note}>
            표지를 <strong>드래그</strong>하면 실제 아티클 본문이 매 프레임 다시
            배치됩니다. 움직이지 않고 탭하거나 클릭하면 해당 아티클로 이동합니다.
          </p>
        ) : null}
      </section>
    </div>
  )
}
