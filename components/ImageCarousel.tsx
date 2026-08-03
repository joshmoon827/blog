'use client'

import Image from 'next/image'
import styles from './ImageCarousel.module.css'

interface Props {
  /** Fixed cover image — no rotation */
  src: string
  alt: string
  aspectRatio?: string
  priority?: boolean
}

/** Static cover image (kept name for existing imports). */
export default function ImageCarousel({ src, alt, aspectRatio, priority }: Props) {
  return (
    <div className={styles.wrap} style={aspectRatio ? { aspectRatio } : undefined}>
      <div className={styles.slide}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
          className={styles.img}
          priority={priority}
        />
      </div>
    </div>
  )
}
