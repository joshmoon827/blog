'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { applyCylinderProjection } from './cylinder'
import { Doodle } from './doodles'
import { SECTIONS, type SessionCard, type SessionSection } from './sessions'
import styles from './page.module.css'

type View = 'strip' | 'spread'

export default function SimplicityGallery() {
  const [view, setView] = useState<View>('strip')
  const [muted, setMuted] = useState(true)
  const [activeId, setActiveId] = useState(SECTIONS[1].id)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef<Record<string, HTMLElement | null>>({})
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0]

  useEffect(() => {
    document.body.setAttribute('data-test-ui', 'simplicity')
    return () => document.body.removeAttribute('data-test-ui')
  }, [])

  const syncActiveFromScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    if (view === 'spread') {
      const nodes = [...scroller.querySelectorAll<HTMLElement>('[data-spread]')]
      const probe = scroller.scrollTop + scroller.clientHeight * 0.28
      let best = SECTIONS[0].id
      for (const node of nodes) {
        if (node.offsetTop <= probe) best = node.dataset.spread || best
      }
      setActiveId((prev) => (prev === best ? prev : best))
      return
    }

    const center = scroller.scrollLeft + scroller.clientWidth * 0.4
    let best = SECTIONS[0].id
    let bestDist = Number.POSITIVE_INFINITY
    for (const section of SECTIONS) {
      const el = markerRefs.current[section.id]
      if (!el) continue
      const mid = el.offsetLeft + el.offsetWidth / 2
      const dist = Math.abs(mid - center)
      if (dist < bestDist) {
        bestDist = dist
        best = section.id
      }
    }
    setActiveId((prev) => (prev === best ? prev : best))
  }, [view])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    syncActiveFromScroll()
    scroller.addEventListener('scroll', syncActiveFromScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', syncActiveFromScroll)
  }, [syncActiveFromScroll, view])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || view !== 'strip') return

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return
      event.preventDefault()
      scroller.scrollLeft += event.deltaY
    }

    scroller.addEventListener('wheel', onWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', onWheel)
  }, [view])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || view !== 'spread') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const tick = () => {
      applyCylinderProjection(scroller)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [view])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const id = activeIdRef.current

    if (view === 'spread') {
      const section = scroller.querySelector<HTMLElement>(`[data-spread="${id}"]`)
      scroller.scrollTo({ top: section ? Math.max(0, section.offsetTop - 48) : 0 })
      return
    }

    const marker = markerRefs.current[id]
    if (!marker) return
    const left = marker.offsetLeft - scroller.clientWidth * 0.16
    scroller.scrollTo({ left: Math.max(0, left) })
  }, [view])

  return (
    <div
      className={styles.stage}
      data-view={view}
      style={{
        ['--accent' as string]: active.accent,
        ['--blob' as string]: active.blob,
      }}
    >
      <div className={styles.blobs} aria-hidden>
        <span className={styles.blobA} />
        <span className={styles.blobB} />
      </div>
      <div className={styles.grain} aria-hidden />

      <Link href="/" className={styles.back}>
        ← Articles
      </Link>

      {view === 'strip' && (
        <header className={styles.floatTitle}>
          <p className={styles.kicker}>
            {active.id === 'unknown' ? (
              <>
                미지의 <span className={styles.qbox}>?</span> 영역에 도전할 때
              </>
            ) : active.id === 'knots' ? (
              <>
                꼬인 <span className={styles.knotMark} aria-hidden /> 매듭 풀기
              </>
            ) : (
              active.kicker
            )}
          </p>
          <h1>{active.title}</h1>
        </header>
      )}

      <div className={styles.scroller} ref={scrollerRef}>
        {view === 'strip' ? (
          <div className={styles.track}>
            {SECTIONS.map((section) => (
              <SectionStrip
                key={section.id}
                section={section}
                markerRef={(el) => {
                  markerRefs.current[section.id] = el
                }}
              />
            ))}
          </div>
        ) : (
          <div className={styles.spread}>
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                className={styles.spreadSection}
                data-spread={section.id}
                style={{ ['--accent' as string]: section.accent }}
              >
                <header className={styles.spreadHead}>
                  <p className={styles.kicker}>{section.kicker}</p>
                  <h2>{section.title}</h2>
                </header>
                <div className={styles.spreadGrid}>
                  {section.cards
                    .filter((card) => card.kind !== 'intro')
                    .map((card) => (
                      <SessionTile
                        key={card.id}
                        card={card}
                        tint={section.cardTint}
                        cylinder
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className={styles.dock} role="toolbar" aria-label="Gallery view">
        <button
          type="button"
          className={view === 'spread' ? styles.dockGhost : styles.dockPrimary}
          onClick={() => setView('spread')}
          aria-pressed={view === 'spread'}
        >
          <ExpandIcon />
          펼쳐보기
        </button>
        <button
          type="button"
          className={view === 'strip' ? styles.dockGhost : styles.dockPrimary}
          onClick={() => setView('strip')}
          aria-pressed={view === 'strip'}
        >
          <GridIcon />
          모아보기
        </button>
        <button
          type="button"
          className={styles.dockRound}
          onClick={() => setMuted((v) => !v)}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
          aria-pressed={!muted}
        >
          {muted ? <MuteIcon /> : <SpeakerIcon />}
        </button>
      </div>
    </div>
  )
}

function SectionStrip({
  section,
  markerRef,
}: {
  section: SessionSection
  markerRef: (el: HTMLElement | null) => void
}) {
  return (
    <div
      className={styles.stripGroup}
      ref={markerRef}
      data-section={section.id}
      style={{ ['--accent' as string]: section.accent }}
    >
      {section.cards.map((card) => (
        <SessionTile key={card.id} card={card} tint={section.cardTint} />
      ))}
    </div>
  )
}

function SessionTile({
  card,
  tint,
  cylinder = false,
}: {
  card: SessionCard
  tint: string
  cylinder?: boolean
}) {
  return (
    <div
      className={`${styles.cell} ${styles[`${card.kind}Cell`]}`}
      data-cylinder={cylinder ? '' : undefined}
    >
      <article
        className={`${styles.card} ${styles[card.kind]}`}
        style={card.kind === 'intro' ? undefined : { background: tint }}
      >
        {card.tags && <p className={styles.tags}>{card.tags}</p>}
        {card.title && <h3 className={styles.cardTitle}>{card.title}</h3>}
        {card.body && <p className={styles.cardBody}>{card.body}</p>}
        <Doodle name={card.doodle} className={styles.doodle} />
        {(card.authors || card.time) && (
          <p className={styles.meta}>
            {card.authors}
            {card.authors && card.time ? ' | ' : ''}
            {card.time}
          </p>
        )}
        {card.hasPlay && (
          <span className={styles.play} aria-hidden>
            <PlayIcon />
          </span>
        )}
      </article>
    </div>
  )
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 6.2h2.4L8.2 3.5v9L4.9 9.8H2.5V6.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10.4 6.2a2.6 2.6 0 0 1 0 3.6M12.3 4.6a5 5 0 0 1 0 6.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MuteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 6.2h2.4L8.2 3.5v9L4.9 9.8H2.5V6.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10.2 6.2l4 4M14.2 6.2l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M7 5.2l6.4 3.8L7 12.8V5.2z" fill="currentColor" />
    </svg>
  )
}
