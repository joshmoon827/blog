import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { ReactNode } from 'react'
import {
  resolveArticleFormat,
  type ArticleFormat,
} from '@/data/articleFormats'
import { normalizeHardBreaks } from '@/lib/normalizeHardBreaks'
import { normalizeMathMarkdown } from '@/lib/normalizeMathMarkdown'
import TistoryHtmlBody from '@/components/TistoryHtmlBody'
import { sanitizeTistoryHtml } from '@/lib/sanitizeTistoryHtml'
import 'katex/dist/katex.min.css'

/** Map private-repo raw URLs to the blog image proxy. */
export function toDisplayImageUrl(url: string): string {
  if (url.startsWith('/api/images/')) return url

  const raw = url.match(
    /^https?:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/(.+)$/,
  )
  if (raw?.[1]) {
    return `/api/images/${raw[1].split('/').map(encodeURIComponent).join('/')}`
  }
  return url
}

function buildComponents(imageClassName?: string): Components {
  return {
    img: ({ src, alt }) => {
      const href = typeof src === 'string' ? src : ''
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={imageClassName}
          src={toDisplayImageUrl(href)}
          alt={alt || 'image'}
          loading="lazy"
        />
      )
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  }
}

export type RenderArticleBodyOptions = {
  imageClassName?: string
  /** Authoring mode — `tistory` renders sanitized TinyMCE HTML. */
  format?: ArticleFormat | string | null
}

/**
 * Render article body to React nodes.
 *
 * Format:
 * - `tistory` — sanitized HTML from TinyMCE (`<p>`, `<b>`, …)
 * - `default` / `obsidian` — markdown (GFM + KaTeX)
 */
export function renderArticleBody(
  body: string,
  imageClassNameOrOpts?: string | RenderArticleBodyOptions,
): ReactNode {
  const opts: RenderArticleBodyOptions =
    typeof imageClassNameOrOpts === 'string' || imageClassNameOrOpts == null
      ? { imageClassName: imageClassNameOrOpts }
      : imageClassNameOrOpts

  const format = resolveArticleFormat(opts.format)

  if (format === 'tistory') {
    const html = sanitizeTistoryHtml(body)
    if (!html) return null
    return <TistoryHtmlBody html={html} />
  }

  const markdown = normalizeHardBreaks(normalizeMathMarkdown(body))

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={buildComponents(opts.imageClassName)}
    >
      {markdown}
    </ReactMarkdown>
  )
}
