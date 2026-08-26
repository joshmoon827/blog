'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/components/LocalizedText'
import HomeCategoryArticleList, {
  type HomeCategoryArticle,
} from '@/components/HomeCategoryArticleList'
import styles from './HomeCategorySlides.module.css'

export type HomeCategorySlide = {
  slug: string
  title: string
  title_en?: string
  coverImage: string
  articles: HomeCategoryArticle[]
}

type Props = {
  slides: HomeCategorySlide[]
}

export default function HomeCategorySlides({ slides }: Props) {
  const language = useLanguage()
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const onScroll = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const w = el.clientWidth
    if (w <= 0) return
    const next = Math.round(el.scrollLeft / w)
    setIndex(Math.min(slides.length - 1, Math.max(0, next)))
  }, [slides.length])

  const goTo = useCallback((i: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }, [])

  const syncHeight = useCallback((active: number) => {
    const el = trackRef.current
    if (!el) return
    const slide = el.children[active] as HTMLElement | undefined
    if (!slide) return
    el.style.height = `${slide.scrollHeight}px`
  }, [])

  useEffect(() => {
    syncHeight(index)
  }, [index, slides, syncHeight])

  useEffect(() => {
    const onResize = () => {
      const el = trackRef.current
      if (el) el.scrollLeft = index * el.clientWidth
      syncHeight(index)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [index, syncHeight])

  if (!slides.length) return null

  return (
    <section className={styles.wrap} aria-label="카테고리별 아티클">
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={onScroll}
        tabIndex={0}
      >
        {slides.map((slide) => {
          const title =
            language === 'en' && slide.title_en ? slide.title_en : slide.title
          const preview = slide.articles.slice(0, 4)
          return (
            <article
              key={slide.slug}
              className={styles.slide}
              aria-label={title}
            >
              <div className={styles.inner}>
                <header className={styles.heading}>
                  <div className={styles.titleRow}>
                    {slide.coverImage ? (
                      <span className={styles.mark}>
                        <Image
                          src={slide.coverImage}
                          alt=""
                          fill
                          sizes="64px"
                          className={styles.markImg}
                        />
                      </span>
                    ) : null}
                    <div className={styles.titleStack}>
                      <p className={styles.eyebrow}>
                        <Link href="/category">Category</Link>
                        <span aria-hidden> / </span>
                        <span>{slide.slug}</span>
                      </p>
                      <h2 className={styles.headingTitle}>{title}</h2>
                    </div>
                  </div>
                </header>
                <HomeCategoryArticleList articles={preview} />
                <Link href={`/category/${slide.slug}`} className={styles.go}>
                  {`${title}카테고리로 이동하기`}
                </Link>
              </div>
            </article>
          )
        })}
      </div>
      {slides.length > 1 ? (
        <div className={styles.dots} role="tablist" aria-label="카테고리">
          {slides.map((slide, i) => {
            const title =
              language === 'en' && slide.title_en ? slide.title_en : slide.title
            return (
              <button
                key={slide.slug}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={title}
                className={styles.dot}
                data-active={i === index ? '1' : undefined}
                onClick={() => goTo(i)}
              />
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
