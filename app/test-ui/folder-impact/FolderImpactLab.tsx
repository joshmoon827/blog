'use client'

import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import GlyphBurst from './GlyphBurst'
import styles from './folder.module.css'

type Skill = { label: string; side: 'left' | 'right' }

const PROJECTS: {
  id: string
  title: string
  blurb: string
  skills: Skill[]
  gradientId: string
}[] = [
  {
    id: 'one',
    title: 'Dashboard prototype',
    blurb: 'Systems · motion · JS',
    gradientId: 'folder-grad-one',
    skills: [
      { label: 'UI', side: 'left' },
      { label: 'UX', side: 'left' },
      { label: 'Systems', side: 'left' },
      { label: 'JavaScript', side: 'right' },
      { label: 'GSAP', side: 'right' },
      { label: 'Prototype', side: 'right' },
    ],
  },
  {
    id: 'two',
    title: 'josh log cover',
    blurb: 'Blog · cover · craft',
    gradientId: 'folder-grad-two',
    skills: [
      { label: 'Layout', side: 'left' },
      { label: 'Type', side: 'left' },
      { label: 'Color', side: 'left' },
      { label: 'Next', side: 'right' },
      { label: 'CSS', side: 'right' },
      { label: 'Motion', side: 'right' },
    ],
  },
]

const ASCII =
  '!<>-_\\/[]{}—=+*^?#________ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

type Curve = {
  origin: { x: number; y: number }
  controlA: { x: number; y: number }
  controlB: { x: number; y: number }
  target: { x: number; y: number }
}

function pointOnCurve(curve: Curve, t: number) {
  const n = smoothstep(t)
  const r = 1 - n
  const rr = r * r
  const nn = n * n
  return {
    x:
      rr * r * curve.origin.x +
      3 * rr * n * curve.controlA.x +
      3 * r * nn * curve.controlB.x +
      nn * n * curve.target.x,
    y:
      rr * r * curve.origin.y +
      3 * rr * n * curve.controlA.y +
      3 * r * nn * curve.controlB.y +
      nn * n * curve.target.y,
  }
}

function targetFor(
  index: number,
  count: number,
  side: 1 | -1,
  width: number,
  height: number,
) {
  const mobile = window.matchMedia('(max-width: 620px)').matches
  const slots = mobile
    ? [
        { x: 0.56, y: -0.54, rotation: -5 },
        { x: 0.68, y: -0.42, rotation: 3 },
        { x: 0.56, y: -0.3, rotation: 6 },
      ]
    : [
        { x: 0.68, y: -0.58, rotation: -6 },
        { x: 0.84, y: -0.45, rotation: 3 },
        { x: 0.7, y: -0.32, rotation: 6 },
      ]
  const slot = slots[index % slots.length]
  const spread = count > slots.length ? (index - (count - 1) / 2) * 0.035 : 0
  return {
    x: side * width * slot.x,
    y: height * (slot.y + spread),
    rotation: side * slot.rotation,
  }
}

function makeCurve(
  target: { x: number; y: number },
  side: 1 | -1,
  width: number,
  height: number,
): Curve {
  return {
    origin: { x: 0, y: 0 },
    controlA: { x: -side * width * 0.26, y: -height * 0.08 },
    controlB: { x: target.x * 0.38, y: target.y - height * 0.22 },
    target,
  }
}

function scrambleText(el: HTMLElement, final: string, duration = 0.525) {
  const chars = final.split('')
  const state = { t: 0 }
  return gsap.to(state, {
    t: 1,
    duration,
    ease: 'none',
    onUpdate: () => {
      const reveal = Math.floor(state.t * chars.length)
      el.textContent = chars
        .map((ch, i) => {
          if (i < reveal) return ch
          if (ch === ' ') return ' '
          return ASCII[(Math.random() * ASCII.length) | 0]
        })
        .join('')
    },
    onComplete: () => {
      el.textContent = final
    },
  })
}

type TagItem = {
  tag: HTMLElement
  side: 1 | -1
  target: { x: number; y: number; rotation: number }
  curve: Curve
  label: string
}

function paintTags(progress: number, items: TagItem[]) {
  const t = Math.min(1, Math.max(0, progress))
  const n = smoothstep(t)
  const fade = smoothstep(Math.min(1, Math.max(0, (t - 0.18) / 0.36)))
  items.forEach((item) => {
    const p = pointOnCurve(item.curve, t)
    const wobble = Math.sin(n * Math.PI)
    gsap.set(item.tag, {
      x: p.x,
      y: p.y,
      scale: lerp(0.72, 1, n),
      rotation: lerp(0, item.target.rotation, n) + item.side * wobble * 4,
      autoAlpha: fade,
    })
  })
}

function FolderCard({
  title,
  blurb,
  skills,
  gradientId,
}: (typeof PROJECTS)[number]) {
  const root = useRef<HTMLButtonElement>(null)
  const paper = useRef<HTMLSpanElement>(null)
  const front = useRef<HTMLSpanElement>(null)
  const icon = useRef<HTMLSpanElement>(null)
  const state = useRef<{
    progress: number
    items: TagItem[]
    tween: gsap.core.Tween | null
  } | null>(null)

  useLayoutEffect(() => {
    const btn = root.current
    const iconEl = icon.current
    if (!btn || !iconEl) return

    const tags = Array.from(
      btn.querySelectorAll<HTMLElement>('[data-project-skill-tag]'),
    )
    gsap.set(tags, {
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      scale: 0.72,
      rotation: 0,
      autoAlpha: 0,
    })
    gsap.set(paper.current, { yPercent: 20, y: 0 })
    gsap.set(iconEl, { y: 0, rotateX: 0, transformOrigin: '50% 50%' })
    gsap.set(front.current, { clearProps: 'transform' })

    const build = () => {
      const { width, height } = iconEl.getBoundingClientRect()
      const counts = { left: 0, right: 0 }
      const totals = tags.reduce(
        (acc, tag) => {
          const side = tag.dataset.projectSkillSide === 'left' ? 'left' : 'right'
          acc[side] += 1
          return acc
        },
        { left: 0, right: 0 },
      )
      const items: TagItem[] = tags.map((tag) => {
        const sideKey = tag.dataset.projectSkillSide === 'left' ? 'left' : 'right'
        const side: 1 | -1 = sideKey === 'left' ? -1 : 1
        const index = counts[sideKey]
        counts[sideKey] += 1
        const target = targetFor(index, totals[sideKey], side, width, height)
        return {
          tag,
          side,
          target,
          curve: makeCurve(target, side, width, height),
          label: tag.dataset.label || tag.textContent || '',
        }
      })
      state.current = { progress: 0, items, tween: null }
      paintTags(0, items)
    }

    build()
    const onResize = () => build()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      state.current?.tween?.kill()
      gsap.killTweensOf(tags)
    }
  }, [])

  const open = () => {
    const btn = root.current
    const s = state.current
    if (!btn || !s) return
    btn.classList.add(styles.isOpen)
    s.tween?.kill()

    const rect = btn.getBoundingClientRect()
    window.dispatchEvent(
      new CustomEvent('folder-glyph-burst', {
        detail: {
          x: rect.left + rect.width * 0.5,
          y: rect.top + rect.height * 0.5,
        },
      }),
    )

    if (reducedMotion()) {
      s.progress = 1
      paintTags(1, s.items)
      gsap.set(paper.current, { yPercent: -5 })
      gsap.set(icon.current, { y: -4, rotateX: 1.2 })
      s.items.forEach((item) => {
        item.tag.textContent = item.label
      })
      return
    }

    gsap.to(paper.current, {
      yPercent: -5,
      duration: 0.525,
      ease: 'power3.out',
    })
    gsap.to(icon.current, {
      y: -4,
      rotateX: 1.2,
      duration: 0.4,
      ease: 'power2.out',
    })

    s.tween = gsap.to(s, {
      progress: 1,
      duration: Math.max(0.425, (1 - s.progress) * 0.6875),
      ease: 'power2.out',
      onUpdate: () => paintTags(s.progress, s.items),
    })

    s.items.forEach((item, i) => {
      scrambleText(item.tag, item.label, 0.475 + i * 0.05)
    })
  }

  const close = () => {
    const btn = root.current
    const s = state.current
    if (!btn || !s) return
    btn.classList.remove(styles.isOpen)
    s.tween?.kill()

    if (reducedMotion()) {
      s.progress = 0
      paintTags(0, s.items)
      gsap.set(paper.current, { yPercent: 20 })
      gsap.set(icon.current, { y: 0, rotateX: 0 })
      return
    }

    gsap.to(paper.current, {
      yPercent: 20,
      duration: 0.4375,
      ease: 'power2.inOut',
    })
    gsap.to(icon.current, {
      y: 0,
      rotateX: 0,
      duration: 0.4,
      ease: 'power2.inOut',
    })
    s.tween = gsap.to(s, {
      progress: 0,
      duration: Math.max(0.35, s.progress * 0.525),
      ease: 'power2.in',
      onUpdate: () => paintTags(s.progress, s.items),
    })
  }

  return (
    <button
      ref={root}
      type="button"
      className={styles.card}
      onPointerEnter={open}
      onPointerLeave={close}
      onFocus={open}
      onBlur={close}
      aria-label={`${title}. Hover to open folder.`}
    >
      <span ref={icon} className={styles.folderIcon} aria-hidden>
        <svg
          className={styles.folderBack}
          viewBox="0 0 500 350"
          preserveAspectRatio="none"
          focusable="false"
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="250"
              x2="250"
              y1="48"
              y2="350"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#7e98ff" stopOpacity="0.68" />
              <stop offset="0.44" stopColor="#5b7bfa" stopOpacity="0.6" />
              <stop offset="0.72" stopColor="#395cf7" stopOpacity="0.38" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.74" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#${gradientId})`}
            stroke="rgba(255, 255, 255, 0.55)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            d="M28 350C13 350 0 337 0 322V51C0 36 13 23 28 23H158C177 23 189 31 200 46L216 67C226 81 241 88 259 88H450C478 88 500 110 500 138V322C500 337 487 350 472 350H28Z"
          />
        </svg>
        <span ref={paper} className={styles.paper} />
        <span className={styles.skillTags}>
          {skills.map((skill) => (
            <span
              key={`${skill.side}-${skill.label}`}
              className={styles.skillTag}
              data-project-skill-tag=""
              data-project-skill-side={skill.side}
              data-label={skill.label}
            >
              {skill.label}
            </span>
          ))}
        </span>
        <span ref={front} className={styles.folderFront} />
      </span>
      <span className={styles.meta}>
        <span className={styles.title}>{title}</span>
        <span className={styles.blurb}>{blurb}</span>
      </span>
    </button>
  )
}

export default function FolderImpactLab() {
  return (
    <div className={styles.page}>
      <GlyphBurst />
      <header className={styles.header}>
        <p className={styles.kicker}>test-ui · folder-impact</p>
        <h1 className={styles.pageTitle}>Folder ASCII impact</h1>
        <p className={styles.lede}>
          manishkr.xyz 프로젝트 폴더 호버: 배경에 파란 ASCII가 물결처럼 퍼졌다가
          사라지고, 종이가 올라오며 스킬 태그가 곡선으로 튀어나온다.
        </p>
      </header>

      <div className={styles.stage}>
        {PROJECTS.map((project) => (
          <FolderCard key={project.id} {...project} />
        ))}
      </div>
    </div>
  )
}
