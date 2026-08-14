'use client'

import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import Link from 'next/link'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { GsapHomeSeriesMode } from '@/lib/homeSeriesMode'
import { LabNav } from '../LabChrome'
import styles from './gsap.module.css'

const PHRASE = 'WELCOME TO JOSH!OG'
const COMPACT_PHRASE = PHRASE.replaceAll(' ', '')

const EXAMPLES = [
  { id: 'scatter', number: '01', short: 'Scatter' },
  { id: 'columns', number: '02', short: 'Columns' },
  { id: 'wave', number: '03', short: 'Wave' },
  { id: 'decoder', number: '04', short: 'Decoder' },
  { id: 'orbit', number: '05', short: 'Orbit' },
  { id: 'slices', number: '06', short: 'Slices' },
  { id: 'marquee', number: '07', short: 'Marquee' },
  { id: 'flip', number: '08', short: 'Flip' },
] as const

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function LetterSpans({
  text,
  className,
  dataName = 'letter',
}: {
  text: string
  className?: string
  dataName?: string
}) {
  return Array.from(text).map((char, index) =>
    char === ' ' ? (
      <span key={`${char}-${index}`} className={styles.wordSpace} aria-hidden>
        {'\u00a0'}
      </span>
    ) : (
      <span
        key={`${char}-${index}`}
        className={className}
        data-char-node={dataName}
        aria-hidden
      >
        {char}
      </span>
    ),
  )
}

function ExampleFrame({
  id,
  number,
  title,
  description,
  gesture,
  children,
}: {
  id: string
  number: string
  title: string
  description: string
  gesture: string
  children: ReactNode
}) {
  return (
    <section id={id} className={styles.example}>
      <header className={styles.exampleHeader}>
        <span className={styles.exampleNumber}>{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className={styles.stage}>
        {children}
        <span className={styles.gesture}>{gesture}</span>
      </div>
    </section>
  )
}

export default function GsapTypeGallery() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.kicker}>test-ui · gsap kinetic type</p>
        <h1>
          Welcome,
          <br />
          eight ways.
        </h1>
        <p className={styles.lede}>
          GSAP 소개 페이지의 거대한 <strong>Animate Anything</strong> 타이포그래피를
          출발점으로 삼았습니다. 모든 예시는 같은 문구를 쓰지만 레이아웃, 움직임,
          입력 방식은 서로 독립적입니다.
        </p>
        <p className={styles.meta}>
          <Link href="/">← Articles</Link>
          <span aria-hidden>·</span>
          <a href="#scatter">Start exploring</a>
        </p>
      </header>

      <LabNav currentHref="/test-ui/gsap" />

      <nav className={styles.exampleNav} aria-label="GSAP typography examples">
        {EXAMPLES.map((example) => (
          <a key={example.id} href={`#${example.id}`}>
            <span>{example.number}</span>
            {example.short}
          </a>
        ))}
      </nav>

      <div className={styles.gallery}>
        <ExampleFrame
          id="scatter"
          number="01"
          title="Hero Scatter"
          description="GSAP 홈처럼 글자마다 플립, 슬라이드, 숫자 레일, 스왑을 독립적으로 조립합니다. 완성된 글자는 커서를 자석처럼 따라옵니다."
          gesture="MOVE"
        >
          <HeroScatter />
        </ExampleFrame>

        <ExampleFrame
          id="columns"
          number="02"
          title="Vertical Type Machine"
          description="각 글자를 독립된 세로 레일에 놓았습니다. 클릭하면 슬롯처럼 흩어졌다가 한 문장으로 정렬됩니다."
          gesture="MOVE · CLICK"
        >
          <VerticalColumns />
        </ExampleFrame>

        <ExampleFrame
          id="wave"
          number="03"
          title="Elastic Baseline"
          description="커서를 따라 타이포그래피의 기준선이 휘어집니다. 글자 위치와 세로 비율을 거리 기반으로 계산합니다."
          gesture="MOVE"
        >
          <ElasticWave />
        </ExampleFrame>

        <ExampleFrame
          id="decoder"
          number="04"
          title="Signal Decoder"
          description="무작위 신호가 최종 문구로 해독됩니다. 클릭할 때마다 GSAP 타임라인이 디코딩 과정을 다시 실행합니다."
          gesture="CLICK"
        >
          <SignalDecoder />
        </ExampleFrame>

        <ExampleFrame
          id="orbit"
          number="05"
          title="Type Constellation"
          description="글자를 문장이 아닌 궤도 위의 개체로 배치했습니다. 포인터로 공간을 기울이고 클릭해 파동을 만듭니다."
          gesture="MOVE · CLICK"
        >
          <TypeConstellation />
        </ExampleFrame>

        <ExampleFrame
          id="slices"
          number="06"
          title="Editorial Slices"
          description="같은 타이포그래피를 수평 마스크 여덟 장으로 잘랐습니다. 커서 방향에 따라 절단면이 서로 어긋납니다."
          gesture="MOVE"
        >
          <EditorialSlices />
        </ExampleFrame>

        <ExampleFrame
          id="marquee"
          number="07"
          title="Velocity Marquee"
          description="네 개의 문장 띠가 서로 반대 방향으로 흐릅니다. 커서 위치로 속도를 바꾸고 클릭하면 방향이 뒤집힙니다."
          gesture="MOVE · CLICK"
        >
          <VelocityMarquee />
        </ExampleFrame>

        <ExampleFrame
          id="flip"
          number="08"
          title="Poster Flip"
          description="세 단어 블록이 두 포스터 레이아웃 사이를 이동합니다. GSAP Flip이 위치와 크기 변화를 연결합니다."
          gesture="CLICK"
        >
          <PosterFlip />
        </ExampleFrame>
      </div>
    </div>
  )
}

type HeroVariant =
  | 'flip'
  | 'carrier'
  | 'lift'
  | 'slide'
  | 'portal'
  | 'counter'
  | 'drop'
  | 'double-one'
  | 'double-two'
  | 'turn'
  | 'stamp'
  | 'trail'
  | 'spin-x'
  | 'bang'
  | 'elastic'
  | 'grow'

function HeroGlyph({
  char,
  variant,
}: {
  char: string
  variant: HeroVariant
}) {
  const duplicated = variant === 'double-one' || variant === 'double-two'

  return (
    <span
      className={styles.heroGlyph}
      data-hero-glyph
      data-hero-variant={variant}
      aria-hidden
      style={{ opacity: 0 }}
    >
      <span className={styles.heroGlyphClip}>
        {variant === 'counter' ? (
          <span className={styles.heroCounterRail} data-hero-counter>
            <span>1</span>
            <span>0</span>
            <span>0</span>
            <span data-hero-letter>{char}</span>
          </span>
        ) : (
          <>
            {duplicated ? (
              <span
                className={`${styles.heroGlyphLetter} ${styles.heroDuplicate}`}
                data-hero-duplicate
              >
                {char}
              </span>
            ) : null}
            <span className={styles.heroGlyphLetter} data-hero-letter>
              {char}
            </span>
          </>
        )}
      </span>

      {variant === 'carrier' ? (
        <>
          <span
            className={`${styles.heroObject} ${styles.heroObjectA}`}
            data-hero-object-a
          >
            <i />
            <i />
            <i />
            <i />
          </span>
          <span
            className={`${styles.heroObject} ${styles.heroObjectB}`}
            data-hero-object-b
          >
            <i />
            <i />
            <i />
          </span>
        </>
      ) : null}

      {variant === 'portal' ? (
        <span
          className={`${styles.heroObject} ${styles.heroObjectC}`}
          data-hero-object-c
        />
      ) : null}

      {variant === 'trail' ? (
        <span
          className={`${styles.heroObject} ${styles.heroObjectE}`}
          data-hero-object-e
        >
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </span>
  )
}

/** Per-character GSAP-home-inspired entrance, deferred until the stage is visible. */
export function HeroScatter() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [heroReady, setHeroReady] = useState(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const glyphs = Array.from(
      root.querySelectorAll<HTMLElement>('[data-hero-glyph]'),
    )
    const letters = Array.from(
      root.querySelectorAll<HTMLElement>('[data-hero-letter]'),
    )
    const duplicates = Array.from(
      root.querySelectorAll<HTMLElement>('[data-hero-duplicate]'),
    )
    const byVariant = (variant: HeroVariant) =>
      root.querySelector<HTMLElement>(
        `[data-hero-variant="${variant}"] [data-hero-letter]`,
      )!
    const flip = byVariant('flip')
    const carrierLetter = byVariant('carrier')
    const lift = byVariant('lift')
    const slide = byVariant('slide')
    const portalLetter = byVariant('portal')
    const drop = byVariant('drop')
    const doubleOne = byVariant('double-one')
    const doubleTwo = byVariant('double-two')
    const doubleOneGhost = root.querySelector<HTMLElement>(
      '[data-hero-variant="double-one"] [data-hero-duplicate]',
    )!
    const doubleTwoGhost = root.querySelector<HTMLElement>(
      '[data-hero-variant="double-two"] [data-hero-duplicate]',
    )!
    const turn = byVariant('turn')
    const stampLetter = byVariant('stamp')
    const trailLetter = byVariant('trail')
    const spinX = byVariant('spin-x')
    const bang = byVariant('bang')
    const elastic = byVariant('elastic')
    const grow = byVariant('grow')
    const counter = root.querySelector<HTMLElement>('[data-hero-counter]')!
    const objectA = root.querySelector<HTMLElement>('[data-hero-object-a]')!
    const objectB = root.querySelector<HTMLElement>('[data-hero-object-b]')!
    const objectC = root.querySelector<HTMLElement>('[data-hero-object-c]')!
    const objectE = root.querySelector<HTMLElement>('[data-hero-object-e]')!
    const reduced = prefersReducedMotion()
    let interactive = reduced
    let intro: gsap.core.Timeline | null = null
    let introDelay: gsap.core.Tween | null = null
    let observer: IntersectionObserver | null = null
    let idleTweens: gsap.core.Tween[] = []

    const context = gsap.context(() => {
      if (reduced) {
        gsap.set(glyphs, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        })
        gsap.set(letters, {
          autoAlpha: 1,
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          rotationX: 0,
          rotationY: 0,
          scale: 1,
        })
        gsap.set(counter, { yPercent: -75 })
        gsap.set(duplicates, { yPercent: -110 })
        gsap.set(objectA, { autoAlpha: 1, x: 0, rotation: 0, scale: 1 })
        gsap.set([objectB, objectC], {
          autoAlpha: 1,
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          scale: 0.72,
        })
        gsap.set(objectE, {
          autoAlpha: 1,
          yPercent: 0,
          rotation: 0,
        })
        setHeroReady(true)
        return
      }

      gsap.set(flip, {
        yPercent: 110,
        rotationX: -180,
        transformOrigin: '50% 100%',
      })
      gsap.set(carrierLetter, { yPercent: 110 })
      gsap.set(objectA, {
        autoAlpha: 1,
        x: -Math.max(420, root.clientWidth * 0.58),
        rotation: -360,
      })
      gsap.set(objectB, { autoAlpha: 1, yPercent: 100, scale: 0 })
      gsap.set(lift, { yPercent: -110 })
      gsap.set(slide, { xPercent: -110 })
      gsap.set(portalLetter, { yPercent: 110 })
      gsap.set(objectC, { autoAlpha: 1, xPercent: -160, scale: 0 })
      gsap.set(counter, { yPercent: 0 })
      gsap.set(drop, { yPercent: 110 })
      gsap.set([doubleOne, doubleTwo], { yPercent: 110 })
      gsap.set([doubleOneGhost, doubleTwoGhost], { yPercent: -110 })
      gsap.set(turn, { rotationY: -180, scale: 0 })
      gsap.set(stampLetter, { scale: 0 })
      gsap.set(trailLetter, { yPercent: -110 })
      gsap.set(objectE, {
        autoAlpha: 0,
        yPercent: 120,
        rotation: 180,
      })
      gsap.set(spinX, { autoAlpha: 0, rotationX: -450 })
      gsap.set(bang, { xPercent: -110 })
      gsap.set(elastic, { autoAlpha: 0, rotation: -120, scale: 0.2 })
      gsap.set(grow, { autoAlpha: 0, rotation: 120, scale: 0 })
      gsap.set(glyphs, { autoAlpha: 1 })

      intro = gsap.timeline({
        paused: true,
        defaults: { duration: 0.65, ease: 'power2.out' },
        onComplete: () => {
          interactive = true
          setHeroReady(true)
          gsap.to([objectB, objectC], {
            autoAlpha: 1,
            xPercent: 0,
            yPercent: 0,
            rotation: 0,
            scale: 0.72,
            duration: 0.5,
            stagger: 0.07,
            ease: 'back.out(1.6)',
          })
          idleTweens = [
            gsap.to(objectA, {
              rotation: '+=360',
              duration: 6,
              repeat: -1,
              ease: 'none',
            }),
            gsap.to(objectE, {
              y: -8,
              rotation: 7,
              duration: 2.8,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            }),
          ]
        },
      })
      intro
        .to(flip, { yPercent: 0, duration: 0.45 }, 0)
        .to(
          flip,
          { rotationX: 0, duration: 1, ease: 'back.out(1.7)' },
          0.12,
        )
        .to(objectB, { scale: 1, duration: 0.4, ease: 'back.out(1.7)' }, 0.2)
        .to(
          objectB,
          {
            yPercent: -220,
            autoAlpha: 0,
            duration: 1.35,
            ease: 'power4.out',
          },
          0.46,
        )
        .to(carrierLetter, { yPercent: 0, duration: 0.42 }, 0.42)
        .to(objectA, { x: 0, rotation: 0, duration: 1 }, 0.34)
        .to(lift, { yPercent: 0, duration: 1, ease: 'back.out(1.4)' }, 0.78)
        .to(slide, { xPercent: 0 }, 0.74)
        .to(objectC, { scale: 1, duration: 0.38, ease: 'back.out(1.7)' }, 0.62)
        .to(objectC, { xPercent: 0, duration: 0.58 }, 0.64)
        .to(
          objectC,
          {
            yPercent: 145,
            autoAlpha: 0,
            duration: 0.58,
            ease: 'power2.in',
          },
          1.2,
        )
        .to(portalLetter, { yPercent: 0, duration: 0.52 }, 1.24)
        .to(counter, { yPercent: -75, duration: 1.05, ease: 'power2.inOut' }, 0.94)
        .to(drop, { yPercent: 0, duration: 0.9 }, 1.04)
        .to(turn, { rotationY: 0, scale: 1, duration: 1 }, 1.52)
        .to(
          stampLetter,
          { scale: 1, duration: 0.65, ease: 'back.out(1.5)' },
          1.68,
        )
        .to(
          objectE,
          {
            autoAlpha: 1,
            yPercent: 0,
            rotation: 0,
            duration: 1,
            ease: 'back.out(1.6)',
          },
          1.64,
        )
        .to(trailLetter, { yPercent: 0, duration: 0.62 }, 1.84)
        .to(
          spinX,
          { autoAlpha: 1, rotationX: 0, duration: 1.3 },
          1.96,
        )
        .to(bang, { xPercent: 0 }, 2.12)
        .to(
          elastic,
          {
            autoAlpha: 1,
            rotation: 0,
            scale: 1,
            duration: 1.5,
            ease: 'elastic.out(1, 0.4)',
          },
          1.86,
        )
        .to(
          grow,
          {
            autoAlpha: 1,
            rotation: 0,
            scale: 1,
            duration: 1.15,
            ease: 'back.out(1.8)',
          },
          2.14,
        )

      const addDoubleSwap = (
        target: HTMLElement,
        ghost: HTMLElement,
        at: number,
      ) => {
        intro
          ?.to([target, ghost], { yPercent: 0, duration: 0.46 }, at)
          .to(target, { yPercent: -110, duration: 0.34 }, at + 0.48)
          .to(ghost, { yPercent: 110, duration: 0.34 }, at + 0.48)
          .to(target, { yPercent: 0, duration: 0.46 }, at + 0.82)
          .to(ghost, { yPercent: -110, duration: 0.46 }, at + 0.82)
      }
      addDoubleSwap(doubleOne, doubleOneGhost, 1.22)
      addDoubleSwap(doubleTwo, doubleTwoGhost, 1.42)
    }, root)

    const movers = glyphs.map((glyph) => ({
      x: gsap.quickTo(glyph, 'x', { duration: 0.55, ease: 'power3.out' }),
      y: gsap.quickTo(glyph, 'y', { duration: 0.55, ease: 'power3.out' }),
      r: gsap.quickTo(glyph, 'rotation', { duration: 0.7, ease: 'power3.out' }),
      sx: gsap.quickTo(glyph, 'scaleX', { duration: 0.45, ease: 'power2.out' }),
      sy: gsap.quickTo(glyph, 'scaleY', { duration: 0.45, ease: 'power2.out' }),
    }))

    const onMove = (event: PointerEvent) => {
      if (reduced || !interactive) return
      glyphs.forEach((glyph, index) => {
        const box = glyph.getBoundingClientRect()
        const dx = event.clientX - (box.left + box.width / 2)
        const dy = event.clientY - (box.top + box.height / 2)
        const distance = Math.max(1, Math.hypot(dx, dy))
        const influence = Math.max(0, 1 - distance / 190) ** 2
        movers[index]?.x(dx * influence * 0.22)
        movers[index]?.y(dy * influence * 0.22)
        movers[index]?.r((dx / 18) * influence)
        movers[index]?.sx(1 + influence * 0.16)
        movers[index]?.sy(1 + influence * 0.16)
      })
    }

    const reset = () => {
      if (!interactive) return
      movers.forEach((mover) => {
        mover.x(0)
        mover.y(0)
        mover.r(0)
        mover.sx(1)
        mover.sy(1)
      })
    }

    if (!reduced) {
      const scheduleIntro = () => {
        if (introDelay) return
        // PageTransition fades in for 300ms. Starting just after it finishes
        // keeps the loading sequence visible instead of consuming it offscreen.
        introDelay = gsap.delayedCall(0.38, () => {
          intro?.play(0)
        })
      }
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry?.isIntersecting || entry.intersectionRatio < 0.32) return
            observer?.disconnect()
            scheduleIntro()
          },
          { threshold: [0.32] },
        )
        observer.observe(root)
      } else {
        scheduleIntro()
      }
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', reset)
    return () => {
      observer?.disconnect()
      introDelay?.kill()
      idleTweens.forEach((tween) => tween.kill())
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', reset)
      gsap.killTweensOf(glyphs)
      context.revert()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`${styles.scene} ${styles.heroScene}`}
      aria-label={PHRASE}
      data-hero-ready={heroReady ? 'true' : undefined}
    >
      <div className={styles.heroType} aria-hidden>
        <div className={styles.heroLine}>
          <HeroGlyph char="W" variant="flip" />
          <HeroGlyph char="E" variant="carrier" />
          <HeroGlyph char="L" variant="lift" />
          <HeroGlyph char="C" variant="slide" />
          <HeroGlyph char="O" variant="portal" />
          <HeroGlyph char="M" variant="counter" />
          <HeroGlyph char="E" variant="drop" />
          <span className={styles.heroWordSpace} />
          <HeroGlyph char="T" variant="double-one" />
          <HeroGlyph char="O" variant="double-two" />
        </div>
        <div className={`${styles.heroLine} ${styles.heroLineSecond}`}>
          <HeroGlyph char="J" variant="turn" />
          <HeroGlyph char="O" variant="stamp" />
          <HeroGlyph char="S" variant="trail" />
          <HeroGlyph char="H" variant="spin-x" />
          <HeroGlyph char="!" variant="bang" />
          <HeroGlyph char="O" variant="elastic" />
          <HeroGlyph char="G" variant="grow" />
        </div>
      </div>
    </div>
  )
}

const SLOT_GLYPHS = 'A10NXYMTEO!JSHG7'
const SLOT_CYCLE_ROW_COUNT = 11
const SLOT_CYCLE_TARGET_ROW = Math.floor(SLOT_CYCLE_ROW_COUNT / 2)
const SLOT_CYCLE_REPEAT = 5
const SLOT_RAIL_CENTER_OFFSET_EM =
  -(SLOT_CYCLE_ROW_COUNT * SLOT_CYCLE_REPEAT * 0.88) / 2

function slotGlyphs(target: string, index: number) {
  const cycle = Array.from({ length: SLOT_CYCLE_ROW_COUNT }, (_, row) => ({
    glyph:
      row === SLOT_CYCLE_TARGET_ROW
        ? target
        : SLOT_GLYPHS[(index * 7 + row * 5) % SLOT_GLYPHS.length] ?? '0',
    target: row === SLOT_CYCLE_TARGET_ROW,
  }))

  return Array.from({ length: SLOT_CYCLE_REPEAT }, (_, cycleIndex) =>
    cycle.map((item, row) => ({
      ...item,
      key: `${cycleIndex}-${row}`,
    })),
  ).flat()
}

export function VerticalColumns() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const rails = Array.from(root.querySelectorAll<HTMLElement>('[data-slot-rail]'))
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (!reduced) {
        gsap.from(rails, {
          y: (index) => (index % 2 ? -210 : 210),
          autoAlpha: 0,
          duration: 1.15,
          stagger: { each: 0.035, from: 'center' },
          ease: 'back.out(1.35)',
        })
      }
    }, root)
    const yTo = rails.map((rail) =>
      gsap.quickTo(rail, 'y', { duration: 0.48, ease: 'power3.out' }),
    )
    let spinning = false
    let spinTimeline: gsap.core.Timeline | null = null

    const onMove = (event: PointerEvent) => {
      if (reduced || spinning) return
      const box = root.getBoundingClientRect()
      const offset = (event.clientY - (box.top + box.height / 2)) * 0.32
      yTo.forEach((move, index) => move(offset * (index % 2 ? -1 : 1)))
    }
    const reset = () => {
      if (spinning) return
      yTo.forEach((move) => move(0))
    }
    const spin = () => {
      if (reduced) return
      spinTimeline?.kill()
      gsap.killTweensOf(rails)
      gsap.set(rails, { autoAlpha: 1 })
      spinning = true
      root.dataset.spinning = 'true'
      const cycleDistances = rails.map((rail) => {
        const row = rail.querySelector<HTMLElement>(':scope > span')
        return (row?.getBoundingClientRect().height ?? 0) * SLOT_CYCLE_ROW_COUNT
      })
      spinTimeline = gsap
        .timeline({
          onComplete: () => {
            // Each rail contains five identical cycles. One complete cycle
            // looks exactly like y: 0, so this reset is visually seamless.
            gsap.set(rails, { y: 0 })
            delete root.dataset.spinning
            spinning = false
          },
        })
        .to(rails, {
          y: (index) => (index % 2 ? -1 : 1) * (cycleDistances[index] ?? 0),
          duration: 1.15,
          stagger: { each: 0.022, from: 'random' },
          ease: 'power2.inOut',
        })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        spin()
      }
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', reset)
    root.addEventListener('click', spin)
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', reset)
      root.removeEventListener('click', spin)
      root.removeEventListener('keydown', onKeyDown)
      spinTimeline?.kill()
      delete root.dataset.spinning
      gsap.killTweensOf(rails)
      context.revert()
    }
  }, [])

  const words = ['WELCOME', 'TO', 'JOSH!OG']
  let compactIndex = 0

  return (
    <div
      ref={rootRef}
      className={`${styles.scene} ${styles.slotScene}`}
      aria-label={`${PHRASE}. Click to spin the letter columns.`}
      role="button"
      tabIndex={0}
    >
      <span className={styles.slotCenterLine} aria-hidden />
      <div className={styles.slotWords} aria-hidden>
        {words.map((word) => (
          <div key={word} className={styles.slotWord}>
            {Array.from(word).map((char) => {
              const index = compactIndex
              compactIndex += 1
              return (
                <span key={`${char}-${index}`} className={styles.slotColumn}>
                  <span
                    className={styles.slotRail}
                    data-slot-rail
                    style={{ marginTop: `${SLOT_RAIL_CENTER_OFFSET_EM}em` }}
                  >
                    {slotGlyphs(char, index).map((item) => (
                      <span
                        key={item.key}
                        className={item.target ? styles.slotTarget : undefined}
                      >
                        {item.glyph}
                      </span>
                    ))}
                  </span>
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ElasticWave() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const chars = Array.from(root.querySelectorAll<HTMLElement>('[data-char-node="wave"]'))
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (!reduced) {
        gsap.from(chars, {
          y: 110,
          rotation: 12,
          autoAlpha: 0,
          duration: 0.95,
          stagger: 0.035,
          ease: 'expo.out',
        })
      }
    }, root)
    const movers = chars.map((char) => ({
      y: gsap.quickTo(char, 'y', { duration: 0.35, ease: 'power3.out' }),
      sy: gsap.quickTo(char, 'scaleY', { duration: 0.42, ease: 'power3.out' }),
      r: gsap.quickTo(char, 'rotation', { duration: 0.42, ease: 'power3.out' }),
    }))

    const onMove = (event: PointerEvent) => {
      if (reduced) return
      const rootBox = root.getBoundingClientRect()
      const localY = event.clientY - rootBox.top
      chars.forEach((char, index) => {
        const box = char.getBoundingClientRect()
        const dx = event.clientX - (box.left + box.width / 2)
        const influence = Math.max(0, 1 - Math.abs(dx) / 210)
        const direction = Math.sign(dx || 1)
        movers[index]?.y((localY - rootBox.height / 2) * influence * 0.28)
        movers[index]?.sy(1 + influence * 0.72)
        movers[index]?.r(direction * influence * -9)
      })
    }
    const reset = () => {
      movers.forEach((mover) => {
        mover.y(0)
        mover.sy(1)
        mover.r(0)
      })
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', reset)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', reset)
      context.revert()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`${styles.scene} ${styles.waveScene}`}
      aria-label={PHRASE}
    >
      <div className={styles.waveHalo} aria-hidden />
      <div className={styles.waveType} aria-hidden>
        <div>
          <LetterSpans text="WELCOME TO" className={styles.waveChar} dataName="wave" />
        </div>
        <div>
          <LetterSpans text="JOSH!OG" className={styles.waveChar} dataName="wave" />
        </div>
      </div>
      <span className={styles.waveBaseline} aria-hidden />
    </div>
  )
}

const DECODER_GLYPHS = 'A1N0E7@#$%!?/\\<>[]{}'

function SignalDecoder() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const output = root.querySelector<HTMLElement>('[data-decoder-output]')
    const bar = root.querySelector<HTMLElement>('[data-decoder-bar]')
    if (!output || !bar) return
    const reduced = prefersReducedMotion()
    let tween: gsap.core.Tween | null = null

    const randomGlyph = (index: number, frame: number) =>
      DECODER_GLYPHS[(index * 7 + frame * 5) % DECODER_GLYPHS.length] ?? '0'

    const run = () => {
      tween?.kill()
      if (reduced) {
        output.textContent = PHRASE
        gsap.set(bar, { scaleX: 1 })
        return
      }
      const state = { progress: 0 }
      let frame = 0
      tween = gsap.to(state, {
        progress: 1,
        duration: 1.9,
        ease: 'power3.inOut',
        onStart: () => gsap.set(bar, { scaleX: 0 }),
        onUpdate: () => {
          frame += 1
          const resolved = Math.floor(state.progress * PHRASE.length)
          output.textContent = Array.from(PHRASE)
            .map((char, index) => {
              if (char === ' ') return ' '
              return index < resolved ? char : randomGlyph(index, frame)
            })
            .join('')
          gsap.set(bar, { scaleX: state.progress })
        },
        onComplete: () => {
          output.textContent = PHRASE
        },
      })
    }

    const onMove = (event: PointerEvent) => {
      const box = root.getBoundingClientRect()
      root.style.setProperty('--decoder-x', `${event.clientX - box.left}px`)
      root.style.setProperty('--decoder-y', `${event.clientY - box.top}px`)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        run()
      }
    }

    run()
    root.addEventListener('pointermove', onMove)
    root.addEventListener('click', run)
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('click', run)
      root.removeEventListener('keydown', onKeyDown)
      tween?.kill()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`${styles.scene} ${styles.decoderScene}`}
      aria-label={`${PHRASE}. Click to decode again.`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.decoderGrid} aria-hidden />
      <div className={styles.decoderChrome} aria-hidden>
        <span>JOSHLOG://SIGNAL</span>
        <span>CHANNEL 08</span>
        <span>LIVE</span>
      </div>
      <div className={styles.decoderOutput} data-decoder-output aria-hidden>
        {PHRASE}
      </div>
      <div className={styles.decoderProgress} aria-hidden>
        <span data-decoder-bar />
      </div>
      <div className={styles.decoderReadout} aria-hidden>
        01001010&nbsp; 01001111&nbsp; 01010011&nbsp; 01001000
      </div>
    </div>
  )
}

function TypeConstellation() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const system = root.querySelector<HTMLElement>('[data-orbit-system]')
    const ring = root.querySelector<HTMLElement>('[data-orbit-ring]')
    const chars = Array.from(root.querySelectorAll<HTMLElement>('[data-orbit-char]'))
    if (!system || !ring) return
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (!reduced) {
        gsap.to(ring, {
          rotation: 360,
          duration: 24,
          repeat: -1,
          ease: 'none',
        })
        gsap.from(chars, {
          scale: 0,
          autoAlpha: 0,
          duration: 0.75,
          stagger: { amount: 0.65, from: 'random' },
          ease: 'back.out(1.7)',
        })
      }
    }, root)
    const tiltX = gsap.quickTo(system, 'rotationX', {
      duration: 0.8,
      ease: 'power3.out',
    })
    const tiltY = gsap.quickTo(system, 'rotationY', {
      duration: 0.8,
      ease: 'power3.out',
    })

    const onMove = (event: PointerEvent) => {
      if (reduced) return
      const box = root.getBoundingClientRect()
      tiltX(((event.clientY - box.top) / box.height - 0.5) * -18)
      tiltY(((event.clientX - box.left) / box.width - 0.5) * 22)
    }
    const reset = () => {
      tiltX(0)
      tiltY(0)
    }
    const pulse = () => {
      if (reduced) return
      gsap.fromTo(
        chars,
        { scale: 1, opacity: 1 },
        {
          scale: 1.85,
          opacity: 0.18,
          duration: 0.48,
          stagger: { amount: 0.45, from: 'center', grid: 'auto' },
          repeat: 1,
          yoyo: true,
          ease: 'sine.inOut',
        },
      )
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        pulse()
      }
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', reset)
    root.addEventListener('click', pulse)
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', reset)
      root.removeEventListener('click', pulse)
      root.removeEventListener('keydown', onKeyDown)
      context.revert()
    }
  }, [])

  const orbitChars = Array.from(COMPACT_PHRASE)

  return (
    <div
      ref={rootRef}
      className={`${styles.scene} ${styles.orbitScene}`}
      aria-label={`${PHRASE}. Move to tilt; click to pulse.`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.orbitSystem} data-orbit-system>
        <div className={styles.orbitRing} data-orbit-ring aria-hidden>
          {orbitChars.map((char, index) => {
            const angle = (index / orbitChars.length) * Math.PI * 2 - Math.PI / 2
            const radiusX = index % 2 ? 44 : 37
            const radiusY = index % 2 ? 39 : 31
            const style = {
              left: `${50 + Math.cos(angle) * radiusX}%`,
              top: `${50 + Math.sin(angle) * radiusY}%`,
            }
            return (
              <span
                key={`${char}-${index}`}
                className={styles.orbitChar}
                data-orbit-char
                style={style}
              >
                {char}
              </span>
            )
          })}
        </div>
        <div className={styles.orbitCore} aria-hidden>
          <span>WELCOME TO</span>
          <strong>JOSH!OG</strong>
        </div>
      </div>
    </div>
  )
}

export function EditorialSlices() {
  const rootRef = useRef<HTMLDivElement>(null)
  const slices = Array.from({ length: 8 })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const sliceNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-slice]'))
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (!reduced) {
        gsap.from(sliceNodes, {
          x: (index) => (index % 2 ? 170 : -170),
          duration: 1.1,
          stagger: { each: 0.055, from: 'edges' },
          ease: 'expo.out',
        })
      }
    }, root)
    const xTo = sliceNodes.map((slice) =>
      gsap.quickTo(slice, 'x', { duration: 0.55, ease: 'power3.out' }),
    )

    const onMove = (event: PointerEvent) => {
      if (reduced) return
      const box = root.getBoundingClientRect()
      const normalized = (event.clientX - box.left) / box.width - 0.5
      xTo.forEach((move, index) => {
        const depth = 0.4 + index / sliceNodes.length
        move(normalized * 150 * depth * (index % 2 ? -1 : 1))
      })
    }
    const reset = () => xTo.forEach((move) => move(0))

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', reset)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', reset)
      context.revert()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`${styles.scene} ${styles.sliceScene}`}
      aria-label={PHRASE}
    >
      {slices.map((_, index) => {
        const top = index * 12.5
        const bottom = 100 - (index + 1) * 12.5
        return (
          <div
            key={index}
            className={styles.slice}
            data-slice
            style={{ clipPath: `inset(${top}% 0 ${bottom}% 0)` }}
            aria-hidden
          >
            <div className={styles.sliceType}>
              <span>WELCOME TO</span>
              <strong>JOSH!OG</strong>
            </div>
          </div>
        )
      })}
      <span className={styles.sliceIndex} aria-hidden>
        08 / CUTS
      </span>
    </div>
  )
}

function VelocityMarquee() {
  const rootRef = useRef<HTMLDivElement>(null)
  const rows = [
    'WELCOME TO JOSH!OG — ',
    'JOSH!OG — WELCOME TO — ',
    'WELCOME — TO — JOSH!OG — ',
    'TO JOSH!OG — WELCOME — ',
  ]

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const tracks = Array.from(root.querySelectorAll<HTMLElement>('[data-marquee-track]'))
    const rowNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-marquee-row]'))
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (!reduced) {
        tracks.forEach((track, index) => {
          gsap.fromTo(
            track,
            { xPercent: index % 2 ? -50 : 0 },
            {
              xPercent: index % 2 ? 0 : -50,
              duration: 13 + index * 2.5,
              repeat: -1,
              ease: 'none',
            },
          )
        })
      }
    }, root)
    const trackTweens = tracks.map((track) => gsap.getTweensOf(track)[0]).filter(Boolean)
    const scaleTo = rowNodes.map((row) => ({
      sx: gsap.quickTo(row, 'scaleX', { duration: 0.35, ease: 'power3.out' }),
      sy: gsap.quickTo(row, 'scaleY', { duration: 0.35, ease: 'power3.out' }),
      skew: gsap.quickTo(row, 'skewX', { duration: 0.35, ease: 'power3.out' }),
    }))
    let direction = 1

    const onMove = (event: PointerEvent) => {
      if (reduced) return
      const box = root.getBoundingClientRect()
      const x = (event.clientX - box.left) / box.width
      const y = event.clientY - box.top
      trackTweens.forEach((tween, index) => {
        tween?.timeScale(direction * (0.45 + x * 1.8) * (index % 2 ? 0.8 : 1))
      })
      rowNodes.forEach((row, index) => {
        const rowBox = row.getBoundingClientRect()
        const distance = Math.abs(event.clientY - (rowBox.top + rowBox.height / 2))
        const influence = Math.max(0, 1 - distance / (box.height * 0.28))
        scaleTo[index]?.sx(1 + influence * 0.14)
        scaleTo[index]?.sy(1 + influence * 0.14)
        scaleTo[index]?.skew((x - 0.5) * influence * -12)
      })
      root.style.setProperty('--marquee-y', `${y}px`)
    }
    const reset = () => {
      scaleTo.forEach((move) => {
        move.sx(1)
        move.sy(1)
        move.skew(0)
      })
    }
    const reverse = () => {
      if (reduced) return
      direction *= -1
      trackTweens.forEach((tween, index) => {
        gsap.to(tween, {
          timeScale: direction * (index % 2 ? 0.8 : 1),
          duration: 0.65,
          ease: 'power3.out',
        })
      })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        reverse()
      }
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', reset)
    root.addEventListener('click', reverse)
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', reset)
      root.removeEventListener('click', reverse)
      root.removeEventListener('keydown', onKeyDown)
      context.revert()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`${styles.scene} ${styles.marqueeScene}`}
      aria-label={`${PHRASE}. Click to reverse the marquees.`}
      role="button"
      tabIndex={0}
    >
      {rows.map((row, index) => {
        const repeated = `${row}${row}${row}${row}`
        return (
          <div
            key={row}
            className={`${styles.marqueeRow} ${index % 2 ? styles.marqueeOutline : ''}`}
            data-marquee-row
            aria-hidden
          >
            <div className={styles.marqueeTrack} data-marquee-track>
              <span>{repeated}</span>
              <span>{repeated}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PosterFlip() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    gsap.registerPlugin(Flip)
    const pieces = Array.from(root.querySelectorAll<HTMLElement>('[data-poster-piece]'))
    const reduced = prefersReducedMotion()
    const context = gsap.context(() => {
      if (!reduced) {
        gsap.from(pieces, {
          scale: 0.55,
          autoAlpha: 0,
          rotation: (index) => (index % 2 ? 8 : -8),
          duration: 0.9,
          stagger: 0.07,
          ease: 'back.out(1.5)',
        })
      }
    }, root)

    const flip = () => {
      const state = Flip.getState(pieces)
      root.classList.toggle(styles.posterAlt)
      if (reduced) return
      Flip.from(state, {
        duration: 1,
        ease: 'expo.inOut',
        stagger: 0.035,
        absolute: true,
      })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        flip()
      }
    }
    root.addEventListener('click', flip)
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('click', flip)
      root.removeEventListener('keydown', onKeyDown)
      context.revert()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`${styles.scene} ${styles.posterScene}`}
      aria-label={`${PHRASE}. Click to rearrange the poster.`}
      role="button"
      tabIndex={0}
    >
      <span
        className={`${styles.posterPiece} ${styles.posterWelcome}`}
        data-poster-piece
        aria-hidden
      >
        WELCOME
      </span>
      <span
        className={`${styles.posterPiece} ${styles.posterTo}`}
        data-poster-piece
        aria-hidden
      >
        TO
      </span>
      <span
        className={`${styles.posterPiece} ${styles.posterJosh}`}
        data-poster-piece
        aria-hidden
      >
        JOSH!OG
      </span>
      <span
        className={`${styles.posterPiece} ${styles.posterDisc}`}
        data-poster-piece
        aria-hidden
      />
      <span
        className={`${styles.posterPiece} ${styles.posterCross}`}
        data-poster-piece
        aria-hidden
      >
        +
      </span>
      <span
        className={`${styles.posterPiece} ${styles.posterMicro}`}
        data-poster-piece
        aria-hidden
      >
        INTERACTIVE TYPE / 2026
      </span>
    </div>
  )
}

export function GsapHomeStage({ mode }: { mode: GsapHomeSeriesMode }) {
  if (mode === 'gsap-scatter') return <HeroScatter />
  if (mode === 'gsap-columns') return <VerticalColumns />
  if (mode === 'gsap-wave') return <ElasticWave />
  if (mode === 'gsap-slices') return <EditorialSlices />
  return <PosterFlip />
}
