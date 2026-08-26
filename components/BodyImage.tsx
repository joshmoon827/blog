'use client'

import {
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  BODY_IMAGE_ALIGN_OPTIONS,
  alignTextAlign,
  parseCropFromDataset,
  sanitizeBodyImageAlign,
  sanitizeBodyImageCrop,
  type BodyImageAlign,
  type BodyImageCrop,
} from '@/lib/bodyImageCrop'
import { toDisplayImageUrl } from '@/lib/renderArticleBody'
import styles from './BodyImage.module.css'

export type BodyImageEditRequest = {
  /** 0-based index among body images in document order */
  index: number
  src: string
  alt: string
  crop: BodyImageCrop | null
  align: BodyImageAlign
}

export type BodyImageAlignRequest = {
  index: number
  align: BodyImageAlign
}

type Props = {
  src?: string | null
  alt?: string | null
  className?: string
  width?: string | number
  height?: string | number
  style?: CSSProperties
  index: number
  editable?: boolean
  onEdit?: (req: BodyImageEditRequest) => void
  onAlign?: (req: BodyImageAlignRequest) => void
  /** data-crop-* / data-align from rehype / HTML */
  'data-crop-scale'?: string
  'data-crop-pos'?: string
  'data-crop-rotate'?: string
  'data-crop-aspect'?: string
  'data-pad-color'?: string
  'data-align'?: string
  'data-ke-align'?: string
  'data-ke-style'?: string
}

type MenuState = { x: number; y: number }

export default function BodyImage({
  src,
  alt,
  className,
  width,
  height,
  style,
  index,
  editable,
  onEdit,
  onAlign,
  ...rest
}: Props) {
  const href = typeof src === 'string' ? src : ''
  const displaySrc = toDisplayImageUrl(href)
  const crop = parseCropFromDataset({
    cropScale: rest['data-crop-scale'],
    cropPos: rest['data-crop-pos'],
    cropRotate: rest['data-crop-rotate'],
    cropAspect: rest['data-crop-aspect'],
    padColor: rest['data-pad-color'],
  })
  const align = sanitizeBodyImageAlign(
    rest['data-align'] || rest['data-ke-align'] || rest['data-ke-style'],
  )

  const resolved = crop ? sanitizeBodyImageCrop(crop) : null
  const aspect = resolved?.aspectRatio
  const [menu, setMenu] = useState<MenuState | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const frameStyle: CSSProperties = {
    aspectRatio: aspect ? aspect.replace(/\s+/g, '') : undefined,
    background: resolved?.padColor || undefined,
    textAlign: alignTextAlign(align),
  }

  // When crop meta exists, ignore baked inline crop styles — display uses data-*.
  const imgStyle: CSSProperties = {
    ...(resolved
      ? {
          objectFit: 'cover' as const,
          objectPosition: resolved.position,
          transform: `scale(${resolved.scale}) rotate(${resolved.rotation}deg)`,
          transformOrigin: resolved.position,
          width: '100%',
          height: '100%',
          maxWidth: 'none',
          margin: 0,
          borderRadius: 0,
          background: resolved.padColor || undefined,
        }
      : typeof style === 'object' && style
        ? style
        : undefined),
  }

  const openCrop = () => {
    if (!editable || !onEdit || !href) return
    onEdit({
      index,
      src: href,
      alt: alt || '',
      crop: resolved,
      align,
    })
  }

  const onContextMenu = (e: ReactMouseEvent) => {
    if (!editable || !onAlign) return
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY })
  }

  const alignClass =
    align === 'alignLeft'
      ? styles.alignLeft
      : align === 'alignRight'
        ? styles.alignRight
        : styles.alignCenter

  return (
    <span
      className={`${styles.wrap} ${alignClass}${editable ? ` ${styles.editable}` : ''}${resolved ? ` ${styles.cropped}` : ''}`}
      style={frameStyle}
      onDoubleClick={(e) => {
        if (!editable) return
        e.preventDefault()
        e.stopPropagation()
        openCrop()
      }}
      onContextMenu={onContextMenu}
      title={
        editable
          ? '더블클릭: 크롭 · 우클릭: 정렬'
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={[styles.img, className].filter(Boolean).join(' ') || undefined}
        src={displaySrc}
        alt={alt || 'image'}
        width={width}
        height={height}
        style={imgStyle}
        loading="lazy"
        data-crop-scale={rest['data-crop-scale']}
        data-crop-pos={rest['data-crop-pos']}
        data-crop-rotate={rest['data-crop-rotate']}
        data-crop-aspect={rest['data-crop-aspect']}
        data-pad-color={rest['data-pad-color']}
        data-align={align}
      />
      {editable ? <span className={styles.badge}>EDIT</span> : null}

      {menu ? (
        <span
          className={styles.menu}
          style={{ left: menu.x, top: menu.y }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className={styles.menuTitle}>이미지 정렬</span>
          {BODY_IMAGE_ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="menuitemradio"
              aria-checked={align === opt.id}
              className={`${styles.menuItem}${align === opt.id ? ` ${styles.menuItemActive}` : ''}`}
              onClick={() => {
                setMenu(null)
                onAlign?.({ index, align: opt.id })
              }}
            >
              <span className={styles.menuIcon} data-align={opt.id} aria-hidden />
              {opt.label}
            </button>
          ))}
          {onEdit ? (
            <>
              <span className={styles.menuSep} />
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setMenu(null)
                  openCrop()
                }}
              >
                크롭 · 수정…
              </button>
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}
