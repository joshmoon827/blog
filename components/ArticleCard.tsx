'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { motion } from 'framer-motion'
import type { Article } from '@/data/articles'
import { useAuth } from '@/hooks/useAuth'
import { isAuthoringEnabled } from '@/lib/isAuthoringEnabled'
import { useArticleAdmin } from '@/components/ArticleAdminContext'
import ImageCarousel from './ImageCarousel'
import styles from './ArticleCard.module.css'

interface Props {
  article: Article
  index: number
  variant?: 'default' | 'wide'
}

const LONG_PRESS_MS = 5000
const TAP_MAX_MS = 280

export default function ArticleCard({ article, index, variant = 'default' }: Props) {
  const router = useRouter()
  const { authenticated, loading: authLoading } = useAuth()
  const adminCtx = useArticleAdmin()
  const isAdmin = !authLoading && authenticated && isAuthoringEnabled()
  const deleteMode = Boolean(adminCtx?.deleteMode)
  const hidden = adminCtx?.isHidden(article.slug) ?? false

  const cardRef = useRef<HTMLElement>(null)
  const pressTimer = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const pressStartedAt = useRef(0)
  const pressOrigin = useRef({ x: 0, y: 0 })
  const pointerStart = useRef({ x: 0, y: 0 })
  const holding = useRef(false)
  const enteredDelete = useRef(false)

  const [pressed, setPressed] = useState(false)
  const [clickedFlash, setClickedFlash] = useState(false)
  const [progress, setProgress] = useState(0)
  const [circle, setCircle] = useState({ x: 0, y: 0, max: 0 })
  const [trashing, setTrashing] = useState(false)

  const clearPress = useCallback(() => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    holding.current = false
    setPressed(false)
    setProgress(0)
  }, [])

  useEffect(() => () => clearPress(), [clearPress])

  const navigate = useCallback(() => {
    router.push(`/articles/${article.slug}`)
  }, [router, article.slug])

  const flashAndNavigate = useCallback(() => {
    setClickedFlash(true)
    window.setTimeout(() => {
      setClickedFlash(false)
      navigate()
    }, 120)
  }, [navigate])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!isAdmin || e.button !== 0) return
    if (deleteMode) return

    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const corners = [
      [0, 0],
      [rect.width, 0],
      [0, rect.height],
      [rect.width, rect.height],
    ]
    const max = Math.max(
      ...corners.map(([cx, cy]) => Math.hypot(cx - x, cy - y)),
    )

    pressOrigin.current = { x, y }
    pointerStart.current = { x: e.clientX, y: e.clientY }
    pressStartedAt.current = performance.now()
    enteredDelete.current = false
    holding.current = true
    setCircle({ x, y, max: max * 2.05 })
    setPressed(true)
    setProgress(0)

    const tick = () => {
      if (!holding.current) return
      const elapsed = performance.now() - pressStartedAt.current
      const p = Math.min(1, elapsed / LONG_PRESS_MS)
      setProgress(p)
      if (p < 1) {
        rafRef.current = window.requestAnimationFrame(tick)
      }
    }
    rafRef.current = window.requestAnimationFrame(tick)

    pressTimer.current = window.setTimeout(() => {
      enteredDelete.current = true
      holding.current = false
      setPressed(false)
      setProgress(1)
      adminCtx?.enterDeleteMode()
      window.setTimeout(() => setProgress(0), 180)
    }, LONG_PRESS_MS)

    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!holding.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    if (Math.hypot(dx, dy) > 14) {
      clearPress()
    }
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!isAdmin) return
    if (deleteMode) return

    const elapsed = performance.now() - pressStartedAt.current
    const wasHolding = holding.current
    clearPress()

    try {
      cardRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }

    if (enteredDelete.current) return
    if (!wasHolding) return

    if (elapsed <= TAP_MAX_MS) {
      flashAndNavigate()
    }
    // long-press cancelled before 5s → do nothing (no navigate)
  }

  const onPointerCancel = () => {
    clearPress()
  }

  const onTrashClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!adminCtx || trashing) return
    setTrashing(true)
    const ok = await adminCtx.trashArticle(article.slug)
    if (!ok) setTrashing(false)
  }

  if (hidden) return null

  const showCircle = pressed && progress > 0.02
  const circleSize = circle.max * Math.max(progress, 0.04)

  return (
    <motion.article
      ref={cardRef}
      className={[
        styles.card,
        deleteMode ? styles.deleteMode : '',
        clickedFlash ? styles.clicked : '',
        pressed ? styles.pressing : '',
      ]
        .filter(Boolean)
        .join(' ')}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={
        deleteMode || pressed ? undefined : { y: -3, transition: { duration: 0.2 } }
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={isAdmin ? (e) => e.preventDefault() : undefined}
    >
      <div
        className={deleteMode ? styles.shakeInner : undefined}
        style={
          deleteMode
            ? ({ '--shake-delay': `${(index % 7) * 40}ms` } as CSSProperties)
            : undefined
        }
      >
        {(clickedFlash || showCircle) && (
          <div className={styles.pressLayer} aria-hidden>
            {clickedFlash ? <div className={styles.tapDim} /> : null}
            {showCircle ? (
              <span
                className={styles.pressCircle}
                style={{
                  left: circle.x,
                  top: circle.y,
                  width: circleSize,
                  height: circleSize,
                }}
              />
            ) : null}
          </div>
        )}

        {deleteMode ? (
          <button
            type="button"
            className={styles.trashBtn}
            onClick={onTrashClick}
            disabled={trashing}
            aria-label={`${article.title} 휴지통으로`}
            title="휴지통으로 이동"
          >
            ×
          </button>
        ) : null}

        <Link
          href={`/articles/${article.slug}`}
          className={styles.thumbLink}
          onClick={(e) => {
            if (isAdmin) {
              e.preventDefault()
              if (deleteMode) return
              return
            }
            e.preventDefault()
            flashAndNavigate()
          }}
          tabIndex={-1}
          aria-hidden
          draggable={false}
        >
          <ImageCarousel
            src={article.image}
            alt={article.title}
            aspectRatio={variant === 'wide' ? '3 / 1' : undefined}
            priority={index < 3}
          />
          {article.draft ? (
            <span className={styles.draftBadge}>임시저장</span>
          ) : null}
        </Link>
        <div className={styles.body}>
          <h2 className={styles.title}>
            <Link
              href={`/articles/${article.slug}`}
              onClick={(e) => {
                if (deleteMode) {
                  e.preventDefault()
                  return
                }
                if (isAdmin) {
                  e.preventDefault()
                  return
                }
                e.preventDefault()
                flashAndNavigate()
              }}
            >
              {article.title}
            </Link>
          </h2>
          <p className={styles.desc}>{article.description}</p>
        </div>
      </div>
    </motion.article>
  )
}
