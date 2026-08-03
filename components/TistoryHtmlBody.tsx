'use client'

type Props = {
  html: string
  className?: string
}

/**
 * Read/preview shell for sanitized Tistory HTML.
 * 접은글 toggles are handled by `TistoryMoreLessHydrate` (document click).
 */
export default function TistoryHtmlBody({ html, className }: Props) {
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
