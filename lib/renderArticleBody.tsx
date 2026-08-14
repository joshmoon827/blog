import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import {
  resolveArticleFormat,
  type ArticleFormat,
} from '@/data/articleFormats'
import { normalizeHardBreaks } from '@/lib/normalizeHardBreaks'
import { normalizeMathMarkdown } from '@/lib/normalizeMathMarkdown'
import {
  columnStyle,
  splitObsidianColumns,
} from '@/lib/obsidianColumns'
import { parseEmbedFence } from '@/lib/obsidianEmbed'
import TistoryHtmlBody from '@/components/TistoryHtmlBody'
import MarkdownEmbedCard from '@/components/MarkdownEmbedCard'
import BodyImage, {
  type BodyImageAlignRequest,
  type BodyImageEditRequest,
} from '@/components/BodyImage'
import columnStyles from '@/components/MarkdownColumns.module.css'
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

type ImageCtx = {
  imageClassName?: string
  editableImages?: boolean
  onEditImage?: (req: BodyImageEditRequest) => void
  onAlignImage?: (req: BodyImageAlignRequest) => void
  imageIndex: { current: number }
}

function buildComponents(ctx: ImageCtx): Components {
  return {
    img: ({ src, alt, width, height, style, className, ...rest }) => {
      const index = ctx.imageIndex.current
      ctx.imageIndex.current += 1
      const data = rest as Record<string, string | undefined>
      const editable = Boolean(
        ctx.editableImages && (ctx.onEditImage || ctx.onAlignImage),
      )
      return (
        <BodyImage
          src={typeof src === 'string' ? src : ''}
          alt={alt || 'image'}
          width={width}
          height={height}
          style={typeof style === 'object' && style ? (style as CSSProperties) : undefined}
          className={[ctx.imageClassName, className].filter(Boolean).join(' ') || undefined}
          index={index}
          editable={editable}
          onEdit={ctx.onEditImage}
          onAlign={ctx.onAlignImage}
          data-crop-scale={data['data-crop-scale']}
          data-crop-pos={data['data-crop-pos']}
          data-crop-rotate={data['data-crop-rotate']}
          data-crop-aspect={data['data-crop-aspect']}
          data-pad-color={data['data-pad-color']}
          data-align={data['data-align']}
          data-ke-align={data['data-ke-align']}
          data-ke-style={data['data-ke-style']}
        />
      )
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    pre: ({ children, ...props }) => {
      const child = Array.isArray(children) ? children[0] : children
      if (
        child &&
        typeof child === 'object' &&
        'props' in child &&
        child.props &&
        typeof child.props === 'object'
      ) {
        const codeProps = child.props as {
          className?: string
          children?: ReactNode
        }
        const className = codeProps.className || ''
        if (/(?:^|\s)language-embed(?:\s|$)/.test(className)) {
          const raw = String(codeProps.children ?? '').replace(/\n$/, '')
          const data = parseEmbedFence(raw)
          if (data) return <MarkdownEmbedCard data={data} />
        }
      }
      return <pre {...props}>{children}</pre>
    },
  }
}

function renderMarkdownChunk(source: string, ctx: ImageCtx): ReactNode {
  const markdown = normalizeHardBreaks(normalizeMathMarkdown(source))
  if (!markdown.trim()) return null
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={buildComponents(ctx)}
    >
      {markdown}
    </ReactMarkdown>
  )
}

export type RenderArticleBodyOptions = {
  imageClassName?: string
  /** Authoring mode — `tistory` renders sanitized TinyMCE HTML. */
  format?: ArticleFormat | string | null
  /** Admin: double-click body images to crop; right-click to align. */
  editableImages?: boolean
  onEditImage?: (req: BodyImageEditRequest) => void
  onAlignImage?: (req: BodyImageAlignRequest) => void
}

/**
 * Render article body to React nodes.
 *
 * Format:
 * - `tistory` — sanitized HTML from TinyMCE (`<p>`, `<b>`, …)
 * - `default` / `obsidian` — markdown (GFM + KaTeX)
 *   + ```embed link cards
 *   + %% col-start / col-break / col-end %% layouts
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
  const ctx: ImageCtx = {
    imageClassName: opts.imageClassName,
    editableImages: opts.editableImages,
    onEditImage: opts.onEditImage,
    onAlignImage: opts.onAlignImage,
    imageIndex: { current: 0 },
  }

  if (format === 'tistory') {
    const html = sanitizeTistoryHtml(body)
    if (!html) return null
    return <TistoryHtmlBody html={html} />
  }

  const segments = splitObsidianColumns(body)

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'markdown') {
          return (
            <Fragment key={`md-${i}`}>
              {renderMarkdownChunk(seg.text, ctx)}
            </Fragment>
          )
        }
        return (
          <div
            key={`cols-${i}`}
            className={`md-columns ${columnStyles.columns}`}
          >
            {seg.columns.map((col, j) => (
              <div
                key={`col-${i}-${j}`}
                className={columnStyles.column}
                style={columnStyle(col.spec)}
              >
                {renderMarkdownChunk(col.text, ctx)}
              </div>
            ))}
          </div>
        )
      })}
    </>
  )
}
