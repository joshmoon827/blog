'use client'

import Link from 'next/link'
import { useState } from 'react'
import SeriesWebglBanner from '@/components/category-webgl/SeriesWebglBanner'
import {
  HOME_SERIES_EXPERIMENT_OPTIONS,
  type WebglHomeSeriesMode,
} from '@/lib/homeSeriesMode'
import type { SeriesCardItem } from '@/lib/seriesItems'
import { LabNav } from '../LabChrome'
import styles from './page.module.css'

export default function WebglMosaicLab({ items }: { items: SeriesCardItem[] }) {
  const [mode, setMode] = useState<WebglHomeSeriesMode>('liquid')
  const active =
    HOME_SERIES_EXPERIMENT_OPTIONS.find((item) => item.id === mode) ??
    HOME_SERIES_EXPERIMENT_OPTIONS[0]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · webgl</p>
        <h1 className={styles.pageTitle}>Interactive Mosaic</h1>
        <p className={styles.lede}>
          홈 상단 모자이크와 <strong>같은 높이</strong>의 캔버스입니다. 설정에서
          실험 패턴으로 고르면 홈에도 그대로 올라갑니다.
        </p>
        <p className={styles.meta}>
          <Link href="/">← Articles</Link>
          <span aria-hidden>·</span>
          <Link href="/settings">설정</Link>
        </p>
      </header>

      <LabNav currentHref="/test-ui/webgl" />

      <nav className={styles.toc} aria-label="WebGL mosaic scenes">
        {HOME_SERIES_EXPERIMENT_OPTIONS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.tocLink} ${item.id === mode ? styles.tocActive : ''}`}
            onClick={() => setMode(item.id)}
            aria-pressed={item.id === mode}
          >
            <span className={styles.tocIndex}>{String(i + 1).padStart(2, '0')}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <section className={styles.stageBlock} aria-label={active.label}>
        <SeriesWebglBanner items={items} mode={mode} />
        <p className={styles.stageNote}>{active.hint}</p>
      </section>
    </div>
  )
}
