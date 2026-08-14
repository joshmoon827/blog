'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { mosaicHeightCss } from '@/lib/mosaicPattern'
import styles from './lab-chrome.module.css'

export const INTERACTIVE_LABS = [
  { href: '/test-ui/webgl', label: 'Three.js' },
  { href: '/test-ui/gsap', label: 'GSAP' },
  { href: '/test-ui/pretext', label: 'Pretext' },
  { href: '/test-ui/p5', label: 'p5.js' },
  { href: '/test-ui/paper', label: 'Paper.js' },
  { href: '/test-ui/physics', label: 'Matter.js' },
] as const

export function LabNav({ currentHref }: { currentHref: string }) {
  return (
    <nav className={styles.toc} aria-label="Interactive libraries">
      {INTERACTIVE_LABS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`${styles.tocLink} ${item.href === currentHref ? styles.tocActive : ''}`}
          aria-current={item.href === currentHref ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

type LabChromeProps = {
  kicker: string
  title: string
  lede: ReactNode
  note: string
  captionKicker: string
  caption: string
  currentHref: string
  aspectRatio?: string
  children: ReactNode
}

export default function LabChrome({
  kicker,
  title,
  lede,
  note,
  captionKicker,
  caption,
  currentHref,
  aspectRatio = '506 / 184',
  children,
}: LabChromeProps) {
  const height = mosaicHeightCss(aspectRatio)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>{kicker}</p>
        <h1 className={styles.pageTitle}>{title}</h1>
        <p className={styles.lede}>{lede}</p>
        <p className={styles.meta}>
          <Link href="/">← Articles</Link>
          <span aria-hidden>·</span>
          <span>라이브러리당 한 패턴</span>
        </p>
      </header>
      <LabNav currentHref={currentHref} />
      <section className={styles.stageBlock} aria-label={title}>
        <section className={styles.stage} style={{ height }} aria-label={captionKicker}>
          {children}
          <div className={styles.caption}>
            <p className={styles.captionKicker}>{captionKicker}</p>
            <p className={styles.captionTitle}>{caption}</p>
          </div>
        </section>
        <p className={styles.stageNote}>{note}</p>
      </section>
    </div>
  )
}
