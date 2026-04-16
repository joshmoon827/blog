'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { posters } from '@/data/posters'
import styles from './ImageCarousel.module.css'

interface Props {
  /** 이 카드가 그리드의 몇 번째인지 — 시작 오프셋으로 사용 */
  offset: number
  alt: string
}

const INTERVAL_MS = 2800

export default function ImageCarousel({ offset, alt }: Props) {
  const [idx, setIdx] = useState(offset % posters.length)

  useEffect(() => {
    // 각 카드마다 시작 타이밍을 다르게 (stagger)
    const delay = (offset * 370) % INTERVAL_MS
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setIdx((prev) => (prev + 1) % posters.length)
      }, INTERVAL_MS)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timer)
  }, [offset])

  const src = posters[idx]

  return (
    <div className={styles.wrap}>
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={src}
          className={styles.slide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
            className={styles.img}
            priority={offset < 3}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
