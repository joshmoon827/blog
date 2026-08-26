'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import {
  HOME_SERIES_INTERACTIVE_OPTIONS,
  type GsapHomeSeriesMode,
  type InteractiveHomeSeriesMode,
} from '@/lib/homeSeriesMode'
import { mosaicHeightCss } from '@/lib/mosaicPattern'
import HomeCoverHeaderOverlay from '@/components/HomeCoverHeaderOverlay'
import type { PretextFeatureArticle } from '@/lib/pretextArticle.server'
import type { SeriesCardItem } from '@/lib/seriesItems'
import styles from './HomeInteractiveBanner.module.css'

const GsapHomeStage = dynamic(
  () =>
    import('@/app/test-ui/gsap/GsapTypeGallery').then(
      (module) => module.GsapHomeStage,
    ),
  {
    ssr: false,
    loading: () => <div className={styles.fallback} aria-hidden />,
  },
)

const P5Stage = dynamic(() => import('@/app/test-ui/p5/P5Stage'), {
  ssr: false,
  loading: () => <div className={styles.fallback} aria-hidden />,
})

const PretextArticleLab = dynamic(
  () => import('@/app/test-ui/pretext/PretextArticleLab'),
  {
    ssr: false,
    loading: () => <div className={styles.fallbackLight} aria-hidden />,
  },
)

type Props = {
  items: SeriesCardItem[]
  mode: InteractiveHomeSeriesMode
  pretextArticle?: PretextFeatureArticle | null
  className?: string
}

function isGsapMode(mode: InteractiveHomeSeriesMode): mode is GsapHomeSeriesMode {
  return mode.startsWith('gsap-')
}

function gestureFor(mode: InteractiveHomeSeriesMode) {
  if (mode === 'gsap-columns') return 'MOVE · CLICK'
  if (mode === 'gsap-scatter' || mode === 'gsap-wave' || mode === 'gsap-slices')
    return 'MOVE'
  if (mode === 'gsap-flip') return 'CLICK'
  if (mode === 'p5-particles') return 'MOVE'
  return 'DRAG · TAP'
}

export default function HomeInteractiveBanner({
  items,
  mode,
  pretextArticle,
  className,
}: Props) {
  const [hoverTitle, setHoverTitle] = useState<string | null>(null)
  const meta = HOME_SERIES_INTERACTIVE_OPTIONS.find(
    (option) => option.id === mode,
  )
  const mosaicHeight = mosaicHeightCss('506 / 184')
  const pretextReady = mode === 'pretext' && pretextArticle
  const height = pretextReady
    ? `max(540px, calc((${mosaicHeight}) * 1.8))`
    : `max(300px, ${mosaicHeight})`

  const probeSrc = pretextReady ? null : items[0]?.image
  const fallbackTone = pretextReady ? 'light' : 'dark'

  return (
    <HomeCoverHeaderOverlay
      className={className}
      probeSrc={probeSrc}
      fallbackTone={fallbackTone}
      matchHtmlTheme={pretextReady}
    >
      <section
        className={`${styles.stage}${pretextReady ? ` ${styles.stagePretext}` : ''}`}
        style={{ height }}
        data-mode={mode}
        aria-label={meta?.label ?? 'Interactive home pattern'}
      >
        {pretextReady ? (
          <PretextArticleLab {...pretextArticle} embedded />
        ) : isGsapMode(mode) ? (
          <GsapHomeStage mode={mode} />
        ) : (
          <P5Stage items={items} onHoverTitle={setHoverTitle} />
        )}

        {!pretextReady && !isGsapMode(mode) ? (
          <>
            <div className={styles.caption}>
              <p className={styles.captionKicker}>{meta?.label ?? mode}</p>
              <p className={styles.captionTitle}>
                {hoverTitle ?? meta?.hint ?? '커서를 움직여 보세요'}
              </p>
            </div>
            <span className={styles.gesture} aria-hidden>
              {gestureFor(mode)}
            </span>
          </>
        ) : null}
      </section>
    </HomeCoverHeaderOverlay>
  )
}
