'use client'

import dynamic from 'next/dynamic'
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import HomeCoverHeaderOverlay from '@/components/HomeCoverHeaderOverlay'
import {
  HOME_SERIES_EXPERIMENT_OPTIONS,
  type WebglHomeSeriesMode,
} from '@/lib/homeSeriesMode'
import { mosaicHeightCss } from '@/lib/mosaicPattern'
import type { SeriesCardItem } from '@/lib/seriesItems'
import type { WebglPointerState } from './SeriesWebglStage'
import styles from './category-webgl.module.css'

const SeriesWebglStage = dynamic(() => import('./SeriesWebglStage'), {
  ssr: false,
  loading: () => <div className={styles.fallback} aria-hidden />,
})

type Props = {
  items: SeriesCardItem[]
  mode: WebglHomeSeriesMode
  className?: string
  caption?: boolean
}

export default function SeriesWebglBanner({
  items,
  mode,
  className,
  caption = true,
}: Props) {
  const [hoverTitle, setHoverTitle] = useState<string | null>(null)
  const pointerState = useRef<WebglPointerState>({
    inside: false,
    hasPosition: false,
    uvX: 0.5,
    uvY: 0.5,
  })
  const meta = HOME_SERIES_EXPERIMENT_OPTIONS.find((opt) => opt.id === mode)
  const height = mosaicHeightCss('506 / 184')
  const rememberPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    pointerState.current.inside = true
    pointerState.current.hasPosition = true
    pointerState.current.uvX = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1)),
    )
    pointerState.current.uvY = Math.min(
      1,
      Math.max(
        0,
        1 - (event.clientY - rect.top) / Math.max(rect.height, 1),
      ),
    )
  }

  return (
    <HomeCoverHeaderOverlay
      className={className}
      probeSrc={items[0]?.image}
      fallbackTone="dark"
    >
      <section
        className={styles.stage}
        style={{ height }}
        aria-label={meta?.label ?? 'Category'}
        onPointerEnter={rememberPointer}
        onPointerMove={rememberPointer}
        onPointerLeave={() => {
          pointerState.current.inside = false
          setHoverTitle(null)
        }}
      >
        <SeriesWebglStage
          items={items}
          mode={mode}
          onHoverTitle={setHoverTitle}
          pointerState={pointerState}
        />
        {caption ? (
          <div className={styles.caption}>
            <p className={styles.captionKicker}>{meta?.label ?? mode}</p>
            <p className={styles.captionTitle}>
              {hoverTitle ?? '마우스를 움직이거나 조각을 클릭하세요'}
            </p>
          </div>
        ) : null}
      </section>
    </HomeCoverHeaderOverlay>
  )
}
