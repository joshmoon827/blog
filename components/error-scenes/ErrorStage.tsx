'use client'

import gsap from 'gsap'
import Link from 'next/link'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { LocalizedText } from '@/components/LocalizedText'
import { ERROR_KINDS, type ErrorKind, type ErrorVersion } from './kinds'
import styles from './errorScenes.module.css'

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function HomeLink({ solid = true }: { solid?: boolean }) {
  return (
    <Link href="/" className={solid ? styles.btn : styles.btnGhost}>
      <LocalizedText ko="홈으로 돌아가기" en="Back home" />
    </Link>
  )
}

function VersionOne({
  kind,
  extra,
}: {
  kind: ErrorKind
  extra?: ReactNode
}) {
  const copy = ERROR_KINDS[kind]
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reducedMotion()) return
      gsap.from('[data-digit]', {
        y: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'expo.out',
      })
      gsap.from('[data-rest]', { y: 12, opacity: 0, duration: 0.5, delay: 0.35, ease: 'power2.out' })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} className={styles.scene} aria-label={`${copy.label} version 1`}>
      <p className={styles.kicker}>{copy.v1.kicker}</p>
      <h1
        className={styles.digits}
        aria-label={copy.label}
        data-wide={copy.digits.length > 4 ? '' : undefined}
      >
        {copy.digits.map((d, i) => (
          <span key={`${d}-${i}`} className={styles.digit} data-digit>
            {d}
          </span>
        ))}
      </h1>
      <div data-rest>
        <p className={styles.copy}>
          <LocalizedText ko={copy.v1.ko} en={copy.v1.en} />
        </p>
        <div className={styles.actions}>
          {extra}
          <HomeLink solid={kind !== '401'} />
          {kind === '404' ? (
            <Link href="/category" className={styles.btnGhost}>
              Category
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function VersionTwo({
  kind,
  extra,
}: {
  kind: ErrorKind
  extra?: ReactNode
}) {
  const copy = ERROR_KINDS[kind]
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const digits = Array.from(el.querySelectorAll<HTMLElement>('[data-digit]'))
    const ctx = gsap.context(() => {
      if (reducedMotion()) return
      digits.forEach((digit, i) => {
        gsap.to(digit, {
          y: i % 2 === 0 ? -8 : 8,
          rotation: i === 1 ? 4 : -3,
          duration: 2.4 + i * 0.2,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.15,
        })
      })
    }, root)

    const xTo = digits.map((digit, i) =>
      gsap.quickTo(digit, 'x', { duration: 0.55 + i * 0.08, ease: 'power3.out' }),
    )
    const onMove = (event: PointerEvent) => {
      const dx = (event.clientX / window.innerWidth - 0.5) * 48
      xTo.forEach((fn, i) => fn(dx * (0.45 + i * 0.35)))
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      ctx.revert()
    }
  }, [])

  return (
    <section ref={root} className={styles.split} aria-label={`${copy.label} version 2`}>
      <h1
        className={styles.splitDigits}
        aria-label={copy.label}
        data-wide={copy.digits.length > 4 ? '' : undefined}
      >
        {copy.digits.map((d, i) => (
          <span key={`${d}-${i}`} className={styles.digit} data-digit>
            {d}
          </span>
        ))}
      </h1>
      <div className={styles.splitBody}>
        <p className={styles.splitCopy}>
          <LocalizedText ko={copy.v2.ko} en={copy.v2.en} />
        </p>
        <div className={styles.splitActions}>
          {extra}
          <HomeLink solid={kind !== '401'} />
        </div>
      </div>
    </section>
  )
}

function VersionThree({
  kind,
  extra,
}: {
  kind: ErrorKind
  extra?: ReactNode
}) {
  const copy = ERROR_KINDS[kind]
  const root = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reducedMotion()) return
      gsap.fromTo(
        '[data-clip]',
        { clipPath: 'inset(100% 0 0 0)' },
        { clipPath: 'inset(0% 0 0 0)', duration: 1, ease: 'expo.out' },
      )
      gsap.from('[data-rest]', { y: 16, opacity: 0, duration: 0.55, delay: 0.35, ease: 'power2.out' })
      gsap.to('[data-marquee]', { xPercent: -50, duration: 18, ease: 'none', repeat: -1 })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} className={styles.clipStage} aria-label={`${copy.label} version 3`}>
      <div className={styles.marquee} data-marquee aria-hidden>
        {[...copy.tape, ...copy.tape, ...copy.tape, ...copy.tape].map((word, i) => (
          <span key={`${word}-${i}`}>{word}</span>
        ))}
      </div>
      <div>
        <p className={styles.kicker}>{copy.v3.kicker}</p>
        <h1
          className={styles.clipMark}
          data-clip
          data-wide={copy.label.length > 4 ? '' : undefined}
        >
          {copy.label}
        </h1>
        <div data-rest className={styles.clipCopy}>
          <p className={styles.copy} style={{ marginInline: 'auto' }}>
            <LocalizedText ko={copy.v3.ko} en={copy.v3.en} />
          </p>
          <div className={styles.actions} style={{ justifyContent: 'center' }}>
            {extra}
            <HomeLink solid={kind !== '401'} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ErrorStage({
  kind,
  version,
  extra,
}: {
  kind: ErrorKind
  version: ErrorVersion
  extra?: ReactNode
}) {
  if (version === 1) return <VersionOne kind={kind} extra={extra} />
  if (version === 3) return <VersionThree kind={kind} extra={extra} />
  return <VersionTwo kind={kind} extra={extra} />
}
