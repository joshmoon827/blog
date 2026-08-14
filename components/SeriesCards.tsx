'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import MosaicBitmapImage from '@/components/MosaicBitmapImage'
import { LocalizedArticleCount } from '@/components/LocalizedText'
import type { SeriesCardItem } from '@/lib/seriesItems'
import {
  DEFAULT_SERIES_LIST_LAYOUT,
  type SeriesListLayout,
} from '@/lib/series'
import {
  DEFAULT_MOSAIC_PATTERN,
  mosaicHeightCss,
  mosaicShardShellStyle,
  polygonCss,
  resolveMosaicLayout,
  type MosaicPattern,
  type MosaicPiece,
} from '@/lib/mosaicPattern'
import styles from './SeriesCards.module.css'

type Props = {
  items: SeriesCardItem[]
  /** `grid` = /series; `mosaic` | `slide` = home banner patterns */
  variant?: 'grid' | 'mosaic' | 'slide'
  className?: string
  ariaLabel?: string
  /** Optional override; defaults to built-in pattern when omitted. */
  pattern?: MosaicPattern
  /** /series grid columns + featured-first (ignored for mosaic/slide). */
  listLayout?: SeriesListLayout
}

function SeriesCard({ item }: { item: SeriesCardItem }) {
  return (
    <Link href={item.href} className={styles.card}>
      <div className={styles.imageWrap}>
        <Image
          src={item.image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 1200px"
          className={styles.image}
        />
      </div>
      <div className={styles.scrim} />
      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <div className={styles.label}>
            <span className={styles.labelIcon} aria-hidden="true" />
            <span>Category folder</span>
          </div>
          <h2>{item.title}</h2>
        </div>
        <span className={styles.count}>
          <LocalizedArticleCount count={item.count} />
        </span>
      </div>
    </Link>
  )
}

function MosaicShard({
  item,
  piece,
  forceOverlay,
}: {
  item: SeriesCardItem
  piece: MosaicPiece
  forceOverlay?: boolean
}) {
  const overlay = forceOverlay || piece.overlay
  return (
    <Link
      href={item.href}
      className={`${styles.mosaicPiece} ${overlay ? styles.mosaicOverlay : ''}`.trim()}
      aria-label={item.title}
      style={{
        clipPath: polygonCss(piece.points),
        zIndex: piece.zIndex,
        ...mosaicShardShellStyle(piece),
      }}
    >
      <MosaicBitmapImage
        src={item.image}
        piece={piece}
        hoverScale={1.04}
      />
    </Link>
  )
}

function sortPieces(pieces: MosaicPiece[]) {
  return pieces.slice().sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
}

function SeriesMosaic({
  items,
  className,
  ariaLabel,
  pattern,
}: Required<Pick<Props, 'items' | 'className' | 'ariaLabel'>> & {
  pattern: MosaicPattern
}) {
  const layout = resolveMosaicLayout(pattern)
  const free = pattern.layout === 'free'
  const width =
    layout.widthPercent >= 99.95 ? '100%' : `${layout.widthPercent}%`
  const height = mosaicHeightCss(pattern.aspectRatio)

  if (free) {
    return (
      <section
        className={`${styles.layoutMosaic} ${className}`.trim()}
        aria-label={ariaLabel}
      >
        <div
          className={styles.mosaic}
          style={{
            width,
            height,
            maxWidth: '100%',
            marginInline: 'auto',
            gridTemplateColumns: '1fr',
            columnGap: 0,
          }}
        >
          <div className={styles.mosaicComposite}>
            {sortPieces(pattern.pieces).map((piece) => {
              const item = items[piece.slot]
              if (!item) return null
              return (
                <MosaicShard
                  key={piece.id}
                  item={item}
                  piece={piece}
                  forceOverlay
                />
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  const columns = pattern.columns
  const byColumn = new Map<number, MosaicPiece[]>()
  for (const piece of pattern.pieces) {
    const list = byColumn.get(piece.column) ?? []
    list.push(piece)
    byColumn.set(piece.column, list)
  }

  return (
    <section
      className={`${styles.layoutMosaic} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div
        className={styles.mosaic}
        style={{
          width,
          height,
          maxWidth: '100%',
          marginInline: 'auto',
          gridTemplateColumns: layout.gridTemplateColumns,
          columnGap: `${layout.columnGapPercent}%`,
        }}
      >
        {columns.map((_, colIdx) => {
          const pieces = sortPieces(byColumn.get(colIdx) ?? [])
          const hasOverlay = pieces.some((p) => p.overlay)
          if (!pieces.length) {
            return <div key={`col-${colIdx}`} className={styles.mosaicComposite} />
          }
          if (hasOverlay || pieces.length > 1) {
            return (
              <div key={`col-${colIdx}`} className={styles.mosaicComposite}>
                {pieces.map((piece) => {
                  const item = items[piece.slot]
                  if (!item) return null
                  return <MosaicShard key={piece.id} item={item} piece={piece} />
                })}
              </div>
            )
          }
          const piece = pieces[0]
          const item = items[piece.slot]
          if (!item) return <div key={`col-${colIdx}`} />
          return <MosaicShard key={piece.id} item={item} piece={piece} />
        })}
      </div>
    </section>
  )
}

function SeriesSlide({
  items,
  className,
  ariaLabel,
}: {
  items: SeriesCardItem[]
  className: string
  ariaLabel: string
}) {
  return (
    <section
      className={`${styles.layoutSlide} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div className={styles.slideTrack}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={styles.slideCard}
            aria-label={`${item.title} 카테고리`}
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.slideImg}
                src={item.image}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className={styles.slideFallback} aria-hidden />
            )}
            <div className={styles.slideShade} aria-hidden />
            <div className={styles.slideMeta}>
              <span className={styles.slideTitle}>{item.title}</span>
              <span className={styles.slideCount}>
                <LocalizedArticleCount count={item.count} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function SeriesCards({
  items,
  variant = 'grid',
  className,
  ariaLabel = 'Category',
  pattern = DEFAULT_MOSAIC_PATTERN,
  listLayout = DEFAULT_SERIES_LIST_LAYOUT,
}: Props) {
  if (!items.length) return null

  if (variant === 'mosaic') {
    const need = Math.max(
      ...pattern.pieces.map((p) => p.slot + 1),
      pattern.layout === 'free' ? 1 : pattern.columns.length,
      1,
    )
    return (
      <SeriesMosaic
        items={items.slice(0, need)}
        className={className ?? ''}
        ariaLabel={ariaLabel}
        pattern={pattern}
      />
    )
  }

  if (variant === 'slide') {
    return (
      <SeriesSlide
        items={items}
        className={className ?? ''}
        ariaLabel={ariaLabel}
      />
    )
  }

  const cols = listLayout.columns
  const featured = listLayout.featuredFirst
  return (
    <section
      className={`${styles.layoutGrid} ${className ?? ''}`.trim()}
      aria-label={ariaLabel}
      data-columns={cols}
      data-featured={featured ? '1' : '0'}
      style={
        {
          '--series-cols': String(cols),
        } as CSSProperties
      }
    >
      <div className={styles.list}>
        {items.map((item) => (
          <SeriesCard key={item.href} item={item} />
        ))}
      </div>
    </section>
  )
}
